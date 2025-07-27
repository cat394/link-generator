import { assertThrows } from "@std/assert";
import { link_generator } from "../src/link_generator.ts";
import type { RouteConfig } from "../src/types.ts";

Deno.test("link throws an error for unknown route id", () => {
	const route_config = {
		home: { path: "/" },
	} as const satisfies RouteConfig;

	const link = link_generator(route_config);
	assertThrows(
		// @ts-expect-error: this is to test invalid route id
		() => link("nonexistent" as unknown),
		Error,
		"Invalid route id: nonexistent"
	);
});
