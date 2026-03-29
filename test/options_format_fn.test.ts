import { assertEquals } from "@std/assert/equals";
import {
  link_generator,
  ParamsContext,
  QueryContext,
  RouteContext,
} from "../src/link_generator.ts";
import type { RouteConfig } from "../src/types.ts";
import { assertSpyCall, assertSpyCalls, spy } from "@std/testing/mock";

Deno.test("custom replace_params_fn should receive correct ctx", () => {
  const route_config = {
    user: {
      path: "/user/:id",
    },
  } as const satisfies RouteConfig;

  const custom_replace_params_fn = spy(() => "/custom-path");

  const link = link_generator(route_config, {
    replace_params_fn: custom_replace_params_fn,
  });

  const result = link("user", { id: "alice" });

  assertEquals(result, "/custom-path");

  assertSpyCalls(custom_replace_params_fn, 1);

  const expected_ctx = new RouteContext<typeof route_config>("user", {
    path: "/user/:id",
    params: new ParamsContext({ id: "alice" }),
    query: new QueryContext(),
  });

  assertSpyCall(custom_replace_params_fn, 0, {
    args: [expected_ctx],
    returned: "/custom-path",
  });
});

Deno.test("custom format_qs_fn should receive correct ctx", () => {
  const route_config = {
    search: {
      path: "/search?page",
    },
  } as const satisfies RouteConfig;

  const custom_format_qs_fn = spy(() => "custom=query");

  const link = link_generator(route_config, {
    format_qs_fn: custom_format_qs_fn,
  });

  const result = link("search", undefined, { page: 2 });

  assertEquals(result, "/search?custom=query");

  assertSpyCalls(custom_format_qs_fn, 1);

  const expected_ctx = new RouteContext<typeof route_config>("search", {
    path: "/search",
    params: new ParamsContext(),
    query: new QueryContext({ page: 2 }),
  });

  assertSpyCall(custom_format_qs_fn, 0, {
    args: [expected_ctx],
    returned: "custom=query",
  });
});
