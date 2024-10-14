# Link Generator

![A purple-haired, pink-eyed character named Kokomi says, 'I wish broken links would just disappear from this world!'](https://github.com/cat394/link-generator/blob/main/images/thumbnail.webp)

A simple type-safe generator for creating links.

This is distributed through a package registry called
[JSR](https://jsr.io/@kokomi/link-generator).

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

## Constraint Area

The type of values for path and query parameters is `string|number|boolean` by
default. While this is sufficient in most cases, this type can be made more
strict by defining a **constraint area**. This is a special string that can be
included in the path, like `<Constraint>`. Conditions can be defined within open
(`<`) and close (`>`) mountain brackets. In this field, the following three type
constraints can be placed on path and query parameters:

- **String Type**

  You can narrow down the id to a string type by defining a condition field with
  a parameter name followed by the string `string`, as in `/:id<string>`.

- **Number Type**

  You can narrow down the id to a number type by defining a condition field with
  a parameter name followed by the string `number`, as in `/:id<number>`.

- **Boolean Type**

  You can narrow down the id to a boolean type by defining a condition field
  with a parameter name followed by the string `boolean`, as in `/:id<boolean>`.

- **Union Type**

  If you want to be strict and require that params and query only accept certain
  values ​​other than string, number, and boolean, use the `<(Type1|Type2)>`
  syntax.

  The type of each segment of a union type defaults to its string literal type,
  but you can manually cast strings that can be converted to a number, such as
  1, or to a Boolean, such as true or false, or strings that represent types
  such as string, number, or boolean. To do this, simply prepend `*` to the
  string you want to cast, for example `*123`, `*true`, or `*string`.

1. Create a generator:

   ```ts
   const route_config = {
     user: {
       path: "/users/:id<string>",
     },
     post: {
       path: "/post/:id<number>",
     },
     category: {
       path: "/categories/:id<(a|*10|*false)>",
     },
     news: {
       path: "/news?archived<boolean>",
     },
     image: {
       path: "/image?width<(auto|*number)>",
     },
   } as const satisfies RouteConfig;

   const flat_route = flatten_route_config(route_config);

   const link = create_link_generator(flat_route);
   ```

2. Generate links:

   ```ts
   link("user", { id: "alice" });
   // Param type: { id: string }

   link("post", { id: 1 });
   // Param type: { id: number }

   link("category", { id: "a" });
   // Param type: { id: 'a' | 10 | false }

   link("news", undefined, { archived: true });
   // Query type: { archived: boolean }

   link("image", undefined, { width: "auto" });
   // Query type: { width: 'auto' | number }
   ```

## Absolute Paths

If the link you want to generate contains a protocol, special type inference
needs to be done, so write the protocol and domain like this, with the protocol
ending in `://` and no `/` before the domain:

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

The inferred type for each route can be obtained using the `ExtractRouteData`
type.

```ts
const route_config = {
  user: {
    path: "/users/:id",
  },
  news: {
    path: "/news?archived<boolean>",
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

This project was inspired by
[nanostores/router](https://github.com/nanostores/router).

## License

MIT
