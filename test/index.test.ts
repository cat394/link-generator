import { assertEquals } from "@std/assert";
import { assertType, type IsExact } from "@std/testing/types";
import {
  createLinkGenerator,
  type FlatRoutes,
  flattenRouteConfig,
  type RouteConfig,
} from "../src/mod.ts";
import type { ExtractRouteData, DefaultParamValue } from "../src/types.ts";

const routeConfig = {
  staticRoute: {
    path: "/",
  },
  dynamicRoute: {
    path: "/dynamic",
    children: {
      depth1: {
        path: "/:param1",
        children: {
          depth2: {
            path: "/depth2/:param2",
          },
        },
      },
    },
  },
  constraintRoute: {
    path: "/constraint",
    children: {
      param: {
        path: "/param",
        children: {
          stringConstraint: {
            path: "/:param<string>",
          },
          numberConstraint: {
            path: "/:param<number>",
          },
          booleanConstraint: {
            path: "/:param<boolean>",
          },
          unionConstraint: {
            path: "/:param<(a|1|false)>",
          },
        },
      },
      query: {
        path: "/query",
        children: {
          stringConstraint: {
            path: "?key<string>",
          },
          numberConstraint: {
            path: "?key<number>",
          },
          booleanConstraint: {
            path: "?key<boolean>",
          },
          unionConstraint: {
            path: "?key<(a|1|false)>",
          },
        },
      },
    },
  },
  withQueryRoute: {
    path: "/query",
    children: {
      singleParam: {
        path: "?key",
      },
      multiParams: {
        path: "?key1&key2",
      },
      optionalParam: {
        path: "?key1?&key2",
      },
    },
  },
  mixRoute: {
    path: "/mix",
    children: {
      signle: {
        path: "/:param1?query",
      },
      multipleParams: {
        path: "/:param2/:param3?query1",
      },
      multipleQuery: {
        path: "/:param3?query1&query2",
      },
      nested: {
        path: "/nested?query1",
        children: {
          depth1: {
            path: "/:param1?query2",
          },
        },
      },
    },
  },
  absoluteRoute: {
    path: "protocol://",
    children: {
      domain: {
        path: "example.com",
        children: {
          static: {
            path: "/staticPage",
          },
          withParam: {
            path: "/:param?key",
          },
        },
      },
    },
  },
} as const satisfies RouteConfig;

const flatResult = {
  staticRoute: "/",
  dynamicRoute: "/dynamic",
  "dynamicRoute/depth1": "/dynamic/:param1",
  "dynamicRoute/depth1/depth2": "/dynamic/:param1/depth2/:param2",
  constraintRoute: "/constraint",
  "constraintRoute/param": "/constraint/param",
  "constraintRoute/param/stringConstraint": "/constraint/param/:param<string>",
  "constraintRoute/param/numberConstraint": "/constraint/param/:param<number>",
  "constraintRoute/param/booleanConstraint":
    "/constraint/param/:param<boolean>",
  "constraintRoute/param/unionConstraint":
    "/constraint/param/:param<(a|1|false)>",
  "constraintRoute/query": "/constraint/query",
  "constraintRoute/query/stringConstraint": "/constraint/query?key<string>",
  "constraintRoute/query/numberConstraint": "/constraint/query?key<number>",
  "constraintRoute/query/booleanConstraint": "/constraint/query?key<boolean>",
  "constraintRoute/query/unionConstraint": "/constraint/query?key<(a|1|false)>",
  withQueryRoute: "/query",
  "withQueryRoute/singleParam": "/query?key",
  "withQueryRoute/multiParams": "/query?key1&key2",
  "withQueryRoute/optionalParam": "/query?key1?&key2",
  mixRoute: "/mix",
  "mixRoute/signle": "/mix/:param1?query",
  "mixRoute/multipleParams": "/mix/:param2/:param3?query1",
  "mixRoute/multipleQuery": "/mix/:param3?query1&query2",
  "mixRoute/nested": "/mix/nested?query1",
  "mixRoute/nested/depth1": "/mix/nested/:param1?query2",
  absoluteRoute: "protocol://",
  "absoluteRoute/domain": "protocol://example.com",
  "absoluteRoute/domain/static": "protocol://example.com/staticPage",
  "absoluteRoute/domain/withParam": "protocol://example.com/:param?key",
} as const satisfies FlatRoutes<typeof routeConfig>;

type FlatResult = FlatRoutes<typeof routeConfig>;

Deno.test("flatten route config type", () => {
  assertType<IsExact<FlatResult, typeof flatResult>>(true);
});

Deno.test("ExtractRouteData type", async (t) => {
  type RouteData = ExtractRouteData<FlatResult>;
  await t.step("path type", () => {
    type SampleRoute = RouteData["dynamicRoute/depth1"];
    assertType<IsExact<SampleRoute["path"], "/dynamic/:param1">>(true);
  });

  await t.step("static path params and query type is all never", () => {
    type StaticRoute = RouteData["staticRoute"];
    assertType<IsExact<StaticRoute["params"], never>>(true);
    assertType<IsExact<StaticRoute["query"], never>>(true);
  });

  await t.step("path params type", async (t) => {
    await t.step("default params type", () => {
      type DynamicRoute = RouteData["dynamicRoute/depth1"];
      assertType<
        IsExact<DynamicRoute["params"], { param1: DefaultParamValue }>
      >(true);
    });

    await t.step("string params type", () => {
      type DynamicRouteWithStringParams =
        RouteData["constraintRoute/param/stringConstraint"];
      assertType<
        IsExact<DynamicRouteWithStringParams["params"], { param: string }>
      >(true);
    });

    await t.step("number params type", () => {
      type DynamicRouteWithNumberParams =
        RouteData["constraintRoute/param/numberConstraint"];
      type Params = DynamicRouteWithNumberParams["params"];
      type Query = DynamicRouteWithNumberParams["query"];
      assertType<IsExact<Params, { param: number }>>(true);
    });

    await t.step("boolean params type", () => {
      type DynamicRouteWithBooleanParams =
        RouteData["constraintRoute/param/booleanConstraint"];
      assertType<
        IsExact<DynamicRouteWithBooleanParams["params"], { param: boolean }>
      >(true);
    });

    await t.step("union params type", () => {
      type DynamicRouteWithUnionParams =
        RouteData["constraintRoute/param/unionConstraint"];
      assertType<
        IsExact<
          DynamicRouteWithUnionParams["params"],
          { param: "a" | 1 | false }
        >
      >(true);
    });
  });

  await t.step("query type", async (t) => {
    await t.step("default query type", () => {
      type QueryRoute = RouteData["withQueryRoute/singleParam"];
      assertType<IsExact<QueryRoute["query"], { key: DefaultParamValue }>>(
        true,
      );
    });

    await t.step("string query type", () => {
      type StringQueryRoute =
        RouteData["constraintRoute/query/stringConstraint"];
      assertType<IsExact<StringQueryRoute["query"], { key: string }>>(true);
    });

    await t.step("number query type", () => {
      type NumberQueryRoute =
        RouteData["constraintRoute/query/numberConstraint"];
      assertType<IsExact<NumberQueryRoute["query"], { key: number }>>(true);
    });

    await t.step("boolean query type", () => {
      type BooleanQueryRoute =
        RouteData["constraintRoute/query/booleanConstraint"];
      assertType<IsExact<BooleanQueryRoute["query"], { key: boolean }>>(true);
    });

    await t.step("union query type", () => {
      type UnionQueryRoute = RouteData["constraintRoute/query/unionConstraint"];
      assertType<IsExact<UnionQueryRoute["query"], { key: "a" | 1 | false }>>(
        true,
      );
    });

    await t.step("optional query type", () => {
      type OptionalQueryRoute = RouteData["withQueryRoute/optionalParam"];
      assertType<
        IsExact<
          OptionalQueryRoute["query"],
          Partial<{ key1: DefaultParamValue }> & { key2: DefaultParamValue }
        >
      >(true);
    });
  });
});

Deno.test("flattenRouteConfig", () => {
  const flatConfig = flattenRouteConfig(routeConfig);
  assertEquals(flatResult, flatConfig);
});

Deno.test("generator function", async (t) => {
  const flatConfig = flattenRouteConfig(routeConfig);
  const link = createLinkGenerator(flatConfig);

  await t.step("static path", () => {
    assertEquals("/", link("staticRoute"));
  });

  await t.step("path with params", async (t) => {
    await t.step("with single params", () => {
      assertEquals(
        link("dynamicRoute/depth1", { param1: "param1" }),
        "/dynamic/param1",
      );
    });

    await t.step("with multiple params", () => {
      assertEquals(
        link("dynamicRoute/depth1/depth2", {
          param1: "dynamicPart1",
          param2: "dynamicPart2",
        }),
        "/dynamic/dynamicPart1/depth2/dynamicPart2",
      );
    });

    await t.step("params with constraint field", async (t) => {
      await t.step("string constraint", () => {
        assertEquals(
          link("constraintRoute/param/stringConstraint", {
            param: "dynamicPart1",
          }),
          "/constraint/param/dynamicPart1",
        );
      });

      await t.step("number constraint", () => {
        assertEquals(
          link("constraintRoute/param/numberConstraint", { param: 1 }),
          "/constraint/param/1",
        );
      });

      await t.step("boolean constraint", () => {
        assertEquals(
          link("constraintRoute/param/booleanConstraint", {
            param: true,
          }),
          "/constraint/param/true",
        );
      });

      await t.step("Union constraint", async (t) => {
        await t.step("Union constraint string element", () => {
          assertEquals(
            link("constraintRoute/param/unionConstraint", {
              param: "a",
            }),
            "/constraint/param/a",
          );
        });

        await t.step("Union constraint number element", () => {
          assertEquals(
            link("constraintRoute/param/numberConstraint", {
              param: 1,
            }),
            "/constraint/param/1",
          );
        });

        await t.step("Union constraint boolean element", () => {
          assertEquals(
            link("constraintRoute/param/unionConstraint", {
              param: false,
            }),
            "/constraint/param/false",
          );
        });
      });
    });
  });

  await t.step("path with query", async (t) => {
    await t.step("all query have values set", () => {
      assertEquals(
        link("withQueryRoute/singleParam", undefined, { key: "value" }),
        "/query?key=value",
      );
    });

    await t.step("some query have values set", () => {
      assertEquals(
        link("withQueryRoute/multiParams", undefined, {
          key1: "value1",
          key2: "value2",
        }),
        "/query?key1=value1&key2=value2",
      );
    });

    await t.step("optional query have value set", () => {
      assertEquals(
        link("withQueryRoute/optionalParam", undefined, {
          key1: "value1",
          key2: "value2",
        }),
        "/query?key1=value1&key2=value2",
      );
    });

    await t.step("optional query have not value set", () => {
      assertEquals(
        link("withQueryRoute/optionalParam", undefined, {
          key2: "value2",
        }),
        "/query?key2=value2",
      );
    });

    await t.step("all query have the value undefined", () => {
      assertEquals(link("withQueryRoute/multiParams", undefined), "/query");
    });

    await t.step("query with constraint filed", async (t) => {
      await t.step("string constraint", () => {
        assertEquals(
          link("constraintRoute/query/stringConstraint", undefined, {
            key: "value",
          }),
          "/constraint/query?key=value",
        );
      });

      await t.step("number constraint", () => {
        assertEquals(
          link("constraintRoute/query/numberConstraint", undefined, {
            key: 1,
          }),
          "/constraint/query?key=1",
        );
      });

      await t.step("boolean constraint", () => {
        assertEquals(
          link("constraintRoute/query/booleanConstraint", undefined, {
            key: true,
          }),
          "/constraint/query?key=true",
        );
      });
    });
  });

  await t.step("absolute path", async (t) => {
    await t.step("static page", () => {
      assertEquals(
        link("absoluteRoute/domain/static"),
        "protocol://example.com/staticPage",
      );
    });

    await t.step("with param and with query", () => {
      assertEquals(
        link("absoluteRoute/domain/withParam", { param: "dynamicPage" }),
        "protocol://example.com/dynamicPage",
      );
    });

    await t.step("with param and no query", () => {
      assertEquals(
        link(
          "absoluteRoute/domain/withParam",
          { param: "dynamicPage" },
          {
            key: "value",
          },
        ),
        "protocol://example.com/dynamicPage?key=value",
      );
    });
  });
});
