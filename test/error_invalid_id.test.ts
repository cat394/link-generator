import { assertThrows } from "@std/assert";
import { link_generator } from "../src/link_generator.ts";
import type { RouteConfig } from "../src/types.ts";

Deno.test("link throws an error for unknown route id", async (t) => {
  const route_config = {
    home: { path: "/" },
  } as const satisfies RouteConfig;
  const link = link_generator(route_config);

  await t.step("throws error for invalid route id", () => {
    assertThrows(
      () => link("nonexistent" as keyof typeof route_config),
      Error,
      "Invalid route id: nonexistent",
    );
  });

  await t.step("throws error for empty string route id", () => {
    assertThrows(
      () => link("" as keyof typeof route_config),
      Error,
      "Invalid route id: EMPTY_STRING",
    );
  });
});
