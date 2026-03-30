import type {
  DefaultParamValue,
  FlatRouteConfig,
  FlatRoutes,
  FormatFn,
  LinkGenerator,
  LinkGeneratorOptions,
  Param,
  ParamArgs,
  QueryArg,
  RouteConfig,
  RouteContextInit,
} from "./types.ts";
import { Symbols } from "./symbols.ts";

/*
 * Represents a context for path parameters during link generation.
 * This class extends the built-in Map to provide a convenient way
 * to manage path parameters. It accepts an object of parameters and initializes the map accordingly.
 *
 * @example
 * const params = new ParamsContext({ id: 'alice', category: 'books' });
 * console.log(params.get('id')); // 'alice'
 * console.log(params.get('category')); // 'books'
 */
export class ParamsContext extends Map<string, DefaultParamValue> {
  constructor(params: Param = {}) {
    super(Object.entries(params));
  }
}

/**
 * Represents a context for query parameters during link generation.
 * This class extends the built-in URLSearchParams to provide a convenient way
 * to manage query parameters. It accepts multiple query objects and merges them,
 * allowing for flexible query parameter handling.
 *
 * @example
 * const query = new QueryContext({ lang: 'en' }, { page: 2 });
 * console.log(query.get('lang')); // 'en'
 * console.log(query.get('page')); // '2'
 * console.log(query.toString()); // 'lang=en&page=2'
 */
export class QueryContext extends URLSearchParams {
  constructor(...query_params: QueryArg[]) {
    const initial_params: [string, string][] = [];

    for (const q of query_params) {
      for (const [key, value] of Object.entries(q)) {
        if (value !== undefined) {
          initial_params.push([key, String(value)]);
        }
      }
    }

    super(initial_params);
  }
}

/**
 * Represents the context of a route during link generation.
 *
 * This class is primarily used in the `transform` function to provide
 * additional context such as route ID, resolved path, path parameters, and
 * query parameters in a structured form.
 *
 * @template Config - The type of the route configuration.
 *
 * @property id - The flattened route ID (e.g., "users/user").
 * @property path - The raw path template before query or parameter substitution.
 * @property params - The dynamic path parameters supplied to the link.
 * @property query - A normalized query object that combines all query fragments.
 */
export class RouteContext<Config extends RouteConfig = RouteConfig> {
  readonly id: keyof FlatRoutes<Config>;
  path: string;
  params: ParamsContext;
  query: QueryContext;

  constructor(id: keyof FlatRoutes<Config>, init?: RouteContextInit) {
    this.id = id;
    this.path = init?.path ?? "";
    this.params = init?.params ?? new ParamsContext();
    this.query = init?.query ?? new QueryContext();
  }
}

/**
 * 	This function create link generator.
 *
 * @param route_config - The route object processed by the flatten_route_config function.
 * @param options - Optional configuration to customize link generation.
 * The options can include:
 * - `transforms`: An array of functions that can modify the route context before parameter replacement and query string formatting.
 * - `replace_params_fn`: A custom function to replace path parameters in the route path based on the route context.
 * - `format_qs_fn`: A custom function to format the query string based on the route context.
 *
 * @returns A function to generate links.
 *
 * @example
 * import {
 *   link_generator,
 *   type RouteConfig
 * } from '@kokomi/link-generator';
 *
 * const route_config = {
 * 	home: {
 * 			path: '/'
 * 		},
 * 		users: {
 * 			path: '/users',
 * 			children: {
 * 				user: {
 *        	path: '/:id'
 *       	}
 * 			}
 * 		},
 * 		posts: {
 * 			path: '/posts?page'
 * 		}
 * 	} as const satisfies RouteConfig;
 *
 * 	const link = link_generator(route_config);
 *
 * 	link('home');	// => '/'
 *
 * 	link('users'); // => '/users'
 *
 * 	link('users/user', { id: 'alice' }); // => /users/alice
 *
 * 	link('posts', undefined, { page: 2 }); // => /posts?page=2
 */
export function link_generator<Config extends RouteConfig>(
  route_config: Config,
  options?: LinkGeneratorOptions<Config>,
): LinkGenerator<FlatRoutes<Config>> {
  const routes = create_routes_map(flatten_route_config(route_config));
  const transforms = options?.transforms ?? [];
  const format_qs_fn: FormatFn<Config> = options?.format_qs_fn ?? format_qs;
  const replace_params_fn: FormatFn<Config> = options?.replace_params_fn ??
    replace_params;

  return <RouteId extends keyof FlatRoutes<Config>>(
    route_id: RouteId,
    ...params: ParamArgs<FlatRoutes<Config>, RouteId>
  ): string => {
    const path = routes.get(route_id) as string;
    const [path_params, ...query_params] = params;
    const ctx = new RouteContext<Config>(route_id, {
      path,
      params: new ParamsContext(path_params ?? {}),
      query: new QueryContext(...(query_params as QueryArg[])),
    });

    for (const transform of transforms) {
      transform(ctx);
    }

    let replaced = replace_params_fn(ctx);
    const qs = format_qs_fn(ctx);

    if (qs !== "") {
      replaced += "?";
    }

    return replaced + qs;
  };
}

/**
 * Flattens the route configuration object.
 *
 * This function takes a nested route configuration object and flattens it
 * into a single-level object where the keys are the concatenated paths.
 *
 * @param route_config - The route configuration to flatten.
 * @param parent_path - The parent path, used internally during recursion.
 * @param result - The result object, used internally during recursion.
 *
 * @returns The flattened route configuration.
 *
 * @example
 * const route_config = {
 *   home: {
 *     path: '/'
 *   },
 *   users: {
 *     path: '/users',
 *     children: {
 *       user: {
 *         path: '/id'
 *       }
 *     }
 *   }
 * } as const satisfies RouteConfig;
 *
 * const flat_routes = flatten_route_config(route_config);
 * // {
 * //   home: '/',
 * //   users: '/users',
 * //   'users/user': '/users/:id'
 * // }
 */
export function flatten_route_config(
  route_config: RouteConfig,
  parent_path = "",
  result: FlatRouteConfig = {},
): FlatRouteConfig {
  for (const parent_route_name in route_config) {
    const route = route_config[parent_route_name];
    const current_path = remove_query_area(route.path);
    const path_with_parent = `${parent_path}${current_path}`;

    result[parent_route_name] = path_with_parent;

    if (route.children) {
      const children = flatten_route_config(route.children, path_with_parent);

      for (const child_route_name in children) {
        const child_route_id =
          `${parent_route_name}${Symbols.PathSeparater}${child_route_name}`;

        result[child_route_id] = children[child_route_name];
      }
    }
  }

  return result;
}

function remove_query_area(path: string): string {
  const starting_query_index = path.indexOf(Symbols.Query);
  const is_include_query = starting_query_index > 0;

  return is_include_query ? path.slice(0, starting_query_index) : path;
}

function create_routes_map(flat_route: FlatRouteConfig) {
  const routes_map = new Map();

  for (const [route_id, path_template] of Object.entries(flat_route)) {
    let path_to_format = path_template;

    if (has_constraint_area(path_template)) {
      path_to_format = remove_constraint_area(path_template);
    }

    routes_map.set(route_id, path_to_format);
  }

  return routes_map;
}

function has_constraint_area(path: string): boolean {
  const constraint_open_index = path.indexOf(Symbols.ConstraintOpen);

  return constraint_open_index > 0;
}

function remove_constraint_area(path: string): string {
  const constraint_area = new RegExp(
    `${Symbols.ConstraintOpen}.*?${Symbols.ConstraintClose}`,
    "g",
  );

  return path.replace(constraint_area, "");
}

// Default parameter replacer that uses a regular expression to find parameter placeholders in the path and replace them with the corresponding values from the context.
export function replace_params(ctx: RouteContext): string {
  const param_area_regex = new RegExp(
    `(?<=${Symbols.PathSeparater})${Symbols.PathParam}([^\\${Symbols.PathSeparater}?]+)`,
    "g",
  );

  return ctx.path.replace(param_area_regex, (_, param_name) => {
    const param_value = ctx.params.get(param_name) ?? "";

    return encodeURIComponent(param_value);
  });
}

// Default query string formatter that simply converts the query parameters to a string using URLSearchParams.
export function format_qs(ctx: RouteContext): string {
  return ctx.query.toString();
}
