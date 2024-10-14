![A purple-haired, pink-eyed character named Kokomi says, 'I wish broken links would just disappear from this world!'](https://github.com/cat394/link-generator/blob/main/images/thumbnail.webp)

# Link Generator

This simple link generator allows you to centrally manage links.

This is distributed through a package registry called
[JSR](https://jsr.io/@kokomi/link-generator).

## Features

- **Simple**

  Simply define a route configuration object and you are ready to go.

- **Type Safety**

  It uses TypeScript type inference to generate type-safe links, and also allows you to strongly type parameters and queries.
  Also, it only does the bare minimum of type inference to provide
  strong type safety, so type inference will never slow down your project.

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
   import {
     create_link_generator,
     flatten_route_config,
     type RouteConfig,
   } from "@kokomi/link-generator";

   const route_config = {
     home: {
       path: "/",
     },
     users: {
       path: "/users",
       children: {
         user: {
           path: "/:id",
         },
       },
     },
   } as const satisfies RouteConfig;
   ```

2. Flatten the object:

   ```ts
   const flat_route = flatten_route_config(route_config);
   // {
   //   home: "/",
   //   users: "/users",
   //   "users/user": "/users/:id"
   // }
   ```

3. Create a generator:

   ```ts
   const link = create_link_generator(flat_route);
   ```

4. Generate links:

   ```ts
   link("home"); // => '/'
   link("users"); // => '/users'
   link("users/user", { id: "alice" }); // => '/users/alice'
   ```

## Query

1. Create a generator:

   ```ts
   const route_config = {
     post: {
       path: "/posts/:id?page",
     },
   } as const satisfies RouteConfig;

   const flat_route = flatten_route_config(route_config);

   const link = create_link_generator(flat_route);
   ```

2. Generate a link:

   ```ts
   link("post", { id: "1" }, { page: 10 }); // => '/posts/1?page=10'
   ```

## Constraint Fields

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

- **Union type**

If you want to be strict and require that params and query only accept certain
values ​​other than string, number, and boolean, use the `<(Type1|Type2)>` syntax.

> If you specify a basic type such as `<(string|number)>`, it will become a
> string union type such as `"string" | "number"`. Strings that can be converted
> to `true`, `false`, or `number` types will be automatically converted.

Example:

1. Create a generator:

   ```ts
   const route_config = {
     user: {
       path: "/users/:id<string>",
     },
     post: {
       path: "/post/:id<number>",
     },
     news: {
       path: "/news?archived<boolean>",
     },
     category: {
       path: "/categories/:id<(a|10|false)>",
     },
   } as const satisfies RouteConfig;

   const flat_route = flatten_route_config(route_config);

   const link = create_link_generator(flat_route);
   ```

2. Generate links:

   You will notice that the userid value is of type `string`, the postid value
   is of type `number`, and the categoryid value is of type `'a'|10|false`
   union.

   The strings in each segment of a union type are automatically converted.

   ```ts
   link("user", { id: "alice" }); // id only accept string type!

   link("post", { id: 1 }); // id only accept number type!

   link("news", undefined, { archived: true }); // archived only accept boolean type!

   link("category", { id: "a" }); // id only accept 'a' or 10 or false!
   ```

## Absolute Paths

Absolute paths are specially type-handled so **do not include a `/` in front of
the domain**.

```ts
const route_config = {
  external: {
    path: "https://",
    children: {
      youtube: {
        path: "youtube.com",
        children: {
          video: {
            path: "/watch?v",
          },
        },
      },
    },
  },
} as const satisfies RouteConfig;

const flat_route = flatten_route_config(route_config);

const link = create_link_generator(flat_route);

link("external/youtube/video", undefined, { v: "123" });
// => 'https://youtube.com/watch?v=123'
```

## Route Type

The inferred type for each route can be obtained using the `ExtractRouteData` type.

```ts
const route_config = {
  user: {
    path: "/users/:id"
  },
  news: {
    path: "/news?archived<boolean>"
  },
} as const satisfies RouteConfig;

const flat_route = flatten_route_config(route_config);

type RouteType = ExtractRouteData<typeof flat_route>;
// {
//     user: {
//         path: "/users/:id";
//         params: Record<"id", DefaultParamValue>;
//         query: never;
//     };
//     news: {
//         path: "/news";
//         params: never;
//         query: Record<"archived", boolean>;
//     };
// }
```

## Concept

Links are fragile, so calling them by unique route ids is essential instead of
hard-coding them. To ensure the uniqueness of route ids while creating them
efficiently, we use TypeScript's type checking with objects. Defining properties
with the same name at the same level of an object will cause a type error,
ensuring no overlapping route ids. Additionally, child route ids can be made
unique by prefixing them with the parent route id.

```ts
const obj = {
  route1: {},

  // Type error! An object literal cannot have multiple properties with the same name.
  route1: {},
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

- [nanostores/router](https://github.com/nanostores/router)

We are grateful to the original authors for their hard work and contributions to
the open-source community.

## License

MIT
