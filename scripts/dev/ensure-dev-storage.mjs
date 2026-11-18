#!/usr/bin/env node
/**
 * Idempotently sets up evidence storage on a DEVELOPMENT instance: the `Credentialing Local Disk
 * Storage` driver (packages/Server/src/storage/LocalDiskFileStorage.ts) over a root directory.
 * This is instance configuration, not shipped metadata: a real host configures its own storage
 * account (Azure Blob, S3, ...) and names it in CREDENTIALING_EVIDENCE_STORAGE_ACCOUNT.
 *
 * It creates, through MJ entity objects as the system user (no raw DML):
 * - an `MJ: Credential Types` row `Credentialing Local Disk Storage` (category Storage) whose
 *   one field is `RootDirectory`;
 * - an `MJ: Credentials` row `Credentialing Evidence Local Disk` holding the root (encrypted by
 *   MJ's field-level encryption on save);
 * - an `MJ: File Storage Providers` row whose ServerDriverKey is the driver's registration key;
 * - an `MJ: File Storage Accounts` row (default name `Credentialing Evidence (Local Disk)`);
 * - one `MJ: File Storage Account Permissions` row granting the System user Read and Write. MJ
 *   Storage treats an account with NO permission rows as open to every signed-in user
 *   (StorageAccessEvaluator.ACCOUNT_WITHOUT_PERMISSION_ROWS_IS_OPEN), so this row is what closes the
 *   account. No credentialing role receives a permission row.
 *
 * It then writes CREDENTIALING_EVIDENCE_STORAGE_ACCOUNT and CREDENTIALING_EVIDENCE_STORE_ROOT into
 * the MJ checkout's gitignored `.env` (default `../mj/.env`), replacing only those two lines (or
 * appending them). Nothing of that file is printed. Restart MJAPI afterwards.
 *
 * Usage (the root must be an absolute path outside every repository; when neither --root nor
 * CREDENTIALING_EVIDENCE_STORE_ROOT is given, the root recorded in the MJ .env by an earlier run
 * is used, so a rebuilt database needs only `pnpm run dev:storage`):
 *   CREDENTIALING_EVIDENCE_STORE_ROOT=/abs/path pnpm run dev:storage
 *   node scripts/dev/ensure-dev-storage.mjs --root /abs/path [--account <name>] [--mj-env <path to MJ .env>]
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..', '..');
const ENV_PATH = path.join(REPO_ROOT, '.env');

const DRIVER_KEY = 'Credentialing Local Disk Storage';
const CREDENTIAL_TYPE_NAME = 'Credentialing Local Disk Storage';
const CREDENTIAL_NAME = 'Credentialing Evidence Local Disk';
const PROVIDER_NAME = 'Credentialing Local Disk';
const DEFAULT_ACCOUNT_NAME = 'Credentialing Evidence (Local Disk)';
const ACCOUNT_ENV = 'CREDENTIALING_EVIDENCE_STORAGE_ACCOUNT';
const ROOT_ENV = 'CREDENTIALING_EVIDENCE_STORE_ROOT';
const FIELD_SCHEMA = JSON.stringify({
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  title: 'Credentialing Local Disk Storage',
  description: 'Development-only local disk storage for credentialing evidence.',
  properties: {
    RootDirectory: { type: 'string', title: 'Root directory', description: 'Absolute path of the directory evidence files are kept under.', isSecret: false, order: 0 },
  },
  required: ['RootDirectory'],
});

if (!process.env.DB_DATABASE && existsSync(ENV_PATH) && typeof process.loadEnvFile === 'function') {
  process.loadEnvFile(ENV_PATH);
}

/**
 * The root this script wrote into the MJ `.env` on an earlier run, so a rebuild of the database
 * reuses it without the root being given again. Only that one line is read; nothing is printed.
 * @param {string} mjEnvPath
 * @returns {string}
 */
function rootRecordedIn(mjEnvPath) {
  if (!existsSync(mjEnvPath)) return '';
  const line = readFileSync(mjEnvPath, 'utf8')
    .split(/\r?\n/)
    .find((l) => l.startsWith(`${ROOT_ENV}=`));
  return line ? line.slice(ROOT_ENV.length + 1).trim().replace(/^(['"])(.*)\1$/, '$2') : '';
}

/**
 * @param {readonly string[]} argv
 * @returns {{ root: string; accountName: string; mjEnvPath: string }}
 */
function parseArgs(argv) {
  let root = process.env[ROOT_ENV]?.trim() ?? '';
  let accountName = DEFAULT_ACCOUNT_NAME;
  let mjEnvPath = path.resolve(REPO_ROOT, '..', 'mj', '.env');
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--root' && argv[i + 1]) root = argv[++i].trim();
    else if (argv[i] === '--account' && argv[i + 1]) accountName = argv[++i].trim();
    else if (argv[i] === '--mj-env' && argv[i + 1]) mjEnvPath = path.resolve(argv[++i].trim());
  }
  if (!root) {
    root = rootRecordedIn(mjEnvPath);
  }
  if (!root) {
    console.error(`Give the evidence root directory: --root <absolute path> or ${ROOT_ENV}=<absolute path>.`);
    process.exit(2);
  }
  if (!path.isAbsolute(root)) {
    console.error('The evidence root directory must be an absolute path.');
    process.exit(2);
  }
  const resolvedRoot = path.resolve(root);
  for (const repo of [REPO_ROOT, path.dirname(mjEnvPath)]) {
    if (resolvedRoot === repo || resolvedRoot.startsWith(`${repo}${path.sep}`)) {
      console.error('The evidence root directory must be outside every repository.');
      process.exit(2);
    }
  }
  return { root: resolvedRoot, accountName, mjEnvPath };
}

const { root, accountName, mjEnvPath } = parseArgs(process.argv.slice(2));
if (!existsSync(mjEnvPath)) {
  console.error(`The MJ .env file was not found (${mjEnvPath}); pass --mj-env.`);
  process.exit(2);
}

const repoRequire = createRequire(path.join(REPO_ROOT, 'package.json'));
const cliRequire = createRequire(repoRequire.resolve('@memberjunction/cli/package.json'));
const importFrom = async (req, pkg) => import(pathToFileURL(req.resolve(pkg)).href);

const { RunView, Metadata } = await importFrom(repoRequire, '@memberjunction/core');
const { UserCache } = await importFrom(cliRequire, '@memberjunction/generic-database-provider');
const { initializeProvider, cleanupProvider } = await importFrom(cliRequire, '@memberjunction/metadata-sync');

const dbHost = process.env.DB_HOST || 'localhost';
await initializeProvider({
  dbPlatform: 'sqlserver',
  dbHost,
  dbPort: Number(process.env.DB_PORT || 1433),
  dbDatabase: process.env.DB_DATABASE,
  dbUsername: process.env.CODEGEN_DB_USERNAME || process.env.DB_USERNAME,
  dbPassword: process.env.CODEGEN_DB_PASSWORD || process.env.DB_PASSWORD,
  dbEncrypt: process.env.DB_ENCRYPT === '1' || process.env.DB_ENCRYPT === 'true' || dbHost.includes('.database.windows.net') ? 'Y' : 'N',
  dbTrustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === '0' ? 'N' : 'Y',
  mjCoreSchema: process.env.MJ_CORE_SCHEMA || '__mj',
});

const quote = (value) => String(value).replace(/'/g, "''");

/**
 * The one entity object of `entityName` matching `filter`, or a new one filled by `fill` and saved.
 * @returns {Promise<{ entity: object; created: boolean }>}
 */
async function ensureRow(system, entityName, filter, fill) {
  const result = await new RunView().RunView({ EntityName: entityName, ExtraFilter: filter, ResultType: 'entity_object', MaxRows: 2 }, system);
  if (!result.Success) throw new Error(`Reading ${entityName} failed: ${result.ErrorMessage}`);
  if (result.Results.length > 1) throw new Error(`More than one ${entityName} row matches ${filter}; resolve that by hand.`);
  if (result.Results.length === 1) return { entity: result.Results[0], created: false };
  const entity = await new Metadata().GetEntityObject(entityName, system);
  entity.NewRecord();
  fill(entity);
  if (!(await entity.Save())) throw new Error(`Saving ${entityName} failed: ${entity.LatestResult?.CompleteMessage ?? 'unknown error'}`);
  return { entity, created: true };
}

/** Saves `entity` when `apply` changed it. */
async function updateIfChanged(entity, apply, label) {
  apply(entity);
  if (entity.Dirty && !(await entity.Save())) throw new Error(`Updating ${label} failed: ${entity.LatestResult?.CompleteMessage ?? 'unknown error'}`);
}

/** Replaces (or appends) only the `KEY=` lines named in `values`; prints nothing of the file. */
function setEnvLines(file, values) {
  const lines = readFileSync(file, 'utf8').split('\n');
  for (const [key, value] of Object.entries(values)) {
    const line = `${key}=${value}`;
    const index = lines.findIndex((l) => l.startsWith(`${key}=`));
    if (index >= 0) lines[index] = line;
    else {
      if (lines.length > 0 && lines[lines.length - 1] === '') lines.splice(lines.length - 1, 0, line);
      else lines.push(line);
    }
  }
  writeFileSync(file, lines.join('\n'));
}

try {
  const system = UserCache.Instance.GetSystemUser();
  if (!system) throw new Error('System user not found in UserCache; verify MJ core migrations ran.');
  mkdirSync(root, { recursive: true });

  const type = await ensureRow(system, 'MJ: Credential Types', `Name = '${quote(CREDENTIAL_TYPE_NAME)}'`, (t) => {
    t.Name = CREDENTIAL_TYPE_NAME;
    t.Description = 'Development-only local disk storage for credentialing evidence.';
    t.Category = 'Storage';
    t.FieldSchema = FIELD_SCHEMA;
  });
  const credential = await ensureRow(system, 'MJ: Credentials', `Name = '${quote(CREDENTIAL_NAME)}' AND CredentialTypeID = '${type.entity.ID}'`, (c) => {
    c.CredentialTypeID = type.entity.ID;
    c.Name = CREDENTIAL_NAME;
    c.Description = 'Root directory of the development evidence store.';
    c.Values = JSON.stringify({ RootDirectory: root });
    c.IsDefault = false;
    c.IsActive = true;
  });
  await updateIfChanged(credential.entity, (c) => {
    if (c.Values !== JSON.stringify({ RootDirectory: root })) c.Values = JSON.stringify({ RootDirectory: root });
  }, 'the credential');
  const provider = await ensureRow(system, 'MJ: File Storage Providers', `Name = '${quote(PROVIDER_NAME)}'`, (p) => {
    p.Name = PROVIDER_NAME;
    p.Description = 'Development-only local disk storage (Credentialing). Refuses to run when NODE_ENV is production.';
    p.ServerDriverKey = DRIVER_KEY;
    p.ClientDriverKey = DRIVER_KEY;
    p.Priority = 0;
    p.IsActive = true;
    p.SupportsSearch = false;
    p.RequiresOAuth = false;
  });
  const account = await ensureRow(system, 'MJ: File Storage Accounts', `Name = '${quote(accountName)}'`, (a) => {
    a.Name = accountName;
    a.Description = 'Credentialing evidence files on local disk (development).';
    a.ProviderID = provider.entity.ID;
    a.CredentialID = credential.entity.ID;
    a.IncludeInGlobalSearch = false;
  });
  const permission = await ensureRow(
    system,
    'MJ: File Storage Account Permissions',
    `FileStorageAccountID = '${account.entity.ID}' AND Type = 'User' AND UserID = '${system.ID}'`,
    (p) => {
      p.FileStorageAccountID = account.entity.ID;
      p.Type = 'User';
      p.UserID = system.ID;
      p.CanRead = true;
      p.CanWrite = true;
    },
  );

  setEnvLines(mjEnvPath, { [ACCOUNT_ENV]: accountName, [ROOT_ENV]: root });

  const said = (label, row) => console.log(`${row.created ? 'Created' : 'Found'} ${label} (${row.entity.ID}).`);
  said(`credential type '${CREDENTIAL_TYPE_NAME}'`, type);
  said(`credential '${CREDENTIAL_NAME}'`, credential);
  said(`storage provider '${PROVIDER_NAME}'`, provider);
  said(`storage account '${accountName}'`, account);
  said('System-user permission row on the account', permission);
  console.log(`Set ${ACCOUNT_ENV} and ${ROOT_ENV} in the MJ .env. Restart MJAPI (servers.sh restart api).`);
} finally {
  await cleanupProvider?.();
}
