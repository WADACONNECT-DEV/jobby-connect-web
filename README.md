# Jobby-Connect Web

The Jobby-Connect web frontend — React + TypeScript, built with Vite.
Talks to the Spring Boot API (`jobby-connect-api`).

---

## One-time setup

1. **Install Node.js** (version 18 or newer) from https://nodejs.org — the LTS
   installer. This gives you `node` and `npm`. Restart your terminal afterwards
   and check it worked:

   ```bash
   node --version
   npm --version
   ```

2. **Install the project's dependencies** — from this folder:

   ```bash
   npm install
   ```

   This downloads React, Vite and everything else into a `node_modules` folder
   (git-ignored). You only re-run it when dependencies change.

---

## Running it (for the demo)

You need **two things running** at once:

1. **The backend** — start `jobby-connect-api` in Eclipse as usual
   (it listens on `http://localhost:8080`).
2. **The frontend** — in this folder:

   ```bash
   npm run dev
   ```

Then open the URL it prints, usually:

```
http://localhost:5173
```

You'll see the Jobby-Connect landing page. Registering or logging in calls the
real backend and writes to your Postgres database — same as before, just with a
proper React UI.

> **Why no CORS setup?** The Vite dev server proxies every `/api` request to
> `localhost:8080` (see `vite.config.ts`), so the browser only ever talks to one
> origin. Nothing to configure on the Spring side. Just make sure the backend is
> running before you sign in.

---

## Layout

```
src/
  main.tsx          app entry — mounts React, Router and AuthProvider
  App.tsx           routes + header
  index.css         all styling (Jobby-Connect navy/amber theme)
  api.ts            fetch wrapper + token storage
  auth.tsx          AuthProvider, useAuth() hook, RequireAuth guard
  types.ts          shared TypeScript types (User, Role, AuthResponse)
  pages/
    Landing.tsx     public landing page
    Register.tsx    create account
    Login.tsx       log in
    Home.tsx        authenticated dashboard (feature tiles)
```

## How it hangs together

- **`auth.tsx`** holds the logged-in user in React state and the JWT in
  `localStorage`. On page load it calls `/api/v1/me` to resume the session.
- **`RequireAuth`** wraps protected routes — no user means redirect to `/login`.
- **`api.ts`** attaches the `Authorization: Bearer <token>` header automatically.
- Adding a new screen = a new file in `pages/` + a `<Route>` in `App.tsx`.

---

## Next steps

- Build the **post-a-job** flow (Phase 2): a new `pages/PostJob.tsx`, a job form,
  and the matching backend endpoints. This is the first real marketplace screen.
- Later: production build with `npm run build` (outputs static files to `dist/`),
  served either from a CDN or from Spring. At that point the API needs a proper
  CORS policy or same-origin hosting — a small backend change we'll make then.
