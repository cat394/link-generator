import { assertEquals } from "@std/assert/equals";
import { assertType, type IsExact } from "@std/testing/types";
import { link_generator } from "../src/link_generator.ts";
import {
  type DefaultParamValue,
  type ExtractRouteData,
  type FlatRoutes,
  flatten_route_config,
  type RouteConfig,
} from "../src/mod.ts";

const route_config = {
  root: {
    path: "/?key",
  },
  with_name: {
    path: "/name?key",
  },
  nested: {
    path: "/nested",
    children: {
      deep: {
        path: "/deep?key",
      },
    },
  },
  nested_with_parent_param: {
    path: "/nested?parent-key",
    children: {
      deep: {
        path: "/deep?child-key",
      },
    },
  },
  multiple_query: {
    path: "/?key1&key2",
  },
} as const satisfies RouteConfig;

const flat_route_config = flatten_route_config(route_config);

Deno.test("FlatRoutes type", () => {
  type ExpectedFlatRoutes = {
    root: "/?key";
    with_name: "/name?key";
    nested: "/nested";
    "nested/deep": "/nested/deep?key";
    nested_with_parent_param: "/nested?parent-key";
    "nested_with_parent_param/deep": "/nested/deep?child-key";
    multiple_query: "/?key1&key2";
  };

  assertType<IsExact<FlatRoutes<typeof route_config>, ExpectedFlatRoutes>>(
    true,
  );
});

Deno.test("ExtractRouteData type", () => {
  type ExpectedExtractRouteData = {
    root: {
      path: "/";
      params: never;
      query: Partial<Record<"key", DefaultParamValue>>;
    };
    with_name: {
      path: "/name";
      params: never;
      query: Partial<Record<"key", DefaultParamValue>>;
    };
    nested: {
      path: "/nested";
      params: never;
      query: never;
    };
    "nested/deep": {
      path: "/nested/deep";
      params: never;
      query: Partial<Record<"key", DefaultParamValue>>;
    };
    nested_with_parent_param: {
      path: "/nested";
      params: never;
      query: Partial<Record<"parent-key", DefaultParamValue>>;
    };
    "nested_with_parent_param/deep": {
      path: "/nested/deep";
      params: never;
      query: Partial<Record<"child-key", DefaultParamValue>>;
    };
    multiple_query: {
      path: "/";
      params: never;
      query: Partial<{ key1: DefaultParamValue; key2: DefaultParamValue }>;
    };
  };

  assertType<
    IsExact<
      ExtractRouteData<typeof flat_route_config>,
      ExpectedExtractRouteData
    >
  >(true);
});

Deno.test("flatten_route_config", () => {
  const expected_flat_route_config = {
    root: "/?key",
    with_name: "/name?key",
    nested: "/nested",
    "nested/deep": "/nested/deep?key",
    nested_with_parent_param: "/nested?parent-key",
    "nested_with_parent_param/deep": "/nested/deep?child-key",
    multiple_query: "/?key1&key2",
  } as const satisfies FlatRoutes<typeof route_config>;

  assertEquals(flat_route_config, expected_flat_route_config);
});

Deno.test("create_link_generator", async (t) => {
  const link = link_generator(route_config);

  await t.step("string param value", () => {
    const path_to_root = link("root", undefined, { key: "a" });
    const path_to_with_name = link("with_name", undefined, { key: "a" });
    const path_to_nested = link("nested");
    const path_to_nested_deep = link("nested/deep", undefined, { key: "a" });
    const path_to_nested_with_parent_param = link(
      "nested_with_parent_param",
      undefined,
      { "parent-key": "a" },
    );
    const path_to_nested_deep_with_parent_query = link(
      "nested_with_parent_param/deep",
      undefined,
      { "child-key": "a" },
    );
    assertEquals(path_to_root, "/?key=a");
    assertEquals(path_to_with_name, "/name?key=a");
    assertEquals(path_to_nested, "/nested");
    assertEquals(path_to_nested_deep, "/nested/deep?key=a");
    assertEquals(path_to_nested_with_parent_param, "/nested?parent-key=a");
    assertEquals(
      path_to_nested_deep_with_parent_query,
      "/nested/deep?child-key=a",
    );
  });

  await t.step("number param value", () => {
    const path_to_root = link("root", undefined, { key: 1 });
    const path_to_with_name = link("with_name", undefined, { key: 1 });
    const path_to_nested = link("nested");
    const path_to_nested_deep = link("nested/deep", undefined, { key: 1 });
    const path_to_nested_with_parent_param = link(
      "nested_with_parent_param",
      undefined,
      { "parent-key": 1 },
    );
    const path_to_nested_deep_with_parent_param = link(
      "nested_with_parent_param/deep",
      undefined,
      { "child-key": 1 },
    );
    const path_to_root_with_falsy_param_value = link("root", undefined, {
      key: 0,
    });

    assertEquals(path_to_root, "/?key=1");
    assertEquals(path_to_with_name, "/name?key=1");
    assertEquals(path_to_nested, "/nested");
    assertEquals(path_to_nested_deep, "/nested/deep?key=1");
    assertEquals(path_to_nested_with_parent_param, "/nested?parent-key=1");
    assertEquals(
      path_to_nested_deep_with_parent_param,
      "/nested/deep?child-key=1",
    );
    assertEquals(path_to_root_with_falsy_param_value, "/?key=0");
  });

  await t.step("query should be optional when generating paths", () => {
    const path_to_root = link("root");
    const path_to_with_name = link("with_name");
    const path_to_nested = link("nested");
    const path_to_nested_deep = link("nested/deep");
    const path_to_nested_with_parent_param = link("nested_with_parent_param");
    const path_to_nested_deep_with_parent_param = link(
      "nested_with_parent_param/deep",
    );
    assertEquals(path_to_root, "/");
    assertEquals(path_to_with_name, "/name");
    assertEquals(path_to_nested, "/nested");
    assertEquals(path_to_nested_deep, "/nested/deep");
    assertEquals(path_to_nested_with_parent_param, "/nested");
    assertEquals(path_to_nested_deep_with_parent_param, "/nested/deep");
  });

  await t.step("multiple query", () => {
    const path_to_multiple_query = link("multiple_query", undefined, {
      key1: "a",
    }, { key2: "b" });
    assertEquals(path_to_multiple_query, "/?key1=a&key2=b");
  });
});
