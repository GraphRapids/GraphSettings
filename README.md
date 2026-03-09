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

## Docker

### Build the image

```bash
docker build -t graph-settings .
```

Override the API base URL at build time:

```bash
docker build --build-arg VITE_API_BASE_URL=http://my-api:8000 -t graph-settings .
```

### Run with Docker Compose

```bash
docker compose up --build
```

The service is available at `http://localhost:4173` by default. Override the host port:

```bash
GRAPH_SETTINGS_PORT=8080 docker compose up --build
```

### Exposed port

The container listens on port **8080** (nginx). Docker Compose maps it to host port **4173** by default.

### Health check

The service exposes a health check endpoint:

```
GET /health → 200 {"status":"ok"} (Content-Type: application/json)
```

Docker Compose includes a `healthcheck` directive that polls this endpoint so dependent services can use `depends_on: { condition: service_healthy }`.

## Integration Tests

Integration tests live in `tests/integration/` and run against a live instance of the service.

### Run integration tests

Start the service first:

```bash
docker compose up --build -d
```

Wait for the health check to pass, then run:

```bash
npx vitest run --config vitest.integration.config.ts
```

Override the service URL if needed:

```bash
SERVICE_URL=http://localhost:8080 npx vitest run --config vitest.integration.config.ts
```

Optionally add a convenience script to `package.json`:

```json
"test:integration": "vitest run --config vitest.integration.config.ts"
```

Then run:

```bash
npm run test:integration
```

Integration tests are hermetic — each test is self-contained and does not depend on pre-seeded data.

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
