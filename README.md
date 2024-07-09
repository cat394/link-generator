# Link Generator

This is a simple link generator that allows you to centrally manage link
generators.

Details of this package are available at [JSR](https://jsr.io/@kokomi/link-generator).

## Features

- **Simple**

  Simply define a route configuration object and you are ready to go.

- **Type Safety**

  Parameters and search parameters can be extracted from strings contained in
  paths using TypeScript's type inference to enable type-safe link generation.
  Additionally, paths can contain special strings called condition fields. This
  allows you to specify the type of the parameter as a string, numeric type, or
  string literal type that is a numeric literal type.

## Installation

NPM:

```bash
npx jsr add @kokomi/link-generator
```

PNPM:

```bash
pnpm dlx jsr add @kokomi/link-generator
```

Deno:

```bash
deno add @kokomi/link-generator
```

Yarn:

```bash
yarn dlx jsr add @kokomi/link-generator
```

Bun:

```bash
bunx jsr add @kokomi/link-generator
```

## Usage

1. Define a route configuration object:

   ```ts
   const routeConfig = {
     home: {
       path: "/",
     },
     users: {
       path: "users/:userid",
       children: {
         posts: {
           path: "posts/:postid",
         },
       },
     },
   } as const satisfies RouteConfig;
   ```

2. Flatten the routing object:

   ```ts
   const flatRouteConfig = flattenRouteConfig(routeConfig);
   // {
   //   home: "/",
   //   users: "/users/:userid",
   //   "users/posts": "/users/:userid/posts/:postid"
   // }
   ```

3. Create a link generator:

   ```ts
   const link = createLinkGenerator(flatRouteConfig);
   ```

4. Generate links:

   ```ts
   const rootPage = link("home"); // => '/'
   const userPage = link("users", { userid: "alice" }); // => '/users/alice'
   const postPage = link("users/posts", { userid: "alice", postid: "1" }); // => '/users/alice/posts/1'
   ```

## Advanced Topics

### Query Parameters

To define the query parameter for a route, add a `query` property to the route
configuration object. The query property should be an object with keys as query
parameter names and values as types.

Example:

```ts
const routeConfig = {
  categories: {
    path: "categories/:categoryid",
    query: {
      filter: "string",
      sort: "string",
    },
  },
} as const satisfies RouteConfig;
```

### Optional Type

When a path parameter or query parameter value is set to `null` or `undefined`,
the part of the path it falls under is completely omitted. This property can be
used to avoid nesting when the same query parameter is taken in both the parent
and child paths. If the query parameter exists, the second argument of the link
function will also accept `null`.

Example usage:

```ts
const routeConfig = {
  products: {
    path: "products/:productid?/?q=size&color",
  },
} as const satisfies RouteConfig;

// ... flatten route config

const productPage = link("products", null, { size: "large" });
// => '/products?q=size=large'
```

### Absolute Path

When defining an absolute path with a link beginning with a protocol, such as
`http`, you must prefix it with `*` before the key name of the top-level parent
element that has it. This distinguishes relative paths from absolute paths.

Example of use:

Define a route configuration object:

```ts
const routeConfig = {
  "*external": {
    path: "https://",
    children: {
      youtube: {
        path: "youtube.com/:videoid",
      },
    },
  },
} as const satisfies RouteConfig;

// ... flatten route config

const youtubeLink = link("external/youtube", { videoid: "123" });
// => 'https://youtube.com/123'
```

## Acknowledgements

This project was inspired by and built upon the following project:

- [nanostores/router](https://github.com/nanostores/router) by
  [ai](https://github.com/ai)

We are grateful to the original authors for their hard work and contributions to
the open-source community.

## License

MIT
