import { assertEquals } from "@std/assert/equals";
import { assertType, type IsExact } from "@std/testing/types";
import { link_generator } from "../src/v9_link_generator.ts";
import type { ExtractRouteData, FlatRoutes, RouteConfig } from "../src/mod.ts";

const route_config = {
	root: {
		path: "/",
	},
	with_name: {
		path: "/name",
	},
	nested: {
		path: "/nested",
		children: {
			deep: {
				path: "/deep",
			},
		},
	},
} as const satisfies RouteConfig;

Deno.test("FlatRoutes type", () => {
	type ExpectedFlatRoutes = {
		root: "/";
		with_name: "/name";
		nested: "/nested";
		"nested/deep": "/nested/deep";
	};

	assertType<IsExact<FlatRoutes<typeof route_config>, ExpectedFlatRoutes>>(
		true
	);
});

Deno.test("ExtractRouteData type", () => {
	type ExpectedExtractRouteData = {
		root: {
			path: "/";
			params: never;
			query: never;
		};
		with_name: {
			path: "/name";
			params: never;
			query: never;
		};
		nested: {
			path: "/nested";
			params: never;
			query: never;
		};
		"nested/deep": {
			path: "/nested/deep";
			params: never;
			query: never;
		};
	};
	assertType<
		IsExact<
			ExtractRouteData<FlatRoutes<typeof route_config>>,
			ExpectedExtractRouteData
		>
	>(true);
});

Deno.test("create_link_generator", () => {
	const link = link_generator(route_config);
	const path_to_root = link("root");
	const path_to_with_name = link("with_name");
	const path_to_nested = link("nested");
	const path_to_nested_deep = link("nested/deep");

	assertEquals(path_to_root, "/");
	assertEquals(path_to_with_name, "/name");
	assertEquals(path_to_nested, "/nested");
	assertEquals(path_to_nested_deep, "/nested/deep");
});
