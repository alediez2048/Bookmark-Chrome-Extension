/**
 * Startup configuration. The server refuses to start without real secrets,
 * so a missing .env can never fall back to a guessable default.
 */

const PLACEHOLDER = /change-in-production|your-.*-here|your-admin-secret/i;

function requireSecret(name, minLength) {
  const value = process.env[name];
  if (!value || value.length < minLength || PLACEHOLDER.test(value)) {
    console.error(`${name} must be set to a random value of at least ${minLength} characters (see .env.example).`);
    process.exit(1);
  }
  return value;
}

const JWT_SECRET = requireSecret('JWT_SECRET', 32);
const ADMIN_SECRET = requireSecret('ADMIN_SECRET', 16);

// Comma-separated list of allowed web origins, e.g. https://retweet-filter.example.com.
// Requests from the Chrome extension itself (chrome-extension://...) are always allowed.
const CORS_ORIGINS = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const TOKEN_TTL = process.env.TOKEN_TTL || '30d';

module.exports = { JWT_SECRET, ADMIN_SECRET, CORS_ORIGINS, TOKEN_TTL };
