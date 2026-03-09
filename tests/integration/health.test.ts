import { describe, it, expect } from 'vitest';

const SERVICE_URL = process.env.SERVICE_URL ?? 'http://localhost:4173';

describe('GET /health', () => {
  it('returns 200 with JSON body {"status":"ok"}', async () => {
    const response = await fetch(`${SERVICE_URL}/health`);

    expect(response.status).toBe(200);

    const contentType = response.headers.get('content-type');
    expect(contentType).toContain('application/json');

    const body = await response.json();
    expect(body).toEqual({ status: 'ok' });
  });
});
