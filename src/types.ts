import type { Symbols } from "./symbols.ts";

/**
 * Represents a single route in the application.
 * Each route has a path and optionally nested child routes.
 */
type Route = {
  path: string;
  children?: RouteConfig;
};

/**
 * Represents the configuration for all routes in the application.
 * This type maps route IDs to their respective route definitions.
 */
type RouteConfig = {
  [routeId: string]: Route;
};

/**
 * Generates a link for a specified route with optional path and query parameters.
 *
 * @template Config - The type of the flat route config object.
 * @param routeId - The route ID.
 * @param params - Set path parameters and query parameters
 * @returns The generated link.
 */
type LinkGenerator<Config extends FlatRouteConfig> = <
  RouteId extends keyof Config,
>(
  routeId: RouteId,
  ...params: ParamArgs<Config, RouteId>
) => string;

type FlatRouteConfig = Record<string, string>;

type Split<
  Source extends string,
  Separator extends string,
> = string extends Source ? string[]
  : Source extends "" ? []
  : Source extends `${infer Before}${Separator}${infer After}`
    ? [Before, ...Split<After, Separator>]
  : [Source];

type ParseSegment<Path extends string> = Split<Path, Symbols.PathSeparater>;

type ParseQueryParams<QueryString extends string> = Split<
  QueryString,
  Symbols.QuerySeparator
>;

// deno-lint-ignore no-explicit-any
type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
  k: infer I,
) => void ? I
  : never;

/**
 * The default value type for path or query parameters without constraints.
 * These are values that can be URL-encoded.
 *
 * Example:
 *
 * ```ts
 * const routeConfig = {
 *  route1: {
 *    path: '/route1/:param',
 *  }
 * } as const satisfies RouteConfig;
 *
 * ...create link generator
 *
 * link('route1', { param: 'hi' }); // string type value is OK
 *
 * link('route1', { param: 1 }) // number type value is OK
 *
 * link('route1', { param: false }) // boolean type value is OK
 * ```
 */
type DefaultParamValue = string | number | boolean;

/**
 * The type of object that sets the values of the path and query parameters that are used as the params argument to the link function.
 *
 * ```ts
 * // link('route1': RouteId, {...}: Param, {...}: Param)
 * ```
 */
type Param = Record<string, DefaultParamValue>;

type StringToBoolean<UnionSegment extends string> = UnionSegment extends "true"
  ? true
  : UnionSegment extends "false" ? false
  : UnionSegment;

type StringToNumber<UnionSegment extends string> = UnionSegment extends
  `${infer NumericString extends number}` ? NumericString
  : UnionSegment;

type ParseUnion<UnionString extends string> = StringToBoolean<
  StringToNumber<Split<UnionString, Symbols.UnionSeparater>[number]>
>;

type InferParamType<Constraint extends string> = Constraint extends "string"
  ? string
  : Constraint extends "number" ? number
  : Constraint extends "boolean" ? boolean
  : Constraint extends `${Symbols.UnionOpen}${infer Union}${Symbols.UnionClose}`
    ? ParseUnion<Union>
  : never;

type CreatePathParams<Segment extends string> = Segment extends
  `${infer ParamName}${Symbols.ConstraintOpen}${infer Constraint}${Symbols.ConstraintClose}`
  ? Record<ParamName, InferParamType<Constraint>>
  : Record<Segment, DefaultParamValue>;

type CreateQueryParams<Segment extends string> = Segment extends
  `${infer ParamName}${Symbols.ConstraintOpen}${infer Constraint}${Symbols.ConstraintClose}${Symbols.OptionalParam}`
  ? Partial<Record<ParamName, InferParamType<Constraint>>>
  : Segment extends
    `${infer ParamName}${Symbols.ConstraintOpen}${infer Constraint}${Symbols.ConstraintClose}`
    ? Record<ParamName, InferParamType<Constraint>>
  : Segment extends `${infer ParamName}${Symbols.OptionalParam}`
    ? Partial<Record<ParamName, DefaultParamValue>>
  : Record<Segment, DefaultParamValue>;

type FindPathParams<Segment> = Segment extends
  `${Symbols.PathParam}${infer ParamField}`
  ? ParamField extends `${infer ParamName}${Symbols.Query}${infer QueryField}`
    ? ParamName
  : ParamField
  : never;

type FindQueryString<Path extends string> = Path extends
  `${infer Head}${Symbols.Query}${infer QueryString}` ? QueryString
  : never;

type PathParams<Path extends string> = UnionToIntersection<
  CreatePathParams<FindPathParams<ParseSegment<Path>[number]>>
>;

type IsType<CheckType, TargetType> = CheckType extends TargetType
  ? TargetType extends CheckType ? true
  : false
  : false;

type IsUnknownType<T> = IsType<unknown, T>;

type QueryParams<Path extends string> = UnionToIntersection<
  CreateQueryParams<ParseQueryParams<FindQueryString<Path>>[number]>
>;

/**
 * Extracts route data, including path and query parameters, for a given route configuration.
 *
 * Example:
 *
 * ```ts
 * type FlattenedRoutes = {
 *  'parent': '/parentpath/?key1&key2',
 *  'parent/child': '/parentpath/:param',
 * }
 *
 * type Result = ExtractRouteData<FlattendRoutes>;
 *
 * // => {
 *  parent: {
 *    path: '/parentpath/:param/?key',
 *    params: never,
 *    params: {
 *      param: DefaultParamValue
 *    }
 *    query: {
 *      key: DefaultParamValue,
 *    }
 *  }
 * }
 * ```
 */
type ExtractRouteData<FlattenedRoutes extends FlatRouteConfig> = {
  [RouteId in keyof FlattenedRoutes]: {
    path: FlattenedRoutes[RouteId];
    params: IsUnknownType<PathParams<FlattenedRoutes[RouteId]>> extends true
      ? never
      : PathParams<FlattenedRoutes[RouteId]>;
    query: IsUnknownType<QueryParams<FlattenedRoutes[RouteId]>> extends true
      ? never
      : QueryParams<FlattenedRoutes[RouteId]>;
  };
};

type NestedKeys<Config> = Config extends RouteConfig ? {
    [ParentKey in keyof Config]: ParentKey extends string
      ? Config[ParentKey] extends { children: RouteConfig } ?
          | `${ParentKey}`
          | `${ParentKey}${Symbols.PathSeparater}${NestedKeys<
            Config[ParentKey]["children"]
          >}`
      : ParentKey
      : never;
  }[keyof Config]
  : never;

/**
 * Flattens the route configuration object into a simpler structure.
 *
 * Example:
 *
 * ```ts
 * const routeConfig = {
 *  parent: {
 *    path: '/parentpath',
 *    children: {
 *      child: {
 *        path: '/childpath'
 *      }
 *    }
 *  }
 * } as const satisfies RouteConfig;
 *
 * type Result = FlattenRouteConfig<typeof routeConfig>;
 *
 * // => { parent: '/parentpath', 'parent/child': '/parentpath/childpath' }
 * ```
 */
type FlattenRouteConfig<
  Config,
  ParentPath extends string = "",
> = Config extends RouteConfig ? {
    [RouteId in NestedKeys<Config>]: RouteId extends
      `${infer ParentRouteId}${Symbols.PathSeparater}${infer ChildrenRouteId}`
      ? FlattenRouteConfig<
        Config[ParentRouteId]["children"],
        `${ParentPath}${Config[ParentRouteId]["path"]}`
      >[ChildrenRouteId]
      : `${ParentPath}${Config[RouteId]["path"]}`;
  }
  : never;

/**
 * Removes parent query string from a given route path.
 *
 * Example:
 *
 * ```ts
 * type Path =  '/parentpath/?pkey1&pkey2/childpath/?ckey1&ckey2'
 *
 * type Result = RemoveParentQueryString<Path>;
 *
 * // => '/parentpath/childpath/?ckey1&ckey2' }
 * ```
 */
type RemoveParentQueryString<Path extends string> = Path extends
  `${infer Head}${Symbols.Query}${infer Middle}${Symbols.PathSeparater}${infer Tail}`
  ? RemoveParentQueryString<`${Head}${Symbols.PathSeparater}${Tail}`>
  : Path;

/**
 * Removes parent query string from the flattened route configuration.
 *
 * Example:
 *
 * ```ts
 * const routeConfig = {
 *  parent: {
 *    path: '/parentpath/?pkey1&pkey2',
 *    children: {
 *      child: {
 *        path: '/childpath/?ckey1&ckey2'
 *      }
 *    }
 *  },
 *  external: {
 *    path: 'https://example.com?pkey1&pkey2',
 *    children: {
 *      child: {
 *        path: 'https://example.com/childpath/?ckey1&ckey2'
 *      }
 *    }
 *  }
 * } as const satisfies RouteConfig;
 *
 * type Result = PrunePaths<typeof routeConfig>;
 *
 * // => {
 *  'parent': '/parentpath/?pkey1&pkey2',
 *  'parent/child': '/parentpath/childpath/?ckey1&ckey2',
 *  'external': 'https://example.com?pkey1&pkey2
 *  'external/child': 'https://example.com/childpath/?ckey1&ckey2
 * }
 * ```
 */
type PrunePaths<Config> = Config extends FlatRouteConfig ? {
    [RouteId in keyof Config]: Config[RouteId] extends
      `${infer Protocol}:/${infer Rest}` // Is absolute path?
      ? `${Protocol}:/${RemoveParentQueryString<Rest>}`
      : RemoveParentQueryString<Config[RouteId]>;
  }
  : never;

/**
 * Flattens the route configuration object.
 *
 * Example:
 *
 * ```ts
 * const routeConfig = {
 *  parent1: {
 *    path: '/parent1path',
 *    children: {
 *      child: {
 *        path: '/childpath'
 *      }
 *    }
 *  },
 *  parent2: {
 *    path: '/parent2path/?key1&key2',
 *    children: {
 *      child: {
 *        path: '/:param
 *      }
 *    }
 *  }
 *
 * } as const satisfies RouteConfig;
 *
 * type Result = FlatRotues<typeof routeConfig>;
 *
 * // => {
 *  'parent1': '/parent1path',
 *  'parent1/child': '/parent1path/childpath',
 *  'parent2': '/parent2path/?key1&key2'
 *  'parent2/child': '/parent2path/:param'
 * }
 * ```
 */
type FlatRoutes<Config> = PrunePaths<FlattenRouteConfig<Config>>;

type EmptyObject = Record<string, never>;

/**
 * Extracts path and query parameters for a given route.
 */
type ParamArgs<
  Config extends FlatRouteConfig,
  RouteId extends keyof Config,
> = ExtractRouteData<Config>[RouteId]["params"] extends EmptyObject
  ? [undefined?, ExtractRouteData<Config>[RouteId]["query"]?]
  : IsUnknownType<ExtractRouteData<Config>[RouteId]["params"]> extends true
    ? [undefined?, ExtractRouteData<Config>[RouteId]["query"]?]
  : [
    ExtractRouteData<Config>[RouteId]["params"],
    ExtractRouteData<Config>[RouteId]["query"]?,
  ];

export type {
  DefaultParamValue,
  ExtractRouteData,
  FlatRouteConfig,
  FlatRoutes,
  LinkGenerator,
  Param,
  ParamArgs,
  Route,
  RouteConfig,
};
