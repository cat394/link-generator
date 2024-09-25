import { assertEquals } from "@std/assert/equals";
import { assertType, type IsExact } from "@std/testing/types";
import {
  create_link_generator,
  type DefaultParamValue,
  type ExtractRouteData,
  type FlatRoutes,
  flatten_route_config,
  type RouteConfig,
} from "../src/mod.ts";

const route_config = {
  root: {
    path: "/:param",
  },
  with_name: {
    path: "/name/:param",
  },
  nested: {
    path: "/nested",
    children: {
      deep: {
        path: "/deep/:param",
      },
    },
  },
  nested_with_parent_param: {
    path: "/nested/:parent-param",
    children: {
      deep: {
        path: "/deep/:child-param",
      },
    },
  },
} as const satisfies RouteConfig;

const flat_route_config = flatten_route_config(route_config);

Deno.test("FlatRoutes type", () => {
  type ExpectedFlatRoutes = {
    root: "/:param";
    with_name: "/name/:param";
    nested: "/nested";
    "nested/deep": "/nested/deep/:param";
    nested_with_parent_param: "/nested/:parent-param";
    "nested_with_parent_param/deep": "/nested/:parent-param/deep/:child-param";
  };

  assertType<IsExact<FlatRoutes<typeof route_config>, ExpectedFlatRoutes>>(
    true,
  );
});

Deno.test("ExtractRouteData type", () => {
  type ExpectedExtractRouteData = {
    root: {
      path: "/:param";
      params: Record<"param", DefaultParamValue>;
      query: never;
    };
    with_name: {
      path: "/name/:param";
      params: Record<"param", DefaultParamValue>;
      query: never;
    };
    nested: {
      path: "/nested";
      params: never;
      query: never;
    };
    "nested/deep": {
      path: "/nested/deep/:param";
      params: Record<"param", DefaultParamValue>;
      query: never;
    };
    nested_with_parent_param: {
      path: "/nested/:parent-param";
      params: Record<"parent-param", DefaultParamValue>;
      query: never;
    };

    "nested_with_parent_param/deep": {
      path: "/nested/:parent-param/deep/:child-param";
      params: {
        "child-param": DefaultParamValue;
        "parent-param": DefaultParamValue;
      };
      query: never;
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
    root: "/:param",
    with_name: "/name/:param",
    nested: "/nested",
    "nested/deep": "/nested/deep/:param",
    nested_with_parent_param: "/nested/:parent-param",
    "nested_with_parent_param/deep": "/nested/:parent-param/deep/:child-param",
  } as const satisfies FlatRoutes<typeof route_config>;

  assertEquals(flat_route_config, expected_flat_route_config);
});

Deno.test("create_link_generator", async (t) => {
  const link = create_link_generator(flat_route_config);

  await t.step("string param value", () => {
    const path_to_root = link("root", { param: "a" });
    const path_to_with_name = link("with_name", { param: "a" });
    const path_to_nested = link("nested");
    const path_to_nested_deep = link("nested/deep", { param: "a" });
    const path_to_nested_with_parent_param = link("nested_with_parent_param", {
      "parent-param": "a",
    });
    const path_to_nested_deep__with_parent_param = link(
      "nested_with_parent_param/deep",
      { "parent-param": "a", "child-param": "b" },
    );

    assertEquals(path_to_root, "/a");
    assertEquals(path_to_with_name, "/name/a");
    assertEquals(path_to_nested, "/nested");
    assertEquals(path_to_nested_deep, "/nested/deep/a");
    assertEquals(path_to_nested_with_parent_param, "/nested/a");
    assertEquals(path_to_nested_deep__with_parent_param, "/nested/a/deep/b");
  });

  await t.step("number param value", () => {
    const path_to_root = link("root", { param: 1 });
    const path_to_with_name = link("with_name", { param: 1 });
    const path_to_nested = link("nested");
    const path_to_nested_deep = link("nested/deep", { param: 1 });
    const path_to_nested_with_parent_param = link("nested_with_parent_param", {
      "parent-param": 1,
    });
    const path_to_nested_deep__with_parent_param = link(
      "nested_with_parent_param/deep",
      { "parent-param": 1, "child-param": 2 },
    );
    const path_to_root_with_falsy_param_value = link("root", { param: 0 });

    assertEquals(path_to_root, "/1");
    assertEquals(path_to_with_name, "/name/1");
    assertEquals(path_to_nested, "/nested");
    assertEquals(path_to_nested_deep, "/nested/deep/1");
    assertEquals(path_to_nested_with_parent_param, "/nested/1");
    assertEquals(path_to_nested_deep__with_parent_param, "/nested/1/deep/2");
    assertEquals(path_to_root_with_falsy_param_value, "/0");
  });

  await t.step("boolean param value", () => {
    const path_to_root = link("root", { param: true });
    const path_to_with_name = link("with_name", { param: true });
    const path_to_nested = link("nested");
    const path_to_nested_deep = link("nested/deep", { param: true });
    const path_to_nested_with_parent_param = link("nested_with_parent_param", {
      "parent-param": true,
    });
    const path_to_nested_deep__with_parent_param = link(
      "nested_with_parent_param/deep",
      { "parent-param": true, "child-param": false },
    );

    assertEquals(path_to_root, "/true");
    assertEquals(path_to_with_name, "/name/true");
    assertEquals(path_to_nested, "/nested");
    assertEquals(path_to_nested_deep, "/nested/deep/true");
    assertEquals(path_to_nested_with_parent_param, "/nested/true");
    assertEquals(
      path_to_nested_deep__with_parent_param,
      "/nested/true/deep/false",
    );
  });
});
