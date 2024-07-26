![A purple-haired, pink-eyed character named Kokomi says, 'I wish broken links would just disappear from this world!'](https://github.com/cat394/link-generator/blob/main/images/thumbnail.webp)

# Link Generator

This simple link generator allows you to centrally manage links.

This is distributed through a package registry called
[JSR](https://jsr.io/@kokomi/link-generator).

## Features

- **Simple**

  Simply define a route configuration object and you are ready to go.

- **Type Safety**

  Extract parameters and search parameters from strings in paths using
  TypeScript's type inference for type-safe link generation. Paths can include
  condition fields to specify parameter types as strings, numeric types, or
  string literal types that are numeric literals

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
       path: "/users",
       children: {
         user: {
           path: "/:userid",
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
   //   users: "/user",
   //   "users/posts": "/users/:userid"
   // }
   ```

3. Create a link generator:

   ```ts
   const link = createLinkGenerator(flatRouteConfig);
   ```

4. Generate links:

   ```ts
   const rootPage = link("home"); // => '/'
   const usersPage = link("users"); // => '/users'
   const userPage = link("users", { userid: "alice" }); // => '/users/alice'
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
       path: "/posts/:postid/?page",
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
   // => '/users/alice/posts/1?page=10'
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
parameter name followed by the string `string`, as in `/:id<string>`.

- **Number type**

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
     user: {
       path: "/users/:userid<string>",
     },
     post: {
       path: "/post/:postid<number>",
     },
     news: {
       path: "/news/?is_archived<boolean>",
     },
     category: {
       path: "/categories/:categoryid<(a|10|false)>",
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

4. Generate link.

   You will notice that the userid value is of type `string`, the postid value
   is of type `number`, and the categoryid value is of type `'a'|10|false`
   union.

   The strings in each segment of a union type are automatically converted.

   ```ts
   const userpage = link("user", { userid: "alice" }); // userid only accept string type!
   const postpage = link("post", { postid: 1 }); // postid only accept number type!
   const newspage = link("news", undefined, { is_archived: true }); // is_archived search parameter only accept boolean type!
   const categorypage = link("category", { categoryid: "a" }); // categoryid only accept 'a' or 10 or false!
   ```

### Optional Type

Parameter value types are `string | number | boolean` by default.

If you want some parameter value to be optional (receive undefined), you can put
`?` after the parameter.

Example:

```ts
const routeConfig = {
  product: {
    path: "/products/:productid?",
  },
} as const satisfies RouteConfig;

// ... create a link generator

const productPage = link("product", { productid: undefined });
```

### Absolute Paths

Starting with version 3.0.0, absolute paths are resolved in a similar manner to
relative paths, which means that the `*` prefix that was previously required
when defining an absolute paths is no longer necessary.

**Absolute paths are specially type-handled so do not include a `/` in front of
the domain.**

Example:

```ts
const routeConfig = {
  external: {
    path: "https://",
    children: {
      youtube: {
        path: "youtube.com",
        children: {
          video: {
            path: "/watch?videoid",
          },
        },
      },
    },
  },
} as const satisfies RouteConfig;

// ... create a link generator

const youtubeLink = link("external/youtube/video", undefined, {
  videoid: "123",
});
// => 'https://youtube.com/watch?123'
```

## Route data Type

To extract the params and query of each route, use the `ExtractRouteData` type
as shown below.

```ts
const routeConfig = {
  user: {
    path: "users/:userid",
  },
  news: {
    path: "news/?is_archived<boolean>",
  },
};

const flatRouteConfig = flattenRouteConfig(routeConfig);

type RouteData = ExtractRouteData<typeof flatRouteConfig>;
// ^
// {
//     user: {
//         path: "users/:userid";
//         params: Record<"userid", DefaultParamValue>;
//         search: never;
//     };
//     news: {
//         path: "news/?is_archived<boolean>";
//         params: never;
//         search: Record<"is_archived", boolean>;
//     };
// }
```

## Concept:

Links are fragile, so calling them by unique route ids is essential instead of
hard-coding them. To ensure the uniqueness of route ids while creating them
efficiently, we use TypeScript's type checking with objects. Defining properties
with the same name at the same level of an object will cause a type error,
ensuring no overlapping route ids. Additionally, child route ids can be made
unique by prefixing them with the parent route id.

```ts
const obj = {
  routeid: {},

  // Type error! An object literal cannot have multiple properties with the same name.
  routeid: {},
};
```

By leveraging this, we can be confident that route ids do not overlap within the
same level of the object. Moreover, the uniqueness of child route ids can be
achieved by prefixing them with the parent route id. If the parent route id is
unique, the child route ids will also be unique by necessity.

```ts
const obj = {
  parent1: {
    children: {
      child1: {},
    },
  },

  parent2: {
    children: {
      child1: {},
    },
  },
};
```

The generated route ids would be:

- parent1
- parent1/child1
- parent2
- parent2/child1

This approach allows flexible creation of route ids while maintaining a broad
namespace.

## Acknowledgements

This project was inspired by and built upon the following project:

- [nanostores/router](https://github.com/nanostores/router) by
  [ai](https://github.com/ai)

We are grateful to the original authors for their hard work and contributions to
the open-source community.

## License

MIT
