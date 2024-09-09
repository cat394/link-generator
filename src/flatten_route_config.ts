import { remove_query_area } from "./utils.ts";
import { Symbols } from "./symbols.ts";
import type { FlatRouteConfig, FlatRoutes, RouteConfig } from "./types.ts";

/**
 * Flattens the route configuration object.
 *
 * This function takes a nested route configuration object and flattens it
 * into a single-level object where the keys are the concatenated paths.
 *
 * ```ts
 * import { flatten_route_config } from '@kokomi/link-generator';
 *
 * const routeConfig = {
 *   home: {
 *     path: '/'
 *   },
 *   users: {
 *     path: '/users',
 *     children: {
 *       user: {
 *         path: '/userid'
 *       }
 *     }
 *   }
 * } as const satisfies RouteConfig;
 *
 * const flat_route_config = flatten_route_config(routeConfig);
 * // => { home: '/', 'users': '/users', 'users/user': '/users/:user' }
 * ```
 *
 * @param route_config - The route configuration to flatten.
 * @param parent_path - The parent path, used internally during recursion.
 * @param result - The result object, used internally during recursion.
 * @returns The flattened route configuration.
 */
export function flatten_route_config<Config extends RouteConfig>(
  route_config: Config,
  parent_path = "",
  result: FlatRouteConfig = {},
): FlatRoutes<Config> {
  for (const parent_routeid in route_config) {
    const route = route_config[parent_routeid];

    const current_path = route.path;

    const full_path = `${parent_path}${current_path}`;

    result[parent_routeid] = full_path;

    if (route.children) {
      const parent_path_removed_query_area = remove_query_area(full_path);

      const children = flatten_route_config(
        route.children,
        parent_path_removed_query_area,
      );

      for (const child_routeid in children) {
        const child_routeid_with_parent_routeid =
          `${parent_routeid}${Symbols.PathSeparater}${child_routeid}`;

        result[child_routeid_with_parent_routeid] = children[child_routeid];
      }
    }
  }
  return result as FlatRoutes<Config>;
}
