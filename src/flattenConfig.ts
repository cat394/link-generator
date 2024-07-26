import { removeQueryArea } from "./generator.ts";
import { Symbols } from "./symbols.ts";
import type { FlatRouteConfig, FlatRoutes, RouteConfig } from "./types.ts";

/**
 * Flattens the route configuration object.
 *
 * This function takes a nested route configuration object and flattens it
 * into a single-level object where the keys are the concatenated paths.
 *
 * ```ts
 * import { flattenConfig } from '@kokomi/link-generator';
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
 * const flatRouteConfig = flattenConfig(routeConfig);
 * // => { home: '/', 'users': '/users', 'users/user': '/users/:user' }
 * ```
 *
 * @param routeConfig - The route configuration to flatten.
 * @param parentPath - The parent path, used internally during recursion.
 * @param result - The result object, used internally during recursion.
 * @returns The flattened route configuration.
 */
export function flattenRouteConfig<Config extends RouteConfig>(
  routeConfig: Config,
  parentPath = "",
  result: FlatRouteConfig = {},
): FlatRoutes<Config> {
  for (const parentRouteId in routeConfig) {
    const route = routeConfig[parentRouteId];

    const currentPath = route.path;

    const fullPath = parentPath + currentPath;

    result[parentRouteId] = fullPath;

    if (route.children) {
      const parentPathToJoinChildren = removeQueryArea(fullPath);

      const children = flattenRouteConfig(
        route.children,
        parentPathToJoinChildren,
      );

      for (const childRouteId in children) {
        const childFullRouteId =
          `${parentRouteId}${Symbols.PathSeparater}${childRouteId}`;

        result[childFullRouteId] = children[childRouteId];
      }
    }
  }
  return result as FlatRoutes<Config>;
}
