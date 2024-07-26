import type {
  DefaultParameterType,
  FlatRouteConfig,
  LinkGenerator,
  ParamArgs,
  Parameter,
} from "./types.ts";
import { Symbols } from "./symbols.ts";

/**
 * 	This function create link generator.
 *
 * 	```ts
 * 	import { flattenConfig } from '@kokomi/link-generator';
 *
 * 	const routeConfig = {
 * 		'home': {
 * 			path: '/'
 * 		},
 * 		'users': {
 * 			path: '/users/:userid',
 * 				children: {
 * 					posts: {
 * 						path: '/posts/:postid?q=page<number>'
 * 					}
 * 				}
 * 		},
 * 	} as const satisfies RouteConfig;
 *
 * 	const flatConfig = flattenConfig(routeConfig);
 *
 * 	const link = createLinkGenerator(flatConfig);
 *
 * 	const rootpage = link('home');	// => '/'
 *
 * 	const userpage = link('users', { userid: 'alice' }); // => '/users/alice'
 *
 * 	const postpage = link('users/posts', { userid: 'alice', postid: '1' }, { page: 10 });
 * 	// => '/users/alice/posts/1?q=page=10'
 * 	```
 *
 * @param flatRoutes - The route object processed by the flattenRouteConfig function.
 * @returns A function to generate links.
 */
export function createLinkGenerator<Config extends FlatRouteConfig>(
  flatRoutes: Config,
): LinkGenerator<Config> {
  return <RouteId extends keyof Config>(
    routeId: RouteId,
    ...params: ParamArgs<Config, RouteId>
  ): string => {
    const pathTemplate = flatRoutes[routeId];

    const pathParamEntry = params[0];

    const searchParamEntry = params[1];

    if (isRootPath(pathTemplate)) return "/";

    let path: string = pathTemplate;

    path = removeQueryArea(path);

    path = removeConstrainedArea(path);

    path = replaceParams(path, pathParamEntry);

    if (searchParamEntry) {
      const searchParams = createSearchParams(
        searchParamEntry as unknown as Parameter,
      );

      // If all search parameters are undefined, no query parameters are added.
      searchParams ? (path += `?${searchParams}`) : "";
    }

    return path;
  };
}

function isRootPath(path: string): boolean {
  return path === "/";
}

export function removeQueryArea(path: string): string {
  const searchAreaStartIndex = path.indexOf(
    Symbols.PathSeparater + Symbols.Search,
  );

  const isExistSearchArea = searchAreaStartIndex > 0;

  return isExistSearchArea ? path.slice(0, searchAreaStartIndex) : path;
}

function removeConstrainedArea(path: string): string {
  const constraintArea = new RegExp(
    `${Symbols.ConstraintOpen}.*?${Symbols.ConstraintClose}`,
    "g",
  );
  return path.replace(constraintArea, "");
}

function replaceParams(
  path: string,
  params: Parameter | undefined | null,
): string {
  const paramArea = new RegExp(
    `\\${Symbols.PathSeparater}${Symbols.PathParam}(?<paramName>[^\\/?]+)\\?${Symbols.OptionalParam}`,
    "g",
  );

  return path.replace(paramArea, (_, paramName) => {
    if (!params) return "";

    const paramValue = params[paramName];

    if (!paramValue && paramValue !== false) {
      return "";
    }

    return Symbols.PathSeparater + encodeURIComponent(paramValue);
  });
}

function createSearchParams(search: Parameter): string {
  return Object.entries(search)
    .filter(
      ([_, value]) => value !== "" && value !== undefined && value !== null,
    )
    .map(
      ([key, value]) =>
        `${key}=${encodeURIComponent(value as DefaultParameterType)}`,
    )
    .join("&");
}
