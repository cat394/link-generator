import { assertEquals } from "@std/assert/equals";
import { link_generator } from "../src/link_generator.ts";
import type { RouteConfig } from "../src/types.ts";

const route_config = {
	foo: {
		path: "/foo?a",
	},
} as const satisfies RouteConfig;

Deno.test("link_generator with should_append_query default", () => {
	const link = link_generator(route_config);
	const result = link("foo", undefined, { a: "value" });
	assertEquals(result, "/foo?a=value");
});

Deno.test("link_generator with should_append_query false", () => {
	const link = link_generator(route_config, { should_append_query: false });
	const result = link("foo", undefined, { a: "value" });
	assertEquals(result, "/foo");
});

Deno.test("link_generator with should_append_query true", () => {
	const link = link_generator(route_config, { should_append_query: true });
	const result = link("foo", undefined, { a: "value" });
	assertEquals(result, "/foo?a=value");
});

Deno.test("link_generator with should_append_query undefined", () => {
	const link = link_generator(route_config, { should_append_query: undefined });
	const result = link("foo", undefined, { a: "value" });
	assertEquals(result, "/foo?a=value");
});
