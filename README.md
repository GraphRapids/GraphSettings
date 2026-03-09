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

## Docker

The service is containerised using a multi-stage Dockerfile (Node.js builder → nginx runtime).

**Exposed port: 8080**

### Build the image

```bash
docker build -t graph-settings .
```

### Run the container

```bash
docker run -p 8080:8080 graph-settings
```

### Using Docker Compose

```bash
docker compose up --build
```

To override the host port, set `GRAPH_SETTINGS_PORT`:

```bash
GRAPH_SETTINGS_PORT=3000 docker compose up --build
```

### Health check

The service exposes a health endpoint for readiness checks:

```
GET /health
```

Returns `200 OK` with `Content-Type: application/json`:

```json
{ "status": "ok" }
```

This contract is standard across all GraphRapids services.

## Integration Tests

Integration tests run against a live instance of the service. They live under `tests/integration/` and are separate from unit tests.

### Prerequisites

- Node.js 20+
- A running instance of GraphSettings (e.g. via Docker Compose)

### Run

```bash
# Start the service
docker compose up --build -d

# Wait for healthy status
docker compose ps  # check health column

# Run integration tests
node --test tests/integration/*.test.mjs

# Tear down
docker compose down
```

The `SERVICE_URL` environment variable controls which instance the tests target (defaults to `http://localhost:8080`):

```bash
SERVICE_URL=http://localhost:3000 node --test tests/integration/*.test.mjs
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
