import type { Symbols } from "./symbols.ts";

/**
 * Represents the configuration for all routes in the application.
 */
type RouteConfig = Record<string, Route>;

/**
 * Represents a single route in the application.
 * Each route has a path and optionally nested child routes.
 */
type Route = {
  path: string;
  children?: RouteConfig;
};

type FlatRouteConfig = Record<string, string>;

type Split<
  Source extends string,
  Separator extends string,
> = string extends Source ? string[]
  : Source extends "" ? []
  : Source extends `${infer Before}${Separator}${infer After}`
    ? [Before, ...Split<After, Separator>]
  : [Source];

type DivideIntoSegments<T extends string> = Split<T, Symbols.PathSeparater>;

type ParseSegment<Path extends string> = Path extends `${string}:/${infer Rest}`
  ? DivideIntoSegments<Rest>
  : DivideIntoSegments<Path>;

type ParseQueryParams<QueryArea extends string> = Split<
  QueryArea,
  Symbols.QuerySeparator
>;

/**
 * The default value type for path or query parameters without constraints.
 * These are values that can be URL-encoded.
 *
 * Example:
 *
 * ```ts
 * const route_config = {
 *  users: {
 *    path: '/users/:id',
 *  }
 * } as const satisfies RouteConfig;
 *
 * // ...create link generator
 *
 * link('route1', { id: 'abc' }); // string type value is OK
 *
 * link('route1', { id: 1 }) // number type value is OK
 *
 * link('route1', { id: false }) // boolean type value is OK
 * ```
 */
type DefaultParamValue = string | number | boolean;

/**
 * The type of object that sets the values of the path and query parameters that are used as the params argument to the link function.
 */
type Param = Record<string, DefaultParamValue>;

type ConvertStringType<UnionSegment extends string> = UnionSegment extends
  "string" ? string : never;

type ConvertNumberType<UnionSegment extends string> = UnionSegment extends
  "number" ? number
  : UnionSegment extends `${infer NumericString extends number}` ? NumericString
  : UnionSegment;

type ConvertBooleanType<UnionSegment extends string> = UnionSegment extends
  "boolean" ? boolean
  : UnionSegment extends "true" ? true
  : UnionSegment extends "false" ? false
  : UnionSegment;

type ConvertPrimitive<UnionSegment extends string> =
  ConvertNumberType<UnionSegment> extends number
    ? ConvertNumberType<UnionSegment>
    : ConvertBooleanType<UnionSegment> extends boolean
      ? ConvertBooleanType<UnionSegment>
    : ConvertStringType<UnionSegment>;

type ParseUnion<UnionString extends string> = Split<
  UnionString,
  Symbols.UnionSeparater
>;

type InferUnionType<UnionPart extends string> = UnionPart extends
  `${Symbols.ConvertString}${infer StringToConvert}`
  ? ConvertPrimitive<StringToConvert>
  : UnionPart;

type InferParamType<Constraint extends string> = Constraint extends "string"
  ? string
  : Constraint extends "number" ? number
  : Constraint extends "boolean" ? boolean
  : Constraint extends `${Symbols.UnionOpen}${infer Union}${Symbols.UnionClose}`
    ? InferUnionType<ParseUnion<Union>[number]>
  : never;

type CreateParams<Segment extends string> = Segment extends
  `${infer ParamName}${Symbols.ConstraintOpen}${infer Constraint}${Symbols.ConstraintClose}`
  ? Record<ParamName, InferParamType<Constraint>>
  : Record<Segment, DefaultParamValue>;

type ExtractParamArea<Segment> = Segment extends
  `${Symbols.PathParam}${infer ParamArea}`
  ? ParamArea extends
    `${infer ParamAreaExcludedQueryArea}${Symbols.Query}${string}`
    ? ParamAreaExcludedQueryArea
  : ParamArea
  : never;

type ExtractQueryArea<Path extends string> = Path extends
  `${string}${Symbols.Query}${infer QueryString}` ? QueryString
  : never;

type PathNotContainParams<T> = T extends [] ? true : false;

// deno-lint-ignore no-explicit-any
type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
  k: infer I,
) => void ? I
  : never;

type PathParams<Path extends string> = PathNotContainParams<
  ExtractParamArea<ParseSegment<Path>[number]>
> extends true ? never
  : UnionToIntersection<
    CreateParams<ExtractParamArea<ParseSegment<Path>[number]>>
  >;

type QueryParams<Path extends string> = PathNotContainParams<
  ParseQueryParams<ExtractQueryArea<Path>>[number]
> extends true ? never
  : UnionToIntersection<
    CreateParams<ParseQueryParams<ExtractQueryArea<Path>>[number]>
  >;

type RemoveConstraintArea<Path extends string> = Path extends
  `${infer Head}${Symbols.ConstraintOpen}${string}${Symbols.ConstraintClose}${infer Tail}`
  ? RemoveConstraintArea<`${Head}${Tail}`>
  : Path;

type CreateRouteId<Config> = Config extends RouteConfig ? {
    [ParentRouteId in keyof Config]: ParentRouteId extends string
      ? Config[ParentRouteId] extends { children: RouteConfig } ?
          | `${ParentRouteId}`
          | `${ParentRouteId}${Symbols.PathSeparater}${CreateRouteId<
            Config[ParentRouteId]["children"]
          >}`
      : ParentRouteId
      : never;
  }[keyof Config]
  : never;

/**
 * Flattens the route configuration object into a simpler structure.
 *
 * @example
 * const route_config = {
 *  parent: {
 *    path: '/parent?a&b&c',
 *    children: {
 *      child: {
 *        path: '/child'
 *      }
 *    }
 *  }
 * } as const satisfies RouteConfig;
 *
 * type Result = FlattenRouteConfig<typeof route_config>;
 * // {
 * //   parent: '/parent?a&b&c',
 * //   'parent/child': '/parent?a&b&c/child'
 * // }
 */
type FlattenRouteConfig<
  Config,
  ParentPath extends string = "",
> = Config extends RouteConfig ? {
    [RouteId in CreateRouteId<Config>]: RouteId extends
      `${infer ParentRouteId}${Symbols.PathSeparater}${infer ChildrenRouteId}`
      ? FlattenRouteConfig<
        Config[ParentRouteId]["children"],
        `${ParentPath}${Config[ParentRouteId]["path"]}`
      >[ChildrenRouteId]
      : `${ParentPath}${Config[RouteId]["path"]}`;
  }
  : never;

/**
 * Removes parent query area from a given route path.
 *
 * @example
 * type Path =  '/parent/?pkey1&pkey2/child?ckey1&ckey2'
 *
 * type Result = RemoveParentQueryArea<Path>;
 * // => '/parent/child?ckey1&ckey2'
 */
type RemoveParentQueryArea<Path extends string> = Path extends
  `${infer Head}${Symbols.Query}${string}${Symbols.PathSeparater}${infer Tail}`
  ? RemoveParentQueryArea<`${Head}${Symbols.PathSeparater}${Tail}`>
  : Path;

/**
 * Removes parent query string from the flattened route configuration.
 *
 * @example
 * const route_config = {
 *  parent: {
 *    path: '/parent?pkey1&pkey2',
 *    children: {
 *      child: {
 *        path: '/child?ckey1&ckey2'
 *      }
 *    }
 *  }
 * } as const satisfies RouteConfig;
 *
 * type Result = PrunePaths<typeof route_config>;
 * // {
 * //   'parent': '/parent?pkey1&pkey2',
 * //   'parent/child': '/parent/child?ckey1&ckey2'
 * // }
 */
type FlatRouteConfigRemovedParentQueryArea<Config> = Config extends
  FlatRouteConfig ? {
    [RouteId in keyof Config]: Config[RouteId] extends
      `${infer Protocol}:/${infer Rest}`
      ? `${Protocol}:/${RemoveParentQueryArea<Rest>}`
      : RemoveParentQueryArea<Config[RouteId]>;
  }
  : never;

/**
 * Flattens the route configuration object.
 *
 * Example:
 *
 * ```ts
 * const route_config = {
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
 * } as const satisfies RouteConfig;
 *
 * type Result = FlatRotues<typeof route_config>;
 * // {
 * //   'parent1': '/parent1path',
 * //   'parent1/child': '/parent1path/childpath',
 * //   'parent2': '/parent2path/?key1&key2',
 * //   'parent2/child': '/parent2path/:param'
 * // }
 * ```
 */
type FlatRoutes<Config> = FlatRouteConfigRemovedParentQueryArea<
  FlattenRouteConfig<Config>
>;

type RemoveQueryArea<Path extends string> = Path extends
  `${infer RoutePath}${Symbols.Query}${string}` ? RoutePath : Path;

/**
 * Extracts route data, including path and query parameters, for a given route configuration.
 *
 * @example
 * type FlatRouteConfig = {
 *  'parent': '/parentpath?key',
 *  'parent/child': '/parentpath/:param',
 * }
 *
 * type Result = ExtractRouteData<FlatRouteConfig>;
 * // {
 * //   parent: {
 * //     path: '/parentpath',
 * //     params: never,
 * //     query: {
 * //       key: DefaultParamValue,
 * //     }
 * //   },
 * //   "parent/child": {
 * //     path: '/parentpath/:param',
 * //     params: {
 * //       param: DefaultParamValue
 * //     },
 * //     query: never;
 * //   }
 * // }
 */
type ExtractRouteData<Routes extends FlatRouteConfig> = {
  [RouteId in keyof Routes]: {
    path: RemoveConstraintArea<RemoveQueryArea<Routes[RouteId]>>;
    params: PathParams<Routes[RouteId]>;
    query: Partial<QueryParams<Routes[RouteId]>>;
  };
};

type ParamArgs<
  Config extends FlatRouteConfig,
  RouteId extends keyof Config,
> = ExtractRouteData<Config>[RouteId]["params"] extends never ? [
    undefined?,
    ...(ExtractRouteData<Config>[RouteId]["query"] extends never ? []
      : ExtractRouteData<Config>[RouteId]["query"][]),
  ]
  : [
    ExtractRouteData<Config>[RouteId]["params"],
    ...(ExtractRouteData<Config>[RouteId]["query"] extends never ? []
      : ExtractRouteData<Config>[RouteId]["query"][]),
  ];

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
