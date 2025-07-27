# Link Generator

![A purple-haired, pink-eyed character named Kokomi says, 'I wish broken links would just disappear from this world!'](https://github.com/cat394/link-generator/blob/main/images/thumbnail.webp)

Creates links type-safely.

This package distributed through a package registry called the
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
   import { link_generator, type RouteConfig } from "@kokomi/link-generator";

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

2. Create a generator:

   ```ts
   const link = link_generator(route_config);
   ```

3. Generate links:

   ```ts
   link("home"); // => '/'
   link("users"); // => '/users'
   link("users/user", { id: "alice" }); // => '/users/alice'
   ```

## Query

The link function accepts a list of objects as query parameter generators,
starting from the second argument onward. In other words, the types of the
arguments from the second position onward in the `link` function are any number
of `Partial<Query>` types.

Moreover, if the object for setting query parameters contains an empty string or
an `undefined`, the `link` function will not generate that query.

1. Create a generator:

   ```ts
   const route_config = {
     products: {
       path: "/products?color",
     },
   } as const satisfies RouteConfig;

   const link = link_generator(route_config);
   ```

2. Generate links:

   ```ts
   link("products", undefined, { color: "red" }, { color: "blue" }); // => '/products?color=red&color=blue'

   link("products", undefined, { color: "" }, { color: undefined }); // => /products
   ```

## Options

The `link_generator` function also accepts an optional options object as its
second argument.

### should_append_query

A boolean that specifies whether encoded query string should be appended to the
final link. This option is especially useful when combined with the transform
option to ensure that custom paths are preserved or enhanced with query strings
as needed. Default is `true`.

```ts
const route_config = {
  products: {
    path: "/products?size",
  },
};

const link = link_generator(route_config, { should_append_query: false });

link("products", undefined, { size: "sm" }); // => /products (no size query string!)
```

### transform

The `transform` option allows you to intercept and customize the generated path
before it is finalized. It accepts a callback function that receives a
`RouteContext` object containing detailed information such as the route ID,
current path, params, and query values.

The function should return either:

- a `string` representing the custom path to use, or

- `undefined` to indicate that the generator should fall back to the default
  `ctx.path`.

This makes it easy to override only specific cases while preserving the default
behavior for others.

If `should_append_query` is `true`, then any query string will still be appended
to the returned string (whether from `transform` or fallback). To prevent this,
you can set `should_append_query: false`.

This option is useful when you want to customize routing logic, apply
conditional rewrites, or insert static shortcuts programmatically.

```ts
const route_config = {
  products: {
    path: "/products?size",
  },
};

const link = link_generator(route_config, {
  transform: (ctx) => {
    const { id, path, params, query } = ctx;

    if (query.size) {
      return "/custom";
    }
  },
  should_append_query: false,
});

link("products"); // => /products
link("products", { size: "sm" }); // => /custom
```

## Errors

If you pass a route ID that is not defined in your route configuration, the
`link` function will throw an error at runtime. If you pass an empty string as
the first argument, it will throw an error with the message:
`Invalid route id: EMPTY_STRING`.

```ts
const route_config = {
  home: { path: "/" },
} as const satisfies RouteConfig;

const link = link_generator(route_config);

link("nonexistent"); // ❌ Throws: Error: Invalid route id: nonexistent
link(""); // ❌ Throws: Error: Invalid route id: EMPTY_STRING
```

## Constraint Area

The type of values for path and query parameters is `string|number|boolean` by
default. While this is sufficient in most cases, this type can be made more
strict by defining a **constraint area**. This is a special string that can be
included in the path, like `<Constraint>`. Conditions can be defined within
opening (`<`) and closing (`>`) angle brackets. In this field, the following
three type constraints can be placed on path and query parameters:

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
  values other than string, number, and boolean, use the `<(Type1|Type2)>`
  syntax.

  The type of each segment of a union type defaults to its string literal type,
  but you can manually cast strings that can be converted to a `number`, such as
  1, or to `boolean`, such as `true` or `false`, or strings that represent types
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

   const link = link_generator(route_config);
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

## URL

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

const link = link_generator(route_config);

link("external/youtube/video", undefined, { v: "123" });
// => 'https://youtube.com/watch?v=123'
```

## Route Type

In this library, you can obtain detailed type information for each route using
the `ExtractRouteData` type.

In addition, the `FlatRoutes` type is provided to flatten your nested route
configuration into an object where each key represents a unique route ID and the
value is the corresponding path.

For example, consider the following route configuration:

```ts
import type { FlatRoutes, RouteConfig } from "@kokomi/link-generator";

const route_config = {
  users: {
    path: "/users",
    children: {
      user: {
        path: "/:id",
      },
    },
  },
} as const satisfies RouteConfig;

type Flattened = FlatRoutes<typeof route_config>;
```

The `Flattened` type then looks like this:

```ts
{
  users: "/users",
  "users/user": "/users/:id"
}
```

This flattening mechanism makes it easier to manage nested routes by ensuring
the uniqueness of route IDs and combining the nested paths in a predictable
manner.

Furthermore, the `ExtractRouteData` type leverages these flattened routes to
extract additional type information such as parameters and query types. For
example:

```ts
const route_config = {
  user: {
    path: "/users/:id",
  },
  news: {
    path: "/news?archived<boolean>",
  },
} as const satisfies RouteConfig;

type RouteData = ExtractRouteData<FlatRoutes<typeof route_config>>;
// {
//     user: {
//         path: "/users/:id";
//         params: Record<"id", DefaultParamValue>;
//         query: never;
//     };
//     news: {
//         path: "/news";
//         params: never;
//         query: Partial<Record<"archived", boolean>>;
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

This approach enables flexible route ID creation while ensuring uniqueness
across a wide namespace.

## Acknowledgements

This project was inspired by
[nanostores/router](https://github.com/nanostores/router).

## License

MIT
