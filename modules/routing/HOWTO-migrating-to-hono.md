# How to migrate from Router to Hono

## Benefits of migrating handlers

- OpenAPI spec and docs UI at `/openapi.json` and `/docs` auto-generated from your routes
- Local development server via `pnpm local`
- better standardisation and testability on a commonly used platform

## Add dependencies

In `build.ts`, add the dependencies to your handler:
```ts
const updateSupporterPlusAmount: HandlerDefinition = {
    name: 'update-supporter-plus-amount',
    dependencies: {
        ...dep['@hono/zod-openapi'], // add this
    },
};
```
then run `pnpm snapshot:update`

## In your handler, Router(...) is now createHonoApp(...)

The Router is replaced by the "app" and each entry in the routes array is replaced by a Route which can be connected to the app.

Before
```ts
export const handler: Handler = Router([{ httpMethod: 'POST', path: '/my-route', handler: myHandler }]);
```
After
```ts
export const { app, handler } = createHonoApp('My API title');
```

`createHonoApp` gives you the Router functionality:
- Request/response logging middleware (equivalent to the `Router`'s `logger.wrapFn` wrapper)
- Centralised error handling: `ValidationError` → 400, everything else → 500 (similar to Router's try/catch)
- Standard validation error responses (see below, similar to existing `withBodyParser`)
- New: `/openapi.json` and `/docs` routes

## Defining routes

Rather than a single entry in an array, call Hono:
- `createRoute` to define the route shape
- `app.openapi` to connect the implementation

Before
```ts
{
  httpMethod: 'POST',
  path: '/my-route/{id}',
  handler: withBodyParser(mySchema, withPathParser(pathSchema, myHandler)),
}
```
After
```ts
// Define the shape of the route
const myRoute = createRoute({
  method: 'post',
  path: '/my-route/{id}',              // hono uses {param}, not :param in createRoute
  request: {
    params: z.object({ id: z.string() }),
    body: { required: true, content: { 'application/json': { schema: mySchema } } },
  },
  responses: {
    200: { description: '...', content: { 'application/json': { schema: responseSchema } } },
    400: { description: 'Validation error', content: { 'application/json': { schema: badRequestSchema } } },
    500: { description: 'Server error',     content: { 'application/json': { schema: errorSchema } } },
  },
});

// connect the implementation to the route
app.openapi(myRoute, async (c) => {
  const { id } = c.req.valid('param');   // replaces path parameter from withPathParser
  const body = c.req.valid('json');      // replaces body from withBodyParser
  // ...
  return c.json({ result: '...' }, 200);
});
```

## withBodyParser and withPathParser

`withBodyParser` and `withPathParser` are not needed with hono. The `defaultHook` registered
inside `createHonoApp` automatically returns a `400` with `{ error, details }` whenever request
validation fails, before the route handler is called. You pass zod schemas directly to `createRoute`.

## withMMAIdentityCheck

The existing `withMMAIdentityCheck` HOF passes `(body, zuoraClient, subscription, account)` as function
arguments. In hono, call `fetchSubscriptionWithIdentityCheck` directly inside the route handler.

Before
```ts
handler: withBodyParser(schema, withMMAIdentityCheck(stage, async (body, zuoraClient, subscription, account) => {
  // use body, zuoraClient, subscription, account here
}))
```
After
```ts
app.openapi(myRoute, async (c) => {
    const { subscriptionNumber } = c.req.valid('param');
    const requestBody = c.req.valid('json');
    const { zuoraClient, subscription, account } =
        await fetchSubscriptionWithIdentityCheck(
            stage,
            subscriptionNumber,
            c.req.header('x-identity-id'),
        );
    // call your business logic passing in zuoraClient, subscription, account
});
```

`fetchSubscriptionWithIdentityCheck` throws a `ValidationError` (→ 400) if `x-identity-id` is
present but doesn't match the subscription owner. Both that and any Zuora errors (→ 500) are
handled automatically by `createHonoApp`'s `onError` hook.

## Local development

(add local.ts manually - in future it will be managed by buildcheck)

Add a `src/local.ts` file:

```ts
import { serveLocally } from '@modules/routing/honoLocalServer';
import { app } from './index';

serveLocally(app, 8787);
```

And add a `local` script to your handler in `build.ts`, as per this example:

```ts
const updateSupporterPlusAmount: HandlerDefinition = {
    name: 'update-supporter-plus-amount',
    ...
    extraScripts: {
        local: 'STAGE=CODE tsx runManual/local.ts', // Add this line
    },
    ...
};
```
then run `pnpm snapshot:update` to refresh the package.json

Running `pnpm local` starts a local HTTP server, opens the try-it/docs UI in your browser, and
accesses CODE config and resources via janus credentials.
