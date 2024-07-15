![A purple-haired, pink-eyed character named Kokomi says, 'I wish broken links would just disappear from this world!'](https://github.com/cat394/link-generator/blob/main/images/thumbnail.webp)

# Link Generator

This is a simple link generator that allows you to centrally manage link
generators.

This is distributed through a package registry called
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
parameter name followed by the string `string`, as in `/:id<string>`.

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
       path: "categories/:categoryid<(a|10|false)>",
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

   You will notice that the userid value is of type `string`, the postid value
   is of type `number`, and the categoryid value is of type `'a'|10|false`
   union.

   The strings in each segment of a union type are automatically converted.

   ```ts
   const userpage = link("users", { userid: "alice" }); // userid only accept string type!
   const postpage = link("posts", { postid: 1 }); // postid only accept number type!
   const newspage = link("news", null, { is_archived: true }); // is_archived query parameter only accept boolean type!
   const categorypage = link("categories", { categoryid: "a" }); // categoryid only accept 'a' or 10 or false!
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

## Route data Type

To extract the params and query of each route, use the `ExtractRouteData` type
as shown below.

```ts
const routeConfig = {
  users: {
    path: "users/:userid",
  },
  news: {
    path: "news/?q=is_archived<boolean>",
  },
};

const flatRouteConfig = flattenRouteConfig(routeConfig);

type RouteData = ExtractRouteData<typeof flatRouteConfig>;
// ^
// {
//     users: {
//         path: "users/:userid";
//         params: Record<"userid", DefaultParameterType>;
//         search: never;
//     };
//     news: {
//         path: "news/?q=is_archived<boolean>";
//         params: never;
//         search: Record<"is_archived", boolean>;
//     };
// }
```

## Concept:

Links are fragile. Therefore, it is essential to call them by unique names
(route ids) rather than hard-coding them.

However, thinking about route ids can be tedious and boring. How can we ensure
the uniqueness of route ids while creating them efficiently?

We utilized TypeScript's type checking with objects. In TypeScript, trying to
define properties with the same name at the same level of an object will cause a
type error.

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

The route ids generated by this object would be as follows:

- parent1
- parent1/child1
- parent2
- parent2/child1

This approach allows for the creation of route ids flexibly while maintaining a
broad namespace.

## Acknowledgements

This project was inspired by and built upon the following project:

- [nanostores/router](https://github.com/nanostores/router) by
  [ai](https://github.com/ai)

We are grateful to the original authors for their hard work and contributions to
the open-source community.

## License

MIT
