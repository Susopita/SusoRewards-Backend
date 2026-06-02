import { describe, it, expect } from 'vitest';
import { buildServer } from '../src/infrastructure/web/server.js';

describe('Server Health Check', () => {
  it('should return health status', async () => {
    const server = buildServer();
    const response = await server.inject({
      method: 'GET',
      url: '/health'
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({
      status: 'OK',
      service: 'afiliados'
    });
  });
});
