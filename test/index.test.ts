import { assertEquals } from "$std/assert/mod.ts";
import { describe, it } from "https://deno.land/std@0.224.0/testing/bdd.ts";
import {
  createLinkGenerator,
  type FlattenRouteConfig,
  flattenRouteConfig,
  type RouteConfig,
} from "../src/mod.ts";

const routeConfig = {
  home: {
    path: "/",
  },
  users: {
    path: "users/:userid",
    children: {
      posts: {
        path: "posts/:postid<number>",
      },
    },
  },
  dashboard: {
    path: "dashboard/projects/:projectid<string>",
  },
  posts: {
    path: "posts/:postid<number>",
  },
  books: {
    path: "books/:bookid?/?q=author?&genre?",
  },
  orders: {
    path: "orders/:orderid?",
  },
  categories: {
    path: "categories/:categoryid<(a|b|c)>",
  },
  products: {
    path: "products/?q=size<(small|medium|10)>&color",
  },
  "*external": {
    path: "https://",
    children: {
      x: {
        path: "x.com/:username",
      },
    },
  },
} as const satisfies RouteConfig;

const flatResult = {
  home: "/",
  users: "/users/:userid",
  "users/posts": "/users/:userid/posts/:postid<number>",
  dashboard: "/dashboard/projects/:projectid<string>",
  posts: "/posts/:postid<number>",
  orders: "/orders/:orderid?",
  categories: "/categories/:categoryid<(a|b|c)>",
  products: "/products/?q=size<(small|medium|10)>&color",
  books: "/books/:bookid?/?q=author?&genre?",
  "*external": "https://",
  "*external/x": "https://x.com/:username",
} as const satisfies FlattenRouteConfig<typeof routeConfig>;

Deno.test("flatten config function test", () => {
  const flatConfig = flattenRouteConfig(routeConfig);

  assertEquals(flatResult, flatConfig);
});

describe("generator function test", () => {
  const flatConfig = flattenRouteConfig(routeConfig);

  const link = createLinkGenerator(flatConfig);

  it("static path", () => {
    assertEquals("/", link("home"));
  });

  it("with params", () => {
    assertEquals("/users/alice", link("users", { userid: "alice" }));
  });

  it("with string params", () => {
    assertEquals(
      "/dashboard/projects/a",
      link("dashboard", { projectid: "a" }),
    );
  });

  it("with numeric params", () => {
    assertEquals("/posts/1", link("posts", { postid: 1 }));
  });

  describe("nested route", () => {
    it("all params are setted", () => {
      assertEquals(
        "/users/alice/posts/1",
        link("users/posts", { userid: "alice", postid: 1 }),
      );
    });

    it("single param is setted", () => {
      assertEquals("/users/alice/posts", link("users/posts", { userid: "alice" }));
    });
  });

  describe("with optional params", () => {
    it("no params", () => {
      assertEquals("/orders", link("orders"));
    });

    it("param arg is undefined", () => {
      assertEquals("/orders", link("orders", undefined));
    });

    it("param is undefined", () => {
      assertEquals("/orders", link("orders", { orderid: undefined }));
    });
  });

  it("union parameter", () => {
    assertEquals("/categories/a", link("categories", { categoryid: "a" }));
  });

  describe("with query params", () => {
    it("skip param filed", () => {
      assertEquals(
        "/products?q=size=small&color=red",
        link("products", null, { size: "small", color: "red" }),
      );
    });

    it("string search param is setted", () => {
      assertEquals(
        "/products?q=color=red",
        link("products", null, { color: "red" }),
      );
    });

    it("numeric search param is setted", () => {
      assertEquals(
        "/products?q=size=10",
        link("products", null, { size: 10 }),
      );
    });

    it("all search params are undefined", () => {
      assertEquals(
        "/books",
        link("books", null, { genre: undefined, author: undefined }),
      );
    });
  });

  it("external link", () => {
    assertEquals(
      "https://x.com/alice",
      link("*external/x", { username: "alice" }),
    );
  });
});
