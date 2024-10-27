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
import { flatten_route_config } from "./flatten_route_config.ts";

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
export function link_generator<T extends RouteConfig>(
  route_config: T,
): LinkGenerator<FlatRoutes<T>> {
  type Config = FlatRoutes<T>;

  const routes = create_routes_map(flatten_route_config(route_config));

  return <RouteId extends keyof Config>(
    route_id: RouteId,
    ...params: ParamArgs<Config, RouteId>
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
      const qs = process_queries(query_params as Param[]);

      path += `?${qs}`;
    }

    return path;
  };
}

function create_routes_map(flat_route: FlatRouteConfig) {
  const routes_map = new Map();

  for (const [route_id, path_template] of Object.entries(flat_route)) {
    let formatted_path = remove_query_area(path_template);

    if (has_constraint_area(path_template)) {
      formatted_path = remove_constraint_area(path_template);
    }

    routes_map.set(route_id, formatted_path);
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

function process_queries(query_params: Param[]): string {
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
