import { assertEquals } from "@std/assert/equals";
import {
  link_generator,
  ParamsContext,
  QueryContext,
  RouteContext,
} from "../src/link_generator.ts";
import type { RouteConfig } from "../src/types.ts";

Deno.test("query context ", () => {
  const query_context = new QueryContext(
    { lang: "en", page: 2 },
    { lang: "fr" },
  );

  assertEquals(query_context.get("lang"), "en");
  assertEquals(query_context.getAll("lang"), ["en", "fr"]);
  assertEquals(query_context.get("page"), "2");
});

Deno.test("transform function receives correct RouteContext", () => {
  const route_config = {
    user: {
      path: "/users/:id",
    },
  } as const satisfies RouteConfig;

  let received_ctx: RouteContext<typeof route_config> | null = null;

  const transform = (ctx: RouteContext<typeof route_config>) => {
    received_ctx = ctx;
    ctx.params.set("id", "alice");
    ctx.query.set("lang", "en");
  };

  const link = link_generator(route_config, {
    transforms: [transform],
  });

  const result = link("user", { id: "bob" });

  assertEquals(result, "/users/alice?lang=en");

  const expected = new RouteContext<typeof route_config>("user", {
    path: "/users/:id",
    params: new ParamsContext({ id: "alice" }),
    query: new QueryContext({ lang: "en" }),
  });

  assertEquals(received_ctx, expected);
});
