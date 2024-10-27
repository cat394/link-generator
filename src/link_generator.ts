import type {
  DefaultParamValue,
  FlatRouteConfig,
  FlatRoutes,
  LinkGenerator,
  Param,
  ParamArgs,
  RouteConfig,
} from "./types.ts";
import { Symbols } from "./symbols.ts";
import { remove_query_area } from "./utils.ts";

/**
 * 	This function create link generator.
 *
 * 	```ts
 * 	import {
 *    link_generator,
 *    type RouteConfig
 *  } from '@kokomi/link-generator';
 *
 * 	const route_config = {
 * 		home: {
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
 * 	```
 *
 * @param route_config - The route object processed by the flatten_route_config function.
 * @returns A function to generate links.
 */
export function link_generator<Config extends RouteConfig>(
  route_config: Config,
): LinkGenerator<FlatRoutes<Config>> {
  type FlatConfig = FlatRoutes<Config>;

  const routes = create_routes_map(flatten_route_config(route_config));

  return <RouteId extends keyof FlatConfig>(
    route_id: RouteId,
    ...params: ParamArgs<FlatConfig, RouteId>
  ): string => {
    const path_template = routes.get(route_id);

    const [path_params, ...query_params] = params;

    const is_exist_qurey = query_params.length > 0;

    let path: string = path_template;

    if (!path_params && !is_exist_qurey) {
      return path;
    }

    if (path_params) {
      path = replace_params_area(path, path_params);
    }

    if (is_exist_qurey) {
      const qs = generate_query_string(query_params as Param[]);

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

function replace_params_area(path: string, params: Param): string {
  const param_area_regex = new RegExp(
    `(?<=${Symbols.PathSeparater})${Symbols.PathParam}([^\\${Symbols.PathSeparater}?]+)`,
    "g",
  );

  return path.replace(param_area_regex, (_, param_name) => {
    const param_value = params[param_name];

    return encodeURIComponent(param_value);
  });
}

function create_query_string_from_object(query: Partial<Param>): string {
  return Object.entries(query)
    .filter(([_, value]) => value !== "" && value !== undefined)
    .map(
      ([key, value]) =>
        `${key}=${encodeURIComponent(value as DefaultParamValue)}`,
    )
    .join(Symbols.QuerySeparator);
}

function generate_query_string(query_params: Param[]): string {
  let qs = "";

  for (const query_param of query_params) {
    const partial_qs = create_query_string_from_object(query_param);

    qs += partial_qs;

    if (partial_qs !== "") {
      qs += "&";
    }
  }

  if (qs.endsWith(Symbols.QuerySeparator)) {
    qs = qs.slice(0, -Symbols.QuerySeparator.length);
  }

  return qs;
}
