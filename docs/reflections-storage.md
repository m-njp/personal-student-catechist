# Reflections storage

Reflections are saved on the server, so pupils write on their phones, the teacher reads on the laptop, and nothing is lost on reload.

```
useReflections -> HttpReflectionRepository -> /api/reflections -> Upstash Redis
   (browser)          (browser)                  (server)          (server)
```

The browser never talks to Redis. Only the API holds the secret.

- The screens use one `ReflectionRepository`, picked in `src/core/reflection/repository.ts`. Components reach it only through `useReflections`.
- `src/app/api/reflections/` is the only server code. `store.ts` picks the server's storage.
- `cleanReflection()` runs in the form and again in the API, so empty or too-long entries are refused with a readable message.
- The teacher's list refreshes itself, so entries from phones appear without a reload.
- To use another database, write a class that implements `ReflectionRepository`, return it from `getStore()`, and run it through `reflectionRepositoryContract` in a test.

## Connect Upstash (once)

1. In the Vercel project, add the **Upstash for Redis** integration and connect it to Production and Preview.
2. That sets `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` (`KV_REST_API_URL` and `KV_REST_API_TOKEN` also work).
3. Redeploy.

Until then the live site says "Reflections are not set up yet."

## Local development

Without settings, `npm run dev` keeps reflections in the dev server's memory. With a `.env` holding the variables above (it is never committed), it uses the real Redis, so remove your test entries afterwards.

## Privacy

The API has no login: anyone with the link can read a lesson's reflections and remove one, and pupil names are stored. A teacher-only login would close this; none is built yet.
