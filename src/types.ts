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
 * A function that generates links based on the given configuration.
 *
 * @template Config - The type of the configuration object.
 * @param routeId - The route ID.
 * @param params - The parameters for the route.
 * @param search - The search parameters for the route.
 * @returns The generated link.
 */
type LinkGenerator<Config extends FlatRouteConfig> = <
  RouteId extends keyof Config,
>(
  routeId: RouteId,
  params?: ExtractRouteData<Config>[RouteId]["search"] extends never
    ? ExtractRouteData<Config>[RouteId]["params"]
    : ExtractRouteData<Config>[RouteId]["params"] | null,
  search?: ExtractRouteData<Config>[RouteId]["search"],
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

type ParseSearch<QuerySegment extends string> = Split<
  QuerySegment,
  Symbols.QuerySeparater
>;

type ParameterIsNullable = undefined | null;

/**
 * Represents a value that a parameter can accept.
 */
type DefaultParameterType = string | number | boolean;

type ParameterAcceptValue = DefaultParameterType | ParameterIsNullable;

/**
 * Represents a collection of parameters.
 * Each key is a parameter name, and each value is the parameter's value.
 */
type Parameter = Record<string, ParameterAcceptValue>;

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

type ExtractParams<Segment extends string> = Segment extends
  `${Symbols.Param}${infer ParamName}${Symbols.ConstraintOpen}${infer Constraint}${Symbols.ConstraintClose}${Symbols.OptionalParam}`
  ? Partial<Record<ParamName, InferParamType<Constraint> | null>>
  : Segment extends
    `${Symbols.Param}${infer ParamName}${Symbols.ConstraintOpen}${infer Constraint}${Symbols.ConstraintClose}`
    ? Record<ParamName, InferParamType<Constraint>>
  : Segment extends `${Symbols.Param}${infer ParamName}${Symbols.OptionalParam}`
    ? Partial<Record<ParamName, DefaultParameterType>>
  : Segment extends `${Symbols.Param}${infer ParamName}`
    ? Record<ParamName, DefaultParameterType>
  : never;

type FindSearchSegment<Segment extends string> = Segment extends
  `${Symbols.Search}${infer QuerySegment}` ? QuerySegment
  : never;

type ExtractSearch<Segment extends string> = Segment extends
  `${infer QueryName}${Symbols.ConstraintOpen}${infer Constraint}${Symbols.ConstraintClose}${Symbols.OptionalParam}`
  ? Partial<Record<QueryName, InferParamType<Constraint>> | null>
  : Segment extends
    `${infer QueryName}${Symbols.ConstraintOpen}${infer Constraint}${Symbols.ConstraintClose}`
    ? Record<QueryName, InferParamType<Constraint>>
  : Segment extends `${infer QueryName}${Symbols.OptionalParam}`
    ? Partial<Record<QueryName, DefaultParameterType>>
  : Segment extends `${infer QueryName}`
    ? Record<QueryName, DefaultParameterType>
  : never;

type Params<Path extends string> = ExtractParams<ParseSegment<Path>[number]>;

type Search<Path extends string> = ExtractSearch<
  ParseSearch<FindSearchSegment<ParseSegment<Path>[number]>>[number]
>;

/**
 * Extracts the route data from a flattened route configuration.
 * Each key is a route ID, and each value contains the path, parameters, and search parameters for that route.
 */
type ExtractRouteData<FlatRoute extends FlatRouteConfig> = {
  [RouteId in keyof FlatRoute]: {
    path: RouteId;
    params: Params<FlatRoute[RouteId]>;
    search: Search<FlatRoute[RouteId]>;
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

type RemoveDuplicatePathSeparator<Path extends string> = Path extends
  `${Symbols.PathSeparater}${infer Rest}` ? RemoveDuplicatePathSeparator<Rest>
  : Path extends `${infer Segment}${Symbols.PathSeparater}${infer Rest}`
    ? `${Segment}${Symbols.PathSeparater}${RemoveDuplicatePathSeparator<Rest>}`
  : Path;

type PrependPathSeparator<Path extends string> = Path extends
  `${Symbols.PathSeparater}${infer Rest}` ? Path
  : `${Symbols.PathSeparater}${Path}`;

/**
 * Flattens a route configuration into a single-level object.
 * Each key is a route ID, and each value is the corresponding flattened path.
 */
type FlattenRouteConfig<Config, ParentPath extends string = ""> = Config extends
  RouteConfig ? {
    [RouteId in NestedKeys<Config>]: RouteId extends
      `${infer ParentRouteId}${typeof Symbols.PathSeparater}${infer ChildrenRouteId}`
      ? FlattenRouteConfig<
        Config[ParentRouteId]["children"],
        `${ParentPath}${Config[ParentRouteId]["path"]}`
      >[ChildrenRouteId]
      : `${ParentPath}${Config[RouteId]["path"]}`;
  }
  : never;

export type {
  DefaultParameterType,
  ExtractRouteData,
  FlatRouteConfig,
  FlattenRouteConfig,
  LinkGenerator,
  Parameter,
  ParameterAcceptValue,
  Route,
  RouteConfig,
};
