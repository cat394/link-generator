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
  transform_fn?: LinkGeneratorOptions<TestRouteConfig>["transform"],
  opts = {},
) {
  const transform_spy = spy(
    transform_fn ?? ((ctx: RouteContext<TestRouteConfig>) => ctx.path),
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

Deno.test("transform receives correct ctx when no query is passed", () => {
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

Deno.test("transform receives correct ctx with single query param", () => {
  const { link, transform_spy } = setup();
  const result = link("foo", { param: "a" }, { a: "v" });
  const ctx = transform_spy.calls[0].args[0];

  assertEquals(result, "/foo/a?a=v");
  assert_ctx(ctx, {
    id: "foo",
    path: "/foo/a",
    params: { param: "a" },
    query: { a: ["v"] },
  });
});

Deno.test("transform receives ctx with duplicated query keys", () => {
  const { link, transform_spy } = setup();
  const result = link("foo", { param: "a" }, { a: "v" }, { a: 1 });
  const ctx = transform_spy.calls[0].args[0];

  assertEquals(result, "/foo/a?a=v&a=1");
  assert_ctx(ctx, {
    id: "foo",
    path: "/foo/a",
    params: { param: "a" },
    query: { a: ["v", 1] },
  });
});

Deno.test("transform receives ctx with multiple distinct query params", () => {
  const { link, transform_spy } = setup();
  const result = link("foo", { param: "a" }, { a: "v", b: 1 });
  const ctx = transform_spy.calls[0].args[0];

  assertEquals(result, "/foo/a?a=v&b=1");
  assert_ctx(ctx, {
    id: "foo",
    path: "/foo/a",
    params: { param: "a" },
    query: { a: ["v"], b: [1] },
  });
});

Deno.test(
  "transform overrides path and query is ignored when should_append_query is false",
  () => {
    const transform_fn = (ctx: RouteContext<TestRouteConfig>) =>
      `/custom${ctx.path}`;
    const { link, transform_spy } = setup(transform_fn, {
      should_append_query: false,
    });
    const result = link("foo", { param: "a" }, { a: "v" });
    const ctx = transform_spy.calls[0].args[0];

    assertEquals(result, "/custom/foo/a");
    assert_ctx(ctx, {
      id: "foo",
      path: "/foo/a",
      params: { param: "a" },
      query: { a: ["v"] },
    });
  },
);

Deno.test("transform returning undefined falls back to ctx.path", () => {
  const transform_fn = (ctx: RouteContext<TestRouteConfig>) => {
    if (ctx.params.param === "a") return "/custom";
  };
  const { link, transform_spy } = setup(transform_fn);
  const result1 = link("foo", { param: "a" });
  const result2 = link("foo", { param: "b" }, { a: "v" });
  const ctx1 = transform_spy.calls[0].args[0];
  const ctx2 = transform_spy.calls[1].args[0];

  assertEquals(result1, "/custom");
  assertEquals(result2, "/foo/b?a=v");
  assert_ctx(ctx1, {
    id: "foo",
    path: "/foo/a",
    params: { param: "a" },
    query: {},
  });
  assert_ctx(ctx2, {
    id: "foo",
    path: "/foo/b",
    params: { param: "b" },
    query: { a: ["v"] },
  });
});
