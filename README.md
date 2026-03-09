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

### Build and Run

Build the Docker image:

```bash
docker compose build
```

Start the service:

```bash
docker compose up -d
```

The service is available at `http://localhost:8080` by default.

To use a different host port (e.g. to avoid collisions when running multiple GraphRapids services):

```bash
GRAPH_SETTINGS_PORT=9080 docker compose up -d
```

To build with a custom API base URL (embedded at build time for the SPA):

```bash
VITE_API_BASE_URL=https://api.example.com docker compose build
```

### Exposed Port

The container listens on port **8080** (nginx). This is mapped to the host via the `GRAPH_SETTINGS_PORT` environment variable (default: `8080`).

### Health Check

The service exposes a health check endpoint at:

```
GET /health → 200 {"status": "ok"} (Content-Type: application/json)
```

This is the standard contract across all GraphRapids services. Docker Compose is configured with a `healthcheck` directive that polls this endpoint, enabling `depends_on: { condition: service_healthy }` in orchestration.

### Dockerfile Details

The Dockerfile uses a multi-stage build:

1. **Builder stage** (`node:20-alpine`): installs dependencies via `npm ci`, builds the Vite SPA
2. **Runtime stage** (`nginx:1.27-alpine`): copies only the built static assets, runs as non-root `nginx` user

No secrets or credentials are stored in the image. The `VITE_API_BASE_URL` build argument controls which backend URL is embedded in the SPA (default: `http://127.0.0.1:8000`).

## Integration Tests

Integration tests live in `tests/integration/` and run against a live instance of the service. They are separate from unit tests and e2e tests.

### Prerequisites

Start the service first:

```bash
docker compose up -d
```

Wait for the health check to pass:

```bash
docker compose ps   # status should show "healthy"
```

### Run

```bash
npx vitest run --config vitest.integration.config.ts
```

Or with a custom service URL:

```bash
SERVICE_URL=http://localhost:9080 npx vitest run --config vitest.integration.config.ts
```

The `SERVICE_URL` environment variable defaults to `http://localhost:8080`.

### What is tested

- `GET /health` returns `200` with `{"status": "ok"}` and correct content type
- Health endpoint responds within 500ms
- SPA index page is served at `/`
- Unknown routes fall back to `index.html` (SPA routing)
- Gzip encoding is supported

All tests are hermetic — they do not create, modify, or depend on shared mutable state.

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
