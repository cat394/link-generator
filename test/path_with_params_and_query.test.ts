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
		path: "/:param?key",
	},
	with_name: {
		path: "/name/:param?key",
	},
	nested: {
		path: "/nested",
		children: {
			deep: {
				path: "/deep/:child-param?key",
			},
		},
	},
	nested_with_parent_param: {
		path: "/nested/:parent-param?parent-key",
		children: {
			deep: {
				path: "/deep/:child-param?child-key",
			},
		},
	},
} as const satisfies RouteConfig;

const flat_route_config = flatten_route_config(route_config);

Deno.test("FlatRoutes type", () => {
	type ExpectedFlatRoutes = {
		root: "/:param?key";
		with_name: "/name/:param?key";
		nested: "/nested";
		"nested/deep": "/nested/deep/:child-param?key";
		nested_with_parent_param: "/nested/:parent-param?parent-key";
		"nested_with_parent_param/deep": "/nested/:parent-param/deep/:child-param?child-key";
	};

	assertType<IsExact<FlatRoutes<typeof route_config>, ExpectedFlatRoutes>>(
		true
	);
});

Deno.test("ExtractRouteData type", () => {
	type ExpectedExtractRouteData = {
		root: {
			path: "/:param";
			params: Record<"param", DefaultParamValue>;
			query: Partial<Record<"key", DefaultParamValue>>;
		};
		with_name: {
			path: "/name/:param";
			params: Record<"param", DefaultParamValue>;
			query: Partial<Record<"key", DefaultParamValue>>;
		};
		nested: {
			path: "/nested";
			params: never;
			query: never;
		};
		"nested/deep": {
			path: "/nested/deep/:child-param";
			params: Record<"child-param", DefaultParamValue>;
			query: Partial<Record<"key", DefaultParamValue>>;
		};
		nested_with_parent_param: {
			path: "/nested/:parent-param";
			params: Record<"parent-param", DefaultParamValue>;
			query: Partial<Record<"parent-key", DefaultParamValue>>;
		};

		"nested_with_parent_param/deep": {
			path: "/nested/:parent-param/deep/:child-param";
			params: Record<"child-param", DefaultParamValue> &
				Record<"parent-param", DefaultParamValue>;
			query: Partial<Record<"child-key", DefaultParamValue>>;
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
		root: "/:param?key",
		with_name: "/name/:param?key",
		nested: "/nested",
		"nested/deep": "/nested/deep/:child-param?key",
		nested_with_parent_param: "/nested/:parent-param?parent-key",
		"nested_with_parent_param/deep":
			"/nested/:parent-param/deep/:child-param?child-key",
	} as const satisfies FlatRoutes<typeof route_config>;

	assertEquals(flat_route_config, expected_flat_route_config);
});

Deno.test("create_link_generator", async (t) => {
	const link = create_link_generator(flat_route_config);

	await t.step("string params and query", () => {
		const path_to_root = link("root", { param: "a" }, { key: "b" });
		const path_to_with_name = link("with_name", { param: "a" }, { key: "b" });
		const path_to_nested = link("nested");
		const path_to_nested_deep = link(
			"nested/deep",
			{ "child-param": "a" },
			{ key: "b" }
		);
		const path_to_nested_with_parent_param = link(
			"nested_with_parent_param",
			{
				"parent-param": "a",
			},
			{ "parent-key": "b" }
		);
		const path_to_nested_deep__with_parent_param = link(
			"nested_with_parent_param/deep",
			{ "parent-param": "a", "child-param": "b" },
			{ "child-key": "c" }
		);

		assertEquals(path_to_root, "/a?key=b");
		assertEquals(path_to_with_name, "/name/a?key=b");
		assertEquals(path_to_nested, "/nested");
		assertEquals(path_to_nested_deep, "/nested/deep/a?key=b");
		assertEquals(path_to_nested_with_parent_param, "/nested/a?parent-key=b");
		assertEquals(
			path_to_nested_deep__with_parent_param,
			"/nested/a/deep/b?child-key=c"
		);
	});

	await t.step("number params and string query", () => {
		const path_to_root = link("root", { param: 1 }, { key: "a" });
		const path_to_with_name = link("with_name", { param: 1 }, { key: "a" });
		const path_to_nested = link("nested");
		const path_to_nested_deep = link(
			"nested/deep",
			{ "child-param": 1 },
			{ key: "a" }
		);
		const path_to_nested_with_parent_param = link(
			"nested_with_parent_param",
			{
				"parent-param": 1,
			},
			{ "parent-key": "a" }
		);
		const path_to_nested_deep__with_parent_param = link(
			"nested_with_parent_param/deep",
			{ "parent-param": 1, "child-param": 2 },
			{ "child-key": "a" }
		);
		const path_to_root_with_falsy_param_value = link(
			"root",
			{ param: 0 },
			{ key: "a" }
		);

		assertEquals(path_to_root, "/1?key=a");
		assertEquals(path_to_with_name, "/name/1?key=a");
		assertEquals(path_to_nested, "/nested");
		assertEquals(path_to_nested_deep, "/nested/deep/1?key=a");
		assertEquals(path_to_nested_with_parent_param, "/nested/1?parent-key=a");
		assertEquals(
			path_to_nested_deep__with_parent_param,
			"/nested/1/deep/2?child-key=a"
		);
		assertEquals(path_to_root_with_falsy_param_value, "/0?key=a");
	});

	await t.step("boolean params and string query", () => {
		const path_to_root = link("root", { param: true }, { key: "a" });
		const path_to_with_name = link("with_name", { param: true }, { key: "a" });
		const path_to_nested = link("nested");
		const path_to_nested_deep = link(
			"nested/deep",
			{ "child-param": true },
			{ key: "a" }
		);
		const path_to_nested_with_parent_param = link(
			"nested_with_parent_param",
			{ "parent-param": true },
			{ "parent-key": "a" }
		);
		const path_to_nested_deep_with_parent_param = link(
			"nested_with_parent_param/deep",
			{ "parent-param": true, "child-param": false },
			{ "child-key": "a" }
		);

		assertEquals(path_to_root, "/true?key=a");
		assertEquals(path_to_with_name, "/name/true?key=a");
		assertEquals(path_to_nested, "/nested");
		assertEquals(path_to_nested_deep, "/nested/deep/true?key=a");
		assertEquals(path_to_nested_with_parent_param, "/nested/true?parent-key=a");
		assertEquals(
			path_to_nested_deep_with_parent_param,
			"/nested/true/deep/false?child-key=a"
		);
	});

	await t.step("string params and number query", () => {
		const path_to_root = link("root", { param: "a" }, { key: 1 });
		const path_to_with_name = link("with_name", { param: "a" }, { key: 1 });
		const path_to_nested = link("nested");
		const path_to_nested_deep = link(
			"nested/deep",
			{ "child-param": "a" },
			{ key: 1 }
		);
		const path_to_nested_with_parent_param = link(
			"nested_with_parent_param",
			{ "parent-param": "a" },
			{ "parent-key": 1 }
		);
		const path_to_nested_deep_with_parent_param = link(
			"nested_with_parent_param/deep",
			{ "parent-param": "a", "child-param": "b" },
			{ "child-key": 1 }
		);
		const path_to_root_with_falsy_query_value = link(
			"root",
			{ param: "a" },
			{ key: 0 }
		);

		assertEquals(path_to_root, "/a?key=1");
		assertEquals(path_to_with_name, "/name/a?key=1");
		assertEquals(path_to_nested, "/nested");
		assertEquals(path_to_nested_deep, "/nested/deep/a?key=1");
		assertEquals(path_to_nested_with_parent_param, "/nested/a?parent-key=1");
		assertEquals(
			path_to_nested_deep_with_parent_param,
			"/nested/a/deep/b?child-key=1"
		);
		assertEquals(path_to_root_with_falsy_query_value, "/a?key=0");
	});

	await t.step("string params and boolean query", () => {
		const path_to_root = link("root", { param: "a" }, { key: true });
		const path_to_with_name = link("with_name", { param: "a" }, { key: true });
		const path_to_nested = link("nested");
		const path_to_nested_deep = link(
			"nested/deep",
			{ "child-param": "a" },
			{ key: true }
		);
		const path_to_nested_with_parent_param = link(
			"nested_with_parent_param",
			{ "parent-param": "a" },
			{ "parent-key": true }
		);
		const path_to_nested_deep_with_parent_param = link(
			"nested_with_parent_param/deep",
			{ "parent-param": "a", "child-param": "b" },
			{ "child-key": true }
		);
		const path_to_root_with_falsy_query_value = link(
			"root",
			{ param: "a" },
			{ key: false }
		);

		assertEquals(path_to_root, "/a?key=true");
		assertEquals(path_to_with_name, "/name/a?key=true");
		assertEquals(path_to_nested, "/nested");
		assertEquals(path_to_nested_deep, "/nested/deep/a?key=true");
		assertEquals(path_to_nested_with_parent_param, "/nested/a?parent-key=true");
		assertEquals(
			path_to_nested_deep_with_parent_param,
			"/nested/a/deep/b?child-key=true"
		);
		assertEquals(path_to_root_with_falsy_query_value, "/a?key=false");
	});
});
