# Link generator

This is a simple link generator. It allows you to centrally manage link
generators.

## Features:

- **Simple**

Simply define a route configuration object and you are ready to go.

- **Type safety**

Parameters and search parameters can be extracted from strings contained in
paths using Typescript's type inference to enable type-safe link generation. In
addition, paths can contain special strings called condition fields. This allows
you to specify the type of the parameter as a string as well as a numeric type
or a string literal type that is a numeric literal type.

## Install

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

## Usage:

1. Defines a route configuration object

   ```ts
   const routeConfig = {
      home: {
         path:"/"
         },
      users: {
         path:"users/:userid"
         children: {
            posts: {
               path:"posts/:postid"
            },
         },
      }
   } as const satisfies RouteConfig;.
   ```

2. Flattens the routing object

   ```ts
   const flatRouteConfig = flattenRouteConfig(routeConfig);
   // ^
   // {
   //   home: "/", // users: "/users/:userid",
   //   users: "/users/:userid",
   //   "users/posts": "/users/:userid/posts/:postid"
   // }
   ```

3. Create a link generator

   ```ts
   const link = createLinkGenerator(flatConfig);
   ```

4. Generate link

   ```ts
   const rootpage = link("home"); // => '/'
   const userpage = link("users", { userid: "alice" }); // => '/users/alice'
   const postpage = link("users/posts", { userid: "alice", postid: "1" }); // => '/users/alice/posts/1'
   ```

## Advanced Topics:

### Query Parameters

To define the query parameter field, **write the path like this Remember to
prefix the query parameter with `/`!**

Example:

1. Defines a route configuration object

   ```ts
   const routeConfig = {
     posts: {
       path: "posts/:postid/?q=page",
     },
   } as const satisfies RouteConfig;
   ```

2. Create a link generator.

   ```ts
   const link = createLinkGenerator(flatConfig);
   ```

3. Generates a link.

   The final output from the link generator will be stripped of the `/` before the
   query parameter that was required when defining the path.

    ```ts
    const postpage = link(
    	'users/posts',
    	{ userid: 'alice', postid: '1' },
    	{ page: 10 }
    );
    // => '/users/alice/posts/1?q=page=10'
    ```

### Condition field

The type of values for path and query parameters is string|number by default.
While this is sufficient in most cases, this type can be made more strict by
defining a condition field. This is a special string that can be included in the
path, like `<Constraint>`. Conditions can be defined within open (`<`) and close
(`>`) mountain brackets. In this field, the following three type constraints can
be placed on path and query parameters

- **String type**

You can narrow down the id to a string type by defining a condition field with
the string as the condition followed by the parameter name, such as
`/:id<string>`.

- **Numumber type**

You can narrow down the id to a number type by defining a condition field with a
parameter name followed by the string number, as in `/:id<number>`.

- **String or number literal union type**

You can create a literal type for those values by writing `(Literal|Union)` for
the condition followed by the parameter and separated by the | sign, as in
`/id<(a|b|10)>`. If the value can be converted to a numeric value, it is
inferred as a numeric literal type.

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
     categories: {
       path: " categories/:categoryid<(a|b|10)>",
     },
   } as const satisfies RouteConfig;
   ```

2. Flattens the routing object

   ```ts
   const flatRouteConfig = flattenRouteConfig(routeConfig);
   ```

3. Create a link generator.

   ```ts
   const link = createLinkGenerator(flatConfig);
   ```

4. link is generated.

   You will notice that the userid value is of type string, the postid value is of
   type number, and the categoryid value is of type `'a'|'b'|10` union. You will
   notice that the value of categoryid is a union type of `'a'|'b'|10`.

    ```ts
    const userpage = link("users", { userid: "alice" }); // userid only accept string type!
    const postpage = link("posts", { postid: 1 }); // postid only accept number type!
    const categorypage = link("categories", { categoryid: 'a' }); // categoryid only accept 'a' or 'b' or 10!
    ```

### Absolute path

When defining an absolute path with a link beginning with a protocol, such as
http, you must prefix it with `*` before the key name of the top-level parent
element that has it. This distinguishes relative paths from absolute paths.

Example of use:

1. Defines a route configuration object

   ```ts
   const routeConfig = {
      "*external": {
         path:"https://"
         children: {
            youtube: {
               path:"youtube.com/:videoid"
            }
         }
      }
   } as const satisfies RouteConfig;
   ```

2. Flattens the routing object

   ```ts
   const flatRouteConfig = flattenRouteConfig(routeConfig);
   ```

3. Create a link generator.

   ```ts
   const link = createLinkGenerator(flatConfig);
   ```

4. Generate links.

   ```ts
   const youtubeLink = link("users", { videoid: "123" }); // https://youtube.com/123
   ```

## Licence

MIT
