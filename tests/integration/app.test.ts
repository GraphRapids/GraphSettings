import { describe, it, expect } from 'vitest';

const SERVICE_URL = process.env.SERVICE_URL ?? 'http://localhost:4173';

describe('Application serving', () => {
  it('serves index.html at the root path', async () => {
    const response = await fetch(`${SERVICE_URL}/`);

    expect(response.status).toBe(200);

    const contentType = response.headers.get('content-type');
    expect(contentType).toContain('text/html');

    const body = await response.text();
    expect(body.toLowerCase()).toContain('<!doctype html');
  });

  it('falls back to index.html for SPA routes', async () => {
    const response = await fetch(`${SERVICE_URL}/icon-sets`);

    expect(response.status).toBe(200);

    const contentType = response.headers.get('content-type');
    expect(contentType).toContain('text/html');

    const body = await response.text();
    expect(body.toLowerCase()).toContain('<!doctype html');
  });
});
