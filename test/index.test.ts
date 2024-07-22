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
    path: "/users/:userid",
    children: {
      posts: {
        path: "/posts/:postid<number>",
      },
    },
  },
  dashboard: {
    path: "/dashboard/projects/:projectid<string>",
  },
  posts: {
    path: "/posts/:postid<number>",
  },
  news: {
    path: "/news/?is_archived<boolean>",
  },
  orders: {
    path: "/orders/:orderid?",
  },
  categories: {
    path: "/categories/:categoryid<(a|b|c)>",
  },
  products: {
    path: "/products/search/?size<(small|10|false)>&color",
  },
  books: {
    path: "/books/search/?genre?&author?",
  },
  video: {
    path: "/video/watch/?q<string>",
  },
  external: {
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
  news: "/news/?is_archived<boolean>",
  orders: "/orders/:orderid?",
  categories: "/categories/:categoryid<(a|b|c)>",
  products: "/products/search/?size<(small|10|false)>&color",
  video: "/video/watch/?q<string>",
  books: "/books/search/?genre?&author?",
  "external": "https://",
  "external/x": "https://x.com/:username",
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

  it("with string param", () => {
    assertEquals(
      "/dashboard/projects/a",
      link("dashboard", { projectid: "a" }),
    );
  });

  it("with numeric param", () => {
    assertEquals("/posts/1", link("posts", { postid: 1 }));
  });

  it("with boolean param", () => {
    assertEquals(
      "/news?is_archived=true",
      link("news", null, { is_archived: true }),
    );
  });

  describe("nested route", () => {
    it("all params are setted", () => {
      assertEquals(
        "/users/alice/posts/1",
        link("users/posts", { userid: "alice", postid: 1 }),
      );
    });

    it("single param is setted", () => {
      assertEquals(
        "/users/alice/posts",
        link("users/posts", { userid: "alice" }),
      );
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
        "/products/search?size=small&color=red",
        link("products", null, { size: "small", color: "red" }),
      );
    });

    it("string search param is setted", () => {
      assertEquals(
        "/products/search?color=red",
        link("products", null, { color: "red" }),
      );
    });

    it("numeric search param is setted", () => {
      assertEquals(
        "/products/search?size=10",
        link("products", null, { size: 10 }),
      );
    });

    it("boolean search param is setted", () => {
      assertEquals(
        "/products/search?size=false",
        link("products", null, { size: false }),
      );
    });

    it("all search params are undefined", () => {
      assertEquals(
        "/books/search",
        link("books", null, { genre: undefined, author: undefined }),
      );
    });

    it("q search param is setted", () => {
      assertEquals("/video/watch?q=123", link("video", null, { q: "123" }));
    });
  });

  it("external link", () => {
    assertEquals(
      "https://x.com/alice",
      link("external/x", { username: "alice" }),
    );
  });
});
