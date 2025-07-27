import { assertEquals } from "@std/assert/equals";
import { spy } from "@std/testing/mock";
import { link_generator, type RouteContext } from "../src/link_generator.ts";
import type { LinkGeneratorOptions, RouteConfig } from "../src/types.ts";

const route_config = {
  foo: {
    path: "/foo/:param?a&b",
  },
} as const satisfies RouteConfig;

type TestRouteConfig = typeof route_config;

function setup(
  transformFn?: LinkGeneratorOptions<TestRouteConfig>["transform"],
  opts = {},
) {
  const transform_spy = spy(
    transformFn ?? ((ctx: RouteContext<TestRouteConfig>) => ctx.path),
  );
  const link = link_generator(route_config, {
    transform: transform_spy,
    ...opts,
  });
  return { link, transform_spy };
}

function assert_ctx(
  ctx: RouteContext<TestRouteConfig>,
  expected: {
    id: string;
    path: string;
    params: Record<string, unknown>;
    query: Record<string, unknown[]>;
  },
) {
  assertEquals(ctx.id, expected.id);
  assertEquals(ctx.path, expected.path);
  assertEquals(ctx.params, expected.params);
  assertEquals(ctx.query, expected.query);
}

Deno.test("link_generator basic cases", async (t) => {
  await t.step("no query", () => {
    const { link, transform_spy } = setup();
    const result = link("foo", { param: "a" });
    const ctx = transform_spy.calls[0].args[0];

    assertEquals(result, "/foo/a");
    assert_ctx(ctx, {
      id: "foo",
      path: "/foo/a",
      params: { param: "a" },
      query: {},
    });
  });

  await t.step("with query", () => {
    const { link, transform_spy } = setup();
    const result = link("foo", { param: "a" }, { a: "value" });
    const ctx = transform_spy.calls[0].args[0];

    assertEquals(result, "/foo/a?a=value");
    assert_ctx(ctx, {
      id: "foo",
      path: "/foo/a",
      params: { param: "a" },
      query: { a: ["value"] },
    });
  });

  await t.step("with same query keys", () => {
    const { link, transform_spy } = setup();
    const result = link("foo", { param: "a" }, { a: "value1" }, { a: 2 });
    const ctx = transform_spy.calls[0].args[0];

    assertEquals(result, "/foo/a?a=value1&a=2");
    assert_ctx(ctx, {
      id: "foo",
      path: "/foo/a",
      params: { param: "a" },
      query: { a: ["value1", 2] },
    });
  });

  await t.step("with multiple query params", () => {
    const { link, transform_spy } = setup();
    const result = link("foo", { param: "a" }, { a: "value", b: 42 });
    const ctx = transform_spy.calls[0].args[0];

    assertEquals(result, "/foo/a?a=value&b=42");
    assert_ctx(ctx, {
      id: "foo",
      path: "/foo/a",
      params: { param: "a" },
      query: { a: ["value"], b: [42] },
    });
  });
});

Deno.test(
  "link_generator with transform and should_append_query = false",
  async (t) => {
    const transformFn = (ctx: RouteContext<TestRouteConfig>) =>
      `/custom${ctx.path}`;
    const { link, transform_spy } = setup(transformFn, {
      should_append_query: false,
    });

    await t.step("without query", () => {
      const result = link("foo", { param: "a" });
      assertEquals(result, "/custom/foo/a");
      const ctx = transform_spy.calls[0].args[0];
      assert_ctx(ctx, {
        id: "foo",
        path: "/foo/a",
        params: { param: "a" },
        query: {},
      });
    });

    await t.step("with query", () => {
      const result = link("foo", { param: "a" }, { a: "value" });
      assertEquals(result, "/custom/foo/a");
      const ctx = transform_spy.calls[1].args[0];
      assert_ctx(ctx, {
        id: "foo",
        path: "/foo/a",
        params: { param: "a" },
        query: { a: ["value"] },
      });
    });
  },
);

Deno.test("transform returns undefined should fallback to ctx.path", () => {
  const transform_fn = (ctx: RouteContext<TestRouteConfig>) => {
    if (ctx.params.param === "custom") return "/custom-path";
  };

  const { link, transform_spy } = setup(transform_fn);

  const result1 = link("foo", { param: "custom" });
  assertEquals(result1, "/custom-path");

  const result2 = link("foo", { param: "default" }, { a: "value" });
  assertEquals(result2, "/foo/default?a=value");

  const ctx1 = transform_spy.calls[0].args[0];
  const ctx2 = transform_spy.calls[1].args[0];

  assert_ctx(ctx1, {
    id: "foo",
    path: "/foo/custom",
    params: { param: "custom" },
    query: {},
  });

  assert_ctx(ctx2, {
    id: "foo",
    path: "/foo/default",
    params: { param: "default" },
    query: { a: ["value"] },
  });
});
