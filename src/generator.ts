import type {
  DefaultParameterType,
  ExtractRouteData,
  FlatRouteConfig,
  LinkGenerator,
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
 * @param flatRouteConfig - The route object processed by the flattenRouteConfig function.
 * @returns A function to generate links.
 */
export function createLinkGenerator<Config extends FlatRouteConfig>(
  flatRouteConfig: Config,
): LinkGenerator<Config> {
  return <RouteId extends keyof Config>(
    routeId: RouteId,
    params?: ExtractRouteData<Config>[RouteId]["search"] extends never
      ? ExtractRouteData<Config>[RouteId]["params"]
      : ExtractRouteData<Config>[RouteId]["params"] | null,
    search?: ExtractRouteData<Config>[RouteId]["search"],
  ): string => {
    const pathTemplate = flatRouteConfig[routeId];

    if (isRootPath(pathTemplate)) return "/";

    let path: string = pathTemplate;

    path = removeQueryArea(path);

    path = removeConstrainedArea(path);

    path = replaceParams(path, params);

    if (search) {
      const searchParams = createSearchParams(search as unknown as Parameter);

      // If all search parameters are undefined, no query parameters are added.
      searchParams ? (path += `?${searchParams}`) : "";
    }

    return path;
  };
}

function isRootPath(path: string): boolean {
  return path === "/";
}

function removeQueryArea(path: string): string {
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
    `\\${Symbols.PathSeparater}${Symbols.Param}(?<paramName>[^\\/?]+)\\?${Symbols.OptionalParam}`,
    "g",
  );

  return path.replace(paramArea, (_, paramName) => {
    if (!params) return "";

    const paramValue = params[paramName];

    return paramValue
      ? Symbols.PathSeparater + encodeURIComponent(paramValue)
      : "";
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
