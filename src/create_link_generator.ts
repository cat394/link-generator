import type {
  DefaultParamValue,
  FlatRouteConfig,
  LinkGenerator,
  Param,
  ParamArgs,
} from "./types.ts";
import { Symbols } from "./symbols.ts";
import { remove_query_area } from "./utils.ts";

/**
 * 	This function create link generator.
 *
 * 	```ts
 * 	import {
 *    flatten_route_config,
 *    create_link_generator,
 *    type RouteConfig
 *  } from '@kokomi/link-generator';
 *
 * 	const route_config = {
 * 		home: {
 * 			path: '/'
 * 		},
 * 		users: {
 * 			path: '/users',
 * 				children: {
 * 					user: {
 *            path: '/:id'
 *          }
 * 				}
 * 		},
 * 	} as const satisfies RouteConfig;
 *
 * 	const flat_config = flatten_route_config(route_config);
 *
 * 	const link = create_link_generator(flat_config);
 *
 * 	link('home');	// => '/'
 *
 * 	link('users'); // => '/users'
 *
 * 	link('users/user', { id: 'alice' }); // => /users/alice
 * 	```
 *
 * @param route_config - The route object processed by the flatten_route_config function.
 * @returns A function to generate links.
 */
export function create_link_generator<Config extends FlatRouteConfig>(
  route_config: Config,
): LinkGenerator<Config> {
  return <RouteId extends keyof Config>(
    route_id: RouteId,
    ...params: ParamArgs<Config, RouteId>
  ): string => {
    const path_template = route_config[route_id];

    const path_params = params[0];

    const query_params = params[1];

    let path: string = path_template;

    path = remove_query_area(path);

    if (!path_params && !query_params) {
      return path;
    }

    if (detect_constraint_area(path)) {
      path = remove_constraint_area(path);
    }

    if (path_params) {
      path = replace_params_area(path, path_params);
    }

    if (query_params) {
      const qs = create_query_string(query_params as Param);

      if (qs !== "") {
        path += `?${qs}`;
      }
    }

    return path;
  };
}

function detect_constraint_area(path: string): boolean {
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

function create_query_string(search: Partial<Param>): string {
  return Object.entries(search)
    .filter(([_, value]) => value !== "" && value !== undefined)
    .map(
      ([key, value]) =>
        `${key}=${encodeURIComponent(value as DefaultParamValue)}`,
    )
    .join("&");
}
