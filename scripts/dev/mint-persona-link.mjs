#!/usr/bin/env node
/**
 * Signs in as one of the personas of `personas.json` and prints exactly one line on stdout:
 *
 *   - a dev-login persona:  `token=<jwt>`        (MJAPI `POST /auth/dev-login`, localhost only)
 *   - a magic-link persona: `url=<redemptionUrl>` (an invite issued by the `issuer` of `personas.json`)
 *
 * A magic link is minted by the `issuer` of `personas.json` (the local dev Owner): a dev-login token
 * for the issuer, then `POST /magic-link/create` with the persona's email, the Credentialing application and the
 * persona's role, looked up by name in the metadata MJAPI serves to the issuer (no hard-coded IDs).
 * Open the URL in a browser and press the interstitial's button to land in Explorer as that persona;
 * the link is single-use and expires in 8 hours.
 *
 * The module also exports the session helpers the isolation probe uses (`probe-isolation.mjs`).
 * It talks to MJAPI over HTTP and GraphQL only, never to the database, and prints no secrets other
 * than the one token or link it was asked for.
 *
 * Environment: `MJAPI_URL` (default http://localhost:4050). Reads `.env` at the repo root.
 *
 * Usage:
 *   pnpm run persona <name>        e.g. pnpm run persona applicant-a
 */
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..', '..');
const ENV_PATH = path.join(REPO_ROOT, '.env');
const PERSONAS_PATH = path.join(SCRIPT_DIR, 'personas.json');
const GRAPHQL_PROVIDER_SINGLETON_KEY = '___SINGLETON__GraphQLDataProvider';

if (existsSync(ENV_PATH) && typeof process.loadEnvFile === 'function') {
  process.loadEnvFile(ENV_PATH);
}

/** MJAPI's base URL, without a trailing slash. */
export const MJAPI_BASE_URL = (process.env.MJAPI_URL?.trim() || 'http://localhost:4050').replace(/\/+$/, '');

/**
 * @typedef {object} Persona
 * @property {string} email
 * @property {'dev-login' | 'magic-link'} signIn
 * @property {string} [role] the role a magic-link invite grants
 * @property {'world' | 'magic-link'} account who creates the account: the integration world, or the first redemption
 * @property {string} about
 */
/** @typedef {{ email: string; signIn: 'dev-login'; about: string }} Issuer the account that issues magic links */
/** @typedef {{ application: string; issuer: Issuer; personas: Record<string, Persona> }} PersonaFile */
/** @typedef {import('@memberjunction/graphql-dataprovider').GraphQLDataProvider} Session */
/** @typedef {{ Name: string; Email: string; Token: string; Provider: Session }} PersonaSession */
/**
 * @typedef {object} CreateInviteResponse the body of `POST /magic-link/create` (MagicLinkService.CreateInvite)
 * @property {boolean} success
 * @property {string} [inviteId]
 * @property {string} [redemptionUrl]
 * @property {string} [rawToken]
 * @property {string} [expiresAt]
 * @property {string} [error]
 * @property {'forbidden' | 'invalid_role' | 'invalid_redirect_url'} [errorCode]
 */
/**
 * @typedef {object} RedeemResponse the body of `POST /magic-link/redeem?format=json` (MagicLinkService.RedeemInvite)
 * @property {boolean} success
 * @property {string} [token]
 * @property {string} [applicationId]
 * @property {string} [applicationPath]
 * @property {string} [email]
 * @property {string} [error]
 * @property {string} [errorCode]
 */

const repoRequire = createRequire(path.join(REPO_ROOT, 'package.json'));
const testingRequire = createRequire(repoRequire.resolve('@memberjunction/testing-integration'));

/**
 * Imports a package resolved from `req` as an ESM module.
 * @param {NodeJS.Require} req
 * @param {string} pkg
 */
async function importFrom(req, pkg) {
  return import(pathToFileURL(req.resolve(pkg)).href);
}

/** Sends MJ's console output to stderr, so stdout carries only this script's own lines. */
export function RouteConsoleToStderr() {
  const toStderr = (/** @type {unknown[]} */ ...args) => console.error(...args);
  console.log = toStderr;
  console.info = toStderr;
  console.warn = toStderr;
  console.debug = toStderr;
}

/** `@memberjunction/core` as the repo resolves it (one physical copy across the workspace). */
export async function ImportMJ() {
  return importFrom(repoRequire, '@memberjunction/core');
}

/**
 * The credentialing contracts and client entity classes, as a browser loads them (the built
 * `Entities` and `Core` packages, by path: the repo root does not depend on them).
 */
export async function ImportCredentialing() {
  await import(pathToFileURL(path.join(REPO_ROOT, 'packages/Entities/dist/index.js')).href);
  return import(pathToFileURL(path.join(REPO_ROOT, 'packages/Core/dist/index.js')).href);
}

/** @returns {PersonaFile} */
export function LoadPersonas() {
  return JSON.parse(readFileSync(PERSONAS_PATH, 'utf8'));
}

/**
 * @param {string} name
 * @returns {Persona}
 */
function personaNamed(name) {
  const persona = LoadPersonas().personas[name];
  if (persona == null) {
    throw new Error(`Unknown persona '${name}'. Known: ${Object.keys(LoadPersonas().personas).join(', ')}`);
  }
  return persona;
}

/**
 * Posts JSON and returns the status and parsed body.
 * @template T
 * @param {string} route
 * @param {object} body
 * @param {string} [bearer]
 * @returns {Promise<{ status: number; body: T }>}
 */
async function postJson(route, body, bearer) {
  /** @type {Record<string, string>} */
  const headers = { 'Content-Type': 'application/json' };
  if (bearer) headers.Authorization = `Bearer ${bearer}`;
  const response = await fetch(`${MJAPI_BASE_URL}${route}`, { method: 'POST', headers, body: JSON.stringify(body) });
  return { status: response.status, body: /** @type {T} */ (await response.json()) };
}

/**
 * A dev-login JWT for `email`. Refuses an answer for any other user.
 * @param {string} email
 * @returns {Promise<string>}
 */
export async function DevLogin(email) {
  /** @type {{ status: number; body: { token?: string; error?: string; user?: { email?: string } } }} */
  const { status, body } = await postJson('/auth/dev-login', { email });
  if (status !== 200 || body.token == null) {
    throw new Error(`dev-login as ${email} failed (${status}): ${body.error ?? 'no token'}`);
  }
  if ((body.user?.email ?? '').toLowerCase() !== email.toLowerCase()) {
    throw new Error(`dev-login as ${email} answered for ${body.user?.email ?? 'nobody'}`);
  }
  return body.token;
}

/** @type {Session[]} */
const openSessions = [];

/**
 * A GraphQL session signed in with `token`: a GraphQLDataProvider with its own connection and the
 * metadata MJAPI serves to that user. The first one also becomes the process's global provider.
 * @param {string} token
 * @param {() => Promise<string>} refresh
 * @returns {Promise<Session>}
 */
async function openSession(token, refresh) {
  const { GraphQLDataProvider, GraphQLProviderConfigData, setupGraphQLClient } = await importFrom(testingRequire, '@memberjunction/graphql-dataprovider');
  const { LocalCacheManager, InMemoryLocalStorageProvider } = await ImportMJ();
  await import(pathToFileURL(repoRequire.resolve('@memberjunction/core-entities')).href);
  const config = new GraphQLProviderConfigData(token, `${MJAPI_BASE_URL}/`, '', refresh, '__mj');
  if (openSessions.length === 0) {
    await LocalCacheManager.Instance.Initialize(new InMemoryLocalStorageProvider(), { verboseLogging: false });
    const session = await setupGraphQLClient(config);
    openSessions.push(session);
    return session;
  }
  // GraphQLDataProvider is a global singleton; park the slot while constructing a second session.
  const { GetGlobalObjectStore } = await importFrom(repoRequire, '@memberjunction/global');
  const store = GetGlobalObjectStore();
  const singleton = store?.[GRAPHQL_PROVIDER_SINGLETON_KEY];
  if (store) delete store[GRAPHQL_PROVIDER_SINGLETON_KEY];
  /** @type {Session} */
  let session;
  try {
    session = new GraphQLDataProvider();
  } finally {
    if (store) store[GRAPHQL_PROVIDER_SINGLETON_KEY] = singleton;
  }
  if (!(await session.Config(config, undefined, true))) {
    throw new Error('the GraphQL session did not configure');
  }
  openSessions.push(session);
  return session;
}

/** Closes every session this process opened. */
export function CloseSessions() {
  for (const session of openSessions) {
    session.DisposeWebSocketResources();
  }
  openSessions.length = 0;
  issuerSession = null;
}

/**
 * A GraphQL session for any existing user, by dev-login.
 * @param {string} email
 * @returns {Promise<PersonaSession>}
 */
export async function OpenDevLoginSession(email) {
  const token = await DevLogin(email);
  const provider = await openSession(token, () => DevLogin(email));
  return { Name: email, Email: email, Token: token, Provider: provider };
}

/** @type {Session | null} the issuer's session, reused for every link this process mints */
let issuerSession = null;

/**
 * Issues a magic link for a magic-link persona as the issuer of `personas.json`.
 * @param {string} name
 * @returns {Promise<CreateInviteResponse & { redemptionUrl: string; rawToken: string }>}
 */
export async function MintMagicLink(name) {
  const file = LoadPersonas();
  const persona = personaNamed(name);
  if (persona.signIn !== 'magic-link' || persona.role == null) {
    throw new Error(`Persona '${name}' signs in by ${persona.signIn}, not by magic link`);
  }
  const issuerEmail = file.issuer.email;
  const issuerToken = await DevLogin(issuerEmail);
  issuerSession ??= await openSession(issuerToken, () => DevLogin(issuerEmail));
  const issuer = issuerSession;
  const application = issuer.Applications.find((a) => a.Name === file.application);
  const role = issuer.Roles.find((r) => r.Name === persona.role);
  if (application == null) throw new Error(`The application '${file.application}' is not in the metadata ${issuerEmail} receives`);
  if (role == null) throw new Error(`The role '${persona.role}' does not exist`);

  /** @type {{ status: number; body: CreateInviteResponse }} */
  const { status, body } = await postJson(
    '/magic-link/create',
    { email: persona.email, ApplicationId: application.ID, RoleId: role.ID, ExpiresInHours: 8, MaxUses: 1, SendEmail: false },
    issuerToken,
  );
  if (status !== 200 || !body.success || body.redemptionUrl == null) {
    throw new Error(`magic-link/create for ${persona.email} failed (${status} ${body.errorCode ?? ''}): ${body.error ?? 'no redemptionUrl'}`);
  }
  const rawToken = body.rawToken ?? new URL(body.redemptionUrl).searchParams.get('token');
  if (rawToken == null) throw new Error('magic-link/create returned no token');
  return { ...body, redemptionUrl: body.redemptionUrl, rawToken };
}

/**
 * Redeems an invite token as an API client and returns the session JWT.
 * @param {string} rawToken
 * @param {string} expectedEmail
 * @returns {Promise<string>}
 */
export async function RedeemMagicLink(rawToken, expectedEmail) {
  /** @type {{ status: number; body: RedeemResponse }} */
  const { status, body } = await postJson('/magic-link/redeem?format=json', { token: rawToken });
  if (status !== 200 || !body.success || body.token == null) {
    throw new Error(`magic-link/redeem failed (${status} ${body.errorCode ?? ''}): ${body.error ?? 'no token'}`);
  }
  if ((body.email ?? '').toLowerCase() !== expectedEmail.toLowerCase()) {
    throw new Error(`magic-link/redeem signed in ${body.email ?? 'nobody'}, expected ${expectedEmail}`);
  }
  return body.token;
}

/**
 * A GraphQL session as the persona: dev-login, or a magic link minted and redeemed.
 * @param {string} name
 * @returns {Promise<PersonaSession>}
 */
export async function OpenPersonaSession(name) {
  const persona = personaNamed(name);
  if (persona.signIn === 'dev-login') {
    const session = await OpenDevLoginSession(persona.email);
    return { ...session, Name: name };
  }
  const link = await MintMagicLink(name);
  const token = await RedeemMagicLink(link.rawToken, persona.email);
  const provider = await openSession(token, async () => token);
  return { Name: name, Email: persona.email, Token: token, Provider: provider };
}

/** CLI: `pnpm run persona <name>` prints `token=<jwt>` or `url=<redemptionUrl>`. */
async function main() {
  RouteConsoleToStderr();
  const name = process.argv.slice(2).find((a) => !a.startsWith('-'));
  if (!name) {
    console.error(`Usage: pnpm run persona <name>   (${Object.keys(LoadPersonas().personas).join(', ')})`);
    process.exit(2);
  }
  try {
    const persona = personaNamed(name);
    const line = persona.signIn === 'dev-login' ? `token=${await DevLogin(persona.email)}` : `url=${(await MintMagicLink(name)).redemptionUrl}`;
    process.stdout.write(`${line}\n`);
    CloseSessions();
    process.exit(0);
  } catch (e) {
    console.error(e instanceof Error ? e.message : String(e));
    CloseSessions();
    process.exit(1);
  }
}

if (process.argv[1] != null && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  await main();
}
