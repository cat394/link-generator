import type {
  DefaultParamValue,
  FlatRouteConfig,
  FlatRoutes,
  LinkGenerator,
  LinkGeneratorOptions,
  ParamArgs,
  QueryArg,
  QueryArgValue,
  RouteConfig,
  RouteContextInit,
} from "./types.ts";
import { Symbols } from "./symbols.ts";

/*
 * Represents a context for path parameters during link generation.
 */
export class ParamsContext extends Map<string, DefaultParamValue> {}

/**
 * Represents a context for query parameters during link generation.
 *
 * This class extends the built-in `Map` to provide additional functionality for
 * managing query parameters. It allows adding multiple values for the same key,
 * which is useful for handling cases where a query parameter can have multiple
 * values (e.g., `?key=value1&key=value2`).
 */
export class QueryContext extends Map<string, QueryArgValue[]> {
  /*
   * Adds a value or values to the specified query parameter key.
   * If the key already exists, the new values are appended to the existing array of values.
   * If the key does not exist, a new entry is created with the provided values.
   *
   * @param key - The query parameter key to which the value(s) should be added.
   * @param values - One or more values to add to the specified key.
   *
   * @example
   * const queryContext = new QueryContext();
   * queryContext.add("key", "value1", "value2");
   * console.log(queryContext.get("key")); // Output: ["value1", "value2"]
   */
  add(key: string, ...values: QueryArgValue[]) {
    const current = this.get(key);
    if (current) {
      this.set(key, [...current, ...values]);
    } else {
      this.set(key, values);
    }
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
export class RouteContext<Config extends RouteConfig> {
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
 * @param options.add_query - Whether to append query parameters to the generated URL.
 *                             Defaults to `true`.
 * @param options.transform - A hook function that receives a RouteContext and returns
 *                             the final path string. Useful for custom transformations
 *                             such as localization or path rewriting.
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
 *
 * @example
 * const route_config = {
 *   user: {
 *     path: "/users/:user"
 *   }
 * } as const satisfies RouteConfig;
 *
 * const transform1 = (ctx: RouteContext<typeof route_config>) => {
 *   if (ctx.id === "user") {
 *     ctx.params.set("user", "alice");
 *     ctx.query.set("lang", ["en"]);
 *   }
 * }
 *
 * const link = link_generator(route_config, { transforms: [transform1] });
 *
 * link("user", { user: "bob" }); // => /users/alice?lang=en
 */
export function link_generator<Config extends RouteConfig>(
  route_config: Config,
  options?: LinkGeneratorOptions<Config>,
): LinkGenerator<FlatRoutes<Config>> {
  const routes = create_routes_map(flatten_route_config(route_config));
  const should_append_query = options?.should_append_query ?? true;
  const transforms = options?.transforms ?? [];

  return <RouteId extends keyof FlatRoutes<Config>>(
    route_id: RouteId,
    ...params: ParamArgs<FlatRoutes<Config>, RouteId>
  ): string => {
    let path = routes.get(route_id) as string;
    const [path_params, ...query_params] = params;
    const ctx = new RouteContext<Config>(route_id, {
      path,
      params: new ParamsContext(Object.entries(path_params ?? {})),
      query: create_query_context((query_params ?? []) as QueryArg[]),
    });

    for (const transform of transforms) {
      transform(ctx);
    }

    path = replace_params_area(ctx.path, ctx.params);

    if (should_append_query && ctx.query.size > 0) {
      const qs = generate_query_string(ctx.query);

      if (qs !== "") {
        path += `?${qs}`;
      }
    }

    return path;
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

function create_query_context(query_params: QueryArg[]): QueryContext {
  const result = new QueryContext();

  for (const q of query_params) {
    for (const [key, value] of Object.entries(q)) {
      if (!result.has(key)) {
        result.set(key, [value]);
      } else {
        const current_result_value = result.get(key)!;
        result.set(key, [...current_result_value, value]);
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

function replace_params_area(path: string, params: ParamsContext): string {
  const param_area_regex = new RegExp(
    `(?<=${Symbols.PathSeparater})${Symbols.PathParam}([^\\${Symbols.PathSeparater}?]+)`,
    "g",
  );

  return path.replace(param_area_regex, (_, param_name) => {
    const param_value = params.get(param_name) ?? "";

    return encodeURIComponent(param_value);
  });
}

function create_query_string(key: string, values: QueryArgValue[]): string {
  const qs: string[] = [];

  for (
    const value of values.filter(
      (v) => v !== undefined && v !== "",
    ) as DefaultParamValue[]
  ) {
    qs.push(`${key}=${encodeURIComponent(value)}`);
  }

  return qs.join(Symbols.QuerySeparator);
}

function generate_query_string(query_context: QueryContext): string {
  const qs: string[] = [];

  for (const [key, values] of query_context) {
    const q = create_query_string(key, values);
    if (q !== "") {
      qs.push(q);
    }
  }

  return qs.join(Symbols.QuerySeparator);
}
