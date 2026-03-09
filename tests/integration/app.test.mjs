import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const SERVICE_URL = process.env.SERVICE_URL || 'http://localhost:8080';

describe('Application serving', () => {
  it('GET / returns 200 with HTML content', async () => {
    const response = await fetch(`${SERVICE_URL}/`);

    assert.equal(response.status, 200);

    const contentType = response.headers.get('content-type');
    assert.ok(
      contentType && contentType.includes('text/html'),
      `Expected content-type to include text/html, got: ${contentType}`,
    );

    const body = await response.text();
    assert.ok(
      body.includes('<!doctype html>') || body.includes('<!DOCTYPE html>'),
      'Expected response to contain DOCTYPE declaration',
    );
  });

  it('GET /unknown-route returns 200 with HTML (SPA fallback)', async () => {
    const response = await fetch(
      `${SERVICE_URL}/unknown-route-${Date.now()}`,
    );

    assert.equal(response.status, 200);

    const contentType = response.headers.get('content-type');
    assert.ok(
      contentType && contentType.includes('text/html'),
      `Expected SPA fallback to serve HTML, got: ${contentType}`,
    );
  });
});
