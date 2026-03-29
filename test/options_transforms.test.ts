import { assertEquals } from "@std/assert/equals";
import {
  link_generator,
  ParamsContext,
  QueryContext,
  RouteContext,
} from "../src/link_generator.ts";
import type { RouteConfig } from "../src/types.ts";

Deno.test("add: should create a new entry when the key does not exist", () => {
  const ctx = new QueryContext();

  ctx.add("key", "a");

  assertEquals(ctx.get("key"), ["a"]);
});

Deno.test("add: should append values to an existing key", () => {
  const ctx = new QueryContext();

  ctx.set("key", ["a"]);
  ctx.add("key", "b");

  assertEquals(ctx.get("key"), ["a", "b"]);
});

Deno.test("transform function receives correct RouteContext", () => {
  const route_config = {
    user: {
      path: "/users/:id",
    },
  } as const satisfies RouteConfig;

  let captured: RouteContext<typeof route_config> | null = null;

  const transform = (ctx: RouteContext<typeof route_config>) => {
    captured = ctx;
    ctx.params.set("id", "alice");
    ctx.query.set("lang", ["en"]);
  };

  const link = link_generator(route_config, {
    transforms: [transform],
  });

  const result = link("user", { id: "bob" });

  assertEquals(result, "/users/alice?lang=en");

  const expected = new RouteContext<typeof route_config>("user", {
    path: "/users/:id",
    params: new ParamsContext([["id", "alice"]]),
    query: new QueryContext([["lang", ["en"]]]),
  });

  assertEquals(captured, expected);
});
