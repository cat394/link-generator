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
 * import { flatten_route_config, type RouteConfig } from '@kokomi/link-generator';
 *
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
 * const flat_route_config = flatten_route_config(route_config);
 * // {
 * //   home: '/',
 * //   users: '/users',
 * //   'users/user': '/users/:id'
 * // }
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
  for (const parent_route_id in route_config) {
    const route = route_config[parent_route_id];

    const current_path = route.path;

    const full_path = `${parent_path}${current_path}`;

    result[parent_route_id] = full_path;

    if (route.children) {
      const parent_path_removed_query_area = remove_query_area(full_path);

      const children = flatten_route_config(
        route.children,
        parent_path_removed_query_area,
      );

      for (const child_route_id in children) {
        const child_route_id_with_parent =
          `${parent_route_id}${Symbols.PathSeparater}${child_route_id}`;

        result[child_route_id_with_parent] = children[child_route_id];
      }
    }
  }

  return result as FlatRoutes<Config>;
}
