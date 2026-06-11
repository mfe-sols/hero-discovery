# React MFE Template

React single-spa template with UI Kit design system, shared theme sync (root-config), and MVP folders ready.

Placeholders:
- mfe-hero-discovery (e.g. catalog)
- mfe-sols (e.g. org)
- org-mfe-hero-discovery.js (e.g. org-mfe-hero-discovery.js)
- 9017 (e.g. 9001)
- __REQUIRE_AUTH__ (`true` or `false` — show auth gate when running standalone)

Structure:
- `src/root.component.tsx`: app shell + theme toggle + query provider
- `src/org-mfe-hero-discovery.tsx`: single-spa entry + early design-system CSS/token injection
- `src/mvp/`: model/presenter/usecase/service/view
- `src/types/`: IDE-only shims for template typing

React Query:
- `@tanstack/react-query` is pre-wired via `QueryClientProvider` in `src/root.component.tsx`
- Defaults live in `src/mvp/service/query-client.ts`

Steps:
1) Copy this folder into `apps/<new-react>`
2) Replace placeholders in all files
3) Install deps locally: `pnpm install`
4) Add import map + layout entries in root-config
   - Import map (local dev): `apps/root-config/src/index.ejs`
     - Tìm block `<script type="systemjs-importmap">` (local) và thêm:
       - `"@org/<app>": "//localhost:<port>/org-<app>.js"`
   - Layout: `apps/root-config/src/microfrontend-layout.html`
     - Thêm card + application, ví dụ:
       - `<section ... data-app="@org/<app>"><application name="@org/<app>"></application></section>`
   - Availability (optional, để status/monitor đúng): `apps/root-config/src/org-root-config.ts`
     - Thêm vào `localAppUrls`:
       - `"@org/<app>": "http://localhost:<port>/org-<app>.js"`
5) Add Nx project entry (or copy project.json below)

Run:
- Standalone (local only): `pnpm start`
- Standalone (no port override): `pnpm start:standalone`
- Under root-config (single-spa): run from repo root `pnpm start:react` (or add to import map and start root-config)

Notes:
- Template build output is SystemJS-compatible (safe for root-config import map).
- Standalone `public/index.html` also mounts via SystemJS to match production loading behavior.
- Vercel deploys are pinned to Node `20.x` and `npx pnpm@9` to avoid pnpm fetch/runtime issues such as `ERR_INVALID_THIS` on registry metadata requests.
- Set `NODE_AUTH_TOKEN` or `GITHUB_TOKEN` in Vercel with `read:packages` access so `@mfe-sols/*` packages can be installed from GitHub Packages.
