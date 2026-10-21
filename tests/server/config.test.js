import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const CONFIG = require.resolve('../../server/config.js');

function loadConfig(env) {
  delete require.cache[CONFIG];
  Object.assign(process.env, env);
  return require(CONFIG);
}

describe('server config', () => {
  const saved = { ...process.env };
  let exit;

  beforeEach(() => {
    exit = vi.spyOn(process, 'exit').mockImplementation((code) => {
      throw new Error(`exit ${code}`);
    });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    delete process.env.JWT_SECRET;
    delete process.env.ADMIN_SECRET;
    delete process.env.CORS_ORIGINS;
  });

  afterEach(() => {
    process.env = { ...saved };
    vi.restoreAllMocks();
  });

  it('refuses to start without a JWT secret', () => {
    expect(() => loadConfig({ ADMIN_SECRET: 'a'.repeat(20) })).toThrow('exit 1');
    expect(exit).toHaveBeenCalledWith(1);
  });

  it('refuses the placeholder secrets from .env.example', () => {
    expect(() =>
      loadConfig({ JWT_SECRET: 'your-secret-key-change-in-production-xxxxxxxx', ADMIN_SECRET: 'b'.repeat(20) }),
    ).toThrow('exit 1');
  });

  it('refuses secrets that are too short', () => {
    expect(() => loadConfig({ JWT_SECRET: 'short', ADMIN_SECRET: 'b'.repeat(20) })).toThrow('exit 1');
  });

  it('accepts real secrets and parses CORS origins', () => {
    const config = loadConfig({
      JWT_SECRET: 'a'.repeat(40),
      ADMIN_SECRET: 'b'.repeat(20),
      CORS_ORIGINS: 'https://one.example, https://two.example',
    });
    expect(config.CORS_ORIGINS).toEqual(['https://one.example', 'https://two.example']);
    expect(config.TOKEN_TTL).toBe('30d');
  });
});
