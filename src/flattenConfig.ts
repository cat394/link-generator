import { Symbols } from "./symbols.ts";
import type {
  FlatRouteConfig,
  FlattenRouteConfig,
  RouteConfig,
} from "./types.ts";

/**
 * Flattens the route configuration object.
 *
 * This function takes a nested route configuration object and flattens it
 * into a single-level object where the keys are the concatenated paths.
 *
 * ```ts
 * import { flattenConfig } from '@htmllover/link-generator';
 *
 * const routeConfig = {
 *   'home': {
 *     path: '/'
 *   },
 *   'users': {
 *     path: 'users/:userid',
 *     children: {
 *       posts: {
 *         path: 'posts/:postid'
 *       }
 *     }
 *   }
 * } as const satisfies RouteConfig;
 *
 * const flatRouteConfig = flattenConfig(routeConfig);
 * // => { home: '/', 'users': 'users/:userid', 'users/posts': 'users/:userid/posts/:postid' }
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
): FlattenRouteConfig<Config> {
  for (const parentRouteId in routeConfig) {
    const route = routeConfig[parentRouteId];
    const currentPath = route.path;

    let fullPath = parentPath +
      (currentPath.startsWith(Symbols.PathSeparater)
        ? ""
        : Symbols.PathSeparater) +
      currentPath;

    fullPath = removeExtraSeparatorsFromProtocolField(parentRouteId, fullPath);

    result[parentRouteId] = fullPath;

    if (route.children) {
      const children = flattenRouteConfig(route.children, fullPath);

      for (const childRouteId in children) {
        const childFullRouteId =
          `${parentRouteId}${Symbols.PathSeparater}${childRouteId}`;

        result[childFullRouteId] = removeExtraSeparatorFromAfterProtocol(
          children[childRouteId],
        );
      }
    }
  }
  return result as FlattenRouteConfig<Config>;
}

function isAbsoluteRoute(routeId: string): boolean {
  return routeId.startsWith(Symbols.AbsoluteRoute);
}

function removeExtraSeparatorsFromProtocolField(
  routeId: string,
  path: string,
): string {
  if (isAbsoluteRoute(routeId)) {
    return removeExtraSeparatorFromBeforeProtocol(path);
  } else {
    return removeExtraSeparatorFromAfterProtocol(path);
  }
}

function removeExtraSeparatorFromBeforeProtocol(path: string): string {
  return path.slice(Symbols.PathSeparater.length);
}

function removeExtraSeparatorFromAfterProtocol(path: string): string {
  const protocolArea = new RegExp(
    `(?<protocol>[a-zA-Z]+:)\\${Symbols.PathSeparater}(?=\\/\\/)`,
  );

  return path.replace(protocolArea, (_, protocol) => protocol);
}
