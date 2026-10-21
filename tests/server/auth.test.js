import { beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const SECRET = 'a'.repeat(40);

let auth;
let jwt;

beforeAll(() => {
  process.env.JWT_SECRET = SECRET;
  process.env.ADMIN_SECRET = 'b'.repeat(20);
  delete require.cache[require.resolve('../../server/config.js')];
  delete require.cache[require.resolve('../../server/middleware/auth.js')];
  auth = require('../../server/middleware/auth.js');
  jwt = require('jsonwebtoken');
});

function run(authorization) {
  const req = { headers: authorization ? { authorization } : {} };
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };
  const next = vi.fn();
  auth(req, res, next);
  return { req, res, next };
}

describe('auth middleware', () => {
  it('rejects a request with no bearer token', () => {
    const { res, next } = run();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects a token signed with another secret', () => {
    const forged = jwt.sign({ userId: 1 }, 'not-the-server-secret');
    const { res, next } = run(`Bearer ${forged}`);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('reports an expired token as expired', () => {
    const expired = jwt.sign({ userId: 1, exp: Math.floor(Date.now() / 1000) - 60 }, SECRET);
    const { res } = run(`Bearer ${expired}`);
    expect(res.json).toHaveBeenCalledWith({ error: 'Token expired' });
  });

  it('accepts a valid token and attaches the user', () => {
    const token = jwt.sign({ userId: 42, username: 'alex' }, SECRET);
    const { req, next } = run(`Bearer ${token}`);
    expect(next).toHaveBeenCalled();
    expect(req.user).toMatchObject({ userId: 42, username: 'alex' });
  });
});
