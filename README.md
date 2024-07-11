![A purple-haired, pink-eyed character named Kokomi says, 'I wish broken links would just disappear from this world!'](https://github.com/cat394/link-generator/blob/main/images/thumbnail.webp)

# Link Generator

This is a simple link generator that allows you to centrally manage link
generators.

Details of this package are available at
[JSR](https://jsr.io/@kokomi/link-generator).

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

### Search Parameters

To define the search parameter field, write the path like this **Remember to
prefix the query parameter with `/`!**

Example:

1. Defines a route configuration object:

   ```ts
   const routeConfig = {
     posts: {
       path: "posts/:postid/?q=page",
     },
   } as const satisfies RouteConfig;
   ```

2. Create a link generator:

   ```ts
   const link = createLinkGenerator(flatRouteConfig);
   ```

3. Generates a link:

   The final output from the link generator will be stripped of the `/` before
   the query parameter that was required when defining the path.

   ```ts
   const postpage = link("posts", { postid: "1" }, { page: 10 });
   // => '/users/alice/posts/1?q=page=10'
   ```

### Constraint Fields

The type of values for path and query parameters is `string|number|boolean` by
default. While this is sufficient in most cases, this type can be made more
strict by defining a **constraint field**. This is a special string that can be
included in the path, like `<Constraint>`. Conditions can be defined within open
(`<`) and close (`>`) mountain brackets. In this field, the following three type
constraints can be placed on path and query parameters:

- **String type**

You can narrow down the id to a string type by defining a condition field with a
parameter name followed by the string `string`, as in `/:id<number>`.

- **Numumber type**

You can narrow down the id to a number type by defining a condition field with a
parameter name followed by the string `number`, as in `/:id<number>`.

- **Boolean type**

You can narrow down the id to a boolean type by defining a condition field with
a parameter name followed by the string `boolean`, as in `/:id<boolean>`.

- **String or Number literal union type**

You can create a literal type for those values by writing `(Literal|Union)` for
the condition followed by the parameter and separated by the `|` sign, as in
`/id<(a|b|10)>`. If the value can be converted to a numeric value, it is
inferred as a numeric literal type. To define the query parameter for a route,
add a `query` property to the route configuration object. The query property
should be an object with keys as query parameter names and values as types.

Example:

1. Define a route configuration object with condition fields defined in the
   path.

   ```ts
   const routeConfig = {
     users: {
       path: "users/:userid<string>",
     },
     posts: {
       path: "posts/:postid<number>",
     },
     news: {
       path: "news/?q=is_archived<boolean>",
     },
     categories: {
       path: "categories/:categoryid<(a|b|10)>",
     },
   } as const satisfies RouteConfig;
   ```

2. Flattens the routing object

   ```ts
   const flatRouteConfig = flattenRouteConfig(routeConfig);
   ```

3. Create a link generator.

   ```ts
   const link = createLinkGenerator(flatRouteConfig);
   ```

4. link is generated.

   You will notice that the userid value is of type string, the postid value is
   of type number, and the categoryid value is of type `'a'|'b'|10` union. You
   will notice that the value of categoryid is a union type of `'a'|'b'|10`.

   ```ts
   const userpage = link("users", { userid: "alice" }); // userid only accept string type!
   const postpage = link("posts", { postid: 1 }); // postid only accept number type!
   const newspage = link("news", null, { is_archived: true }); // is_archived query parameter only accept boolean type!
   const categorypage = link("categories", { categoryid: "a" }); // categoryid only accept 'a' or 'b' or 10!
   ```

### Optional Type

When a path parameter or query parameter value is set to `null` or `undefined`,
the part of the path it falls under is completely omitted. This property can be
used to avoid nesting when the same query parameter is taken in both the parent
and child paths. If the query parameter exists, the second argument of the link
function will also accept `null`.

Example:

```ts
const routeConfig = {
  products: {
    path: "products/:productid?/?q=size&color",
  },
} as const satisfies RouteConfig;

// ... create a link generator

const productPage = link("products", null, { size: "large" });
// => '/products?q=size=large'
```

### Absolute Path

When defining an absolute path with a link beginning with a protocol, such as
`https`, you must prefix it with `*` before the key name of the top-level parent
element that has it. This distinguishes relative paths from absolute paths.

Example:

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

// ... create a link generator

const youtubeLink = link("*external/youtube", { videoid: "123" });
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
