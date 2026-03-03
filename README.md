# GraphSettings Admin and Widgets

React + TypeScript GraphSettings UI toolkit built with React Admin and a typed OpenAPI client.
It now supports:

- a full admin app widget (`GraphSettingsAppWidget`)
- domain widgets (`IconSetWidget`, `LayoutSetWidget`, `LinkSetWidget`, `GraphTypeWidget`, `ThemeWidget`)
- a shared core admin shell (`GraphSettingsAdminShell`)

## Scope

This app intentionally supports only these resources:

- `icon-sets`
- `layout-sets`
- `link-sets`
- `graph-types`
- `themes`

Out-of-scope endpoints (including `default` and non-listed sections) are not implemented.

## Prerequisites

- Node.js 20+
- npm 10+
- GraphAPI running locally at `http://127.0.0.1:8000`

## Setup

```bash
npm install
cp .env.example .env
```

## OpenAPI Source of Truth

The OpenAPI spec is stored locally at:

- `openapi/openapi.json`

Regenerate it from the running backend:

```bash
npm run openapi:download
```

Generate TypeScript types from the local file:

```bash
npm run openapi:generate
```

Do both in one step:

```bash
npm run openapi:refresh
```

The app uses `src/api/generated/schema.ts` generated from the local spec.

## Run (Standalone)

```bash
npm run dev
```

Default API base URL is `http://127.0.0.1:8000` via `VITE_API_BASE_URL`.

Widget mode can also be previewed from the standalone app via URL query:

- `/?widget=all`
- `/?widget=icon-sets`
- `/?widget=layout-sets`
- `/?widget=link-sets`
- `/?widget=graph-types`
- `/?widget=themes`

## Test

```bash
npm run test
```

## E2E Test (Playwright)

Install browser once:

```bash
npm run test:e2e:install
```

Run e2e:

```bash
npm run test:e2e
```

## Lint

```bash
npm run lint
```

## Build

```bash
npm run build
```

## Storybook

Run Storybook locally:

```bash
npm run storybook
```

Build static Storybook:

```bash
npm run storybook:build
```

Stories cover:

- full app widget
- icon sets widget
- layout sets widget
- link sets widget
- graph types widget
- themes widget

## Notes

- Full CRUD is enabled for `icon-sets`, `layout-sets`, `link-sets`, `graph-types`, and `themes` (including delete).
- Show pages include operation panels for the remaining in-scope APIs such as:
  - bundle retrieval
  - publish
  - entries/variables read+upsert+delete
  - graph-type runtime
  - icon-set resolve
- API validation and error responses are normalized into React Admin-friendly errors, including field-level messages when provided by the backend.
- Shared core and widgets are exported from `src/index.ts` for embedding in other React apps.
