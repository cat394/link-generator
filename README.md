# Link Generator

Create links from a route config with type-safe route IDs, params, and query
arguments.

This package is distributed through the JSR registry:
https://jsr.io/@kokomi/link-generator

## Installation

```bash
npx jsr add @kokomi/link-generator
```

## Basic usage

### 1. Define routes

```ts
import { link_generator, type RouteConfig } from "@kokomi/link-generator";

const route_config = {
  home: { path: "/" },
  users: {
    path: "/users",
    children: {
      user: { path: "/:id" },
    },
  },
  posts: { path: "/posts?page" },
} as const satisfies RouteConfig;
```

### 2. Create a generator

```ts
const link = link_generator(route_config);
```

### 3. Generate links

```ts
link("home"); // "/"
link("users"); // "/users"
link("users/user", { id: "alice" }); // "/users/alice"
link("posts", undefined, { page: 2 }); // "/posts?page=2"
```

## Query parameters

You can pass multiple query objects. They are merged in order.

`undefined` values are ignored.

```ts
const route_config = {
  products: { path: "/products?color&page" },
} as const satisfies RouteConfig;

const link = link_generator(route_config);

link("products", undefined, { color: "red" }, { page: 2 });
// "/products?color=red&page=2"
```

Repeated keys are kept.

```ts
link("products", undefined, { color: "red" }, { color: "blue" });
// "/products?color=red&color=blue"
```

## How a link is generated

The final URL is built in the following order:

1. **Resolve route**
   - The route ID is mapped to a path template.
   - Example: `"users/user"` → `"/users/:id"`

2. **Create context**
   - `RouteContext` is created with:
     - `path`
     - `params`
     - `query`

3. **Apply transforms**
   - Each function in `transforms` runs in order.
   - You can mutate `ctx.path`, `ctx.params`, and `ctx.query`.

4. **Replace path params**
   - `replace_params_fn(ctx)` is called.
   - Default: replaces `:param` with encoded values.

5. **Format query string**
   - `format_qs_fn(ctx)` is called.
   - Returns a string like `"a=1&b=2"` (without `?`).

6. **Combine**
   - If the query string is not empty, `"?"` is added.
   - Final result:
     ```
     path + "?" + query
     ```

### Minimal example

```ts
link("users/user", { id: "alice" }, { tab: "profile" });
```

Flow:

```
"/users/:id"
→ (transform)
→ "/users/:id"
→ (replace params)
→ "/users/alice"
→ (format query)
→ "tab=profile"
→ "/users/alice?tab=profile"
```

## Options

### `transforms`

`transforms` is a list of functions that run before the final URL is built.

Each transform receives a `RouteContext`. You can mutate `ctx.path`,
`ctx.params`, or `ctx.query`.

```ts
const route_config = {
  user: { path: "/users/:id" },
} as const satisfies RouteConfig;

const link = link_generator(route_config, {
  transforms: [
    (ctx) => {
      if (ctx.id === "user") {
        ctx.path = "/members/:id";
      }
    },
    (ctx) => {
      if (ctx.id === "user") {
        ctx.params.set("id", String(ctx.params.get("id")).toUpperCase());
      }
    },
  ],
});

link("user", { id: "alice" }); // "/members/ALICE"
```

Use `transforms` when you want small, reusable changes before parameter
replacement and query formatting.

### `replace_params_fn`

`replace_params_fn` replaces path parameters such as `:id`.

By default, the library uses `replace_params(ctx)`.

```ts
import {
  link_generator,
  replace_params,
  type RouteConfig,
} from "@kokomi/link-generator";

const route_config = {
  user: { path: "/users/:id" },
} as const satisfies RouteConfig;

const link = link_generator(route_config, {
  replace_params_fn: (ctx) => {
    if (ctx.id === "user") {
      return ctx.path.replace(":id", "bob");
    }

    return replace_params(ctx);
  },
});

link("user", { id: "alice" }); // "/users/bob"
```

Use this when you want full control over how path params are resolved.

### `format_qs_fn`

`format_qs_fn` returns the final query string without the leading `?`.

By default, the library uses `format_qs(ctx)`.

```ts
import {
  format_qs,
  link_generator,
  type RouteConfig,
} from "@kokomi/link-generator";

const route_config = {
  products: { path: "/products?color" },
} as const satisfies RouteConfig;

const link = link_generator(route_config, {
  format_qs_fn: (ctx) => {
    if (ctx.id === "products") {
      const qs = new URLSearchParams(ctx.query);
      const color = qs.get("color");

      if (color) {
        qs.set("color", color.toUpperCase());
      }

      qs.set("custom", "YES");
      return qs.toString();
    }

    return format_qs(ctx);
  },
});

link("products", undefined, { color: "red" });
// "/products?color=RED&custom=YES"
```

Use this when you want custom query-string rules.

## Context objects

### `ParamsContext`

`ParamsContext` is a `Map<string, DefaultParamValue>` for path params.

```ts
const params = new ParamsContext({ id: "alice" });

params.get("id"); // "alice"
```

### `QueryContext`

`QueryContext` is a `URLSearchParams` instance for query params.

It merges multiple query objects and stringifies values. `undefined` values are
skipped.

```ts
const query = new QueryContext({ lang: "en" }, { page: 2 });

query.get("lang"); // "en"
query.get("page"); // "2"
query.toString(); // "lang=en&page=2"
```

### `RouteContext`

`RouteContext` is passed to `transforms`, `replace_params_fn`, and
`format_qs_fn`.

It has these properties:

- `id`: flattened route ID such as `"users/user"`
- `path`: current path template
- `params`: `ParamsContext`
- `query`: `URLSearchParams`

```ts
const ctx = new RouteContext("users/user", {
  path: "/users/:id",
  params: new ParamsContext({ id: "alice" }),
  query: new QueryContext({ tab: "profile" }),
});
```

## Route flattening

Nested routes are flattened into slash-separated route IDs.

```ts
const route_config = {
  home: { path: "/" },
  users: {
    path: "/users",
    children: {
      user: { path: "/:id" },
    },
  },
} as const satisfies RouteConfig;

flatten_route_config(route_config);
// {
//   home: "/",
//   users: "/users",
//   "users/user": "/users/:id",
// }
```

## Notes

- Query parts written in route paths are used only as a declaration hint. They
  are removed from the stored path before link generation.
- Constraint sections in paths are also removed before parameter replacement.
- Path params are URL-encoded by the default `replace_params` function.
- Query params are stringified by the default `format_qs` function.

## License

MIT
