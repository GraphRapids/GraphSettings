import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const SERVICE_URL = process.env.SERVICE_URL || 'http://localhost:8080';

describe('Health endpoint', () => {
  it('GET /health returns 200 with JSON status ok', async () => {
    const response = await fetch(`${SERVICE_URL}/health`);

    assert.equal(response.status, 200);

    const contentType = response.headers.get('content-type');
    assert.ok(
      contentType && contentType.includes('application/json'),
      `Expected content-type to include application/json, got: ${contentType}`,
    );

    const body = await response.json();
    assert.deepStrictEqual(body, { status: 'ok' });
  });
});
