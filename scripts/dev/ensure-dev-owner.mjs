#!/usr/bin/env node
/**
 * Idempotently provisions the local development Owner user (`admin@memberjunction.org`),
 * baseline roles (`Developer`, `Integration`, `UI`), and optionally its `MJ: User Applications`
 * grant for `Credentialing` using MJ entity objects (`Metadata.GetEntityObject`).
 *
 * Reads database settings from `.env` in the repo root (same file used by `mj:migrate`,
 * `mj:codegen`, and `mj sync push`). Never uses raw SQL DML and prints no secrets.
 *
 * Usage:
 *   pnpm run dev:owner
 *   node scripts/dev/ensure-dev-owner.mjs [--email <email>] [--app <name>] [--skip-app]
 */
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..', '..');
const ENV_PATH = path.join(REPO_ROOT, '.env');

if (!process.env.DB_DATABASE && existsSync(ENV_PATH) && typeof process.loadEnvFile === 'function') {
  process.loadEnvFile(ENV_PATH);
}

/**
 * Parses CLI flags (`--email`, `--app`, `--skip-app`).
 * @param {readonly string[]} argv
 * @returns {{ email: string; appName: string; skipApp: boolean }}
 */
function parseArgs(argv) {
  let email = process.env.MJ_DEV_AUTH_DEFAULT_EMAIL?.trim() || 'admin@memberjunction.org';
  let appName = 'Credentialing';
  let skipApp = false;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--email' && argv[i + 1]) {
      email = argv[++i].trim();
    } else if (arg === '--app' && argv[i + 1]) {
      appName = argv[++i].trim();
    } else if (arg === '--skip-app') {
      skipApp = true;
    }
  }
  return { email, appName, skipApp };
}

const { email, appName, skipApp } = parseArgs(process.argv.slice(2));
const REQUIRED_ROLES = ['Developer', 'Integration', 'UI'];

const repoRequire = createRequire(path.join(REPO_ROOT, 'package.json'));
const cliRequire = createRequire(repoRequire.resolve('@memberjunction/cli/package.json'));

/**
 * Dynamically imports a workspace or transitive CLI package as an ESM module.
 * @param {NodeRequire} req
 * @param {string} pkg
 */
async function importFrom(req, pkg) {
  return import(pathToFileURL(req.resolve(pkg)).href);
}

const { Metadata, RunView } = await importFrom(repoRequire, '@memberjunction/core');
const { UUIDsEqual } = await importFrom(repoRequire, '@memberjunction/global');
const { UserCache } = await importFrom(cliRequire, '@memberjunction/generic-database-provider');
const { initializeProvider, cleanupProvider } = await importFrom(cliRequire, '@memberjunction/metadata-sync');

const dbHost = process.env.DB_HOST || 'localhost';
const dbPort = Number(process.env.DB_PORT || 1433);
const dbDatabase = process.env.DB_DATABASE;
const dbUsername = process.env.CODEGEN_DB_USERNAME || process.env.DB_USERNAME;
const dbPassword = process.env.CODEGEN_DB_PASSWORD || process.env.DB_PASSWORD;
const dbTrustServerCertificate = process.env.DB_TRUST_SERVER_CERTIFICATE === '0' ? 'N' : 'Y';
const dbEncrypt = process.env.DB_ENCRYPT === '1' || process.env.DB_ENCRYPT === 'true' || dbHost.includes('.database.windows.net') ? 'Y' : 'N';
const mjCoreSchema = process.env.MJ_CORE_SCHEMA || '__mj';

if (!dbDatabase || !dbUsername || !dbPassword) {
  console.error(`Missing DB_DATABASE, DB_USERNAME, or DB_PASSWORD (checked environment and ${ENV_PATH}).`);
  process.exit(1);
}

await initializeProvider({
  dbPlatform: 'sqlserver',
  dbHost,
  dbPort,
  dbDatabase,
  dbUsername,
  dbPassword,
  dbEncrypt,
  dbTrustServerCertificate,
  mjCoreSchema,
});

try {
  const sysUser = UserCache.Instance.GetSystemUser();
  if (!sysUser) {
    throw new Error('System user not found in UserCache; verify MJ core migrations ran.');
  }

  const md = new Metadata();
  const rv = new RunView();

  // 1. Ensure Owner user exists.
  let userRecord = UserCache.Instance.Users.find(
    (u) => u.Email?.trim().toLowerCase() === email.toLowerCase()
  );
  let userId = userRecord?.ID;
  let createdUser = false;

  if (!userId) {
    const userEntity = await md.GetEntityObject('MJ: Users', sysUser);
    userEntity.NewRecord();
    userEntity.Name = email.toLowerCase() === 'admin@memberjunction.org' ? 'Admin' : email.split('@')[0];
    userEntity.FirstName = email.toLowerCase() === 'admin@memberjunction.org' ? 'Admin' : email.split('@')[0];
    userEntity.LastName = 'User';
    userEntity.Email = email;
    userEntity.Type = 'Owner';
    userEntity.IsActive = true;
    if (!(await userEntity.Save())) {
      throw new Error(`Failed to save MJ: Users for '${email}': ${userEntity.LatestResult?.CompleteMessage ?? 'unknown error'}`);
    }
    userId = userEntity.ID;
    createdUser = true;
    console.log(`Created dev Owner user '${email}' (${userId}).`);
  } else {
    console.log(`Dev Owner user '${email}' already exists (${userId}).`);
  }

  // 2. Ensure baseline roles exist on the user.
  const existingRoleRes = await rv.RunView(
    {
      EntityName: 'MJ: User Roles',
      ExtraFilter: `UserID='${userId}'`,
      ResultType: 'simple',
    },
    sysUser
  );
  if (!existingRoleRes.Success) {
    throw new Error(`Failed to query MJ: User Roles: ${existingRoleRes.ErrorMessage}`);
  }
  const existingRoleIds = existingRoleRes.Results.map((r) => r.RoleID);

  let addedRoles = 0;
  for (const roleName of REQUIRED_ROLES) {
    const role = md.Roles.find((r) => r.Name === roleName);
    if (!role) {
      throw new Error(`Required role '${roleName}' not found in metadata.`);
    }
    if (existingRoleIds.some((id) => UUIDsEqual(id, role.ID))) {
      continue;
    }
    const userRole = await md.GetEntityObject('MJ: User Roles', sysUser);
    userRole.NewRecord();
    userRole.UserID = userId;
    userRole.RoleID = role.ID;
    if (!(await userRole.Save())) {
      throw new Error(`Failed to grant role '${roleName}': ${userRole.LatestResult?.CompleteMessage ?? 'unknown error'}`);
    }
    addedRoles++;
    console.log(`Granted role '${roleName}' to '${email}'.`);
  }
  if (addedRoles === 0) {
    console.log(`All baseline roles (${REQUIRED_ROLES.join(', ')}) already present for '${email}'.`);
  }

  // 3. Ensure MJ: User Applications row exists for the target application (when pushed).
  let addedApp = false;
  if (!skipApp) {
    const app = md.Applications.find(
      (a) => a.Name?.trim().toLowerCase() === appName.toLowerCase()
    );
    if (!app) {
      console.log(`Application '${appName}' not yet in metadata; skipping MJ: User Applications (re-run after mj sync push).`);
    } else {
      const existingAppRes = await rv.RunView(
        {
          EntityName: 'MJ: User Applications',
          ExtraFilter: `UserID='${userId}' AND ApplicationID='${app.ID}'`,
          ResultType: 'simple',
        },
        sysUser
      );
      if (!existingAppRes.Success) {
        throw new Error(`Failed to query MJ: User Applications: ${existingAppRes.ErrorMessage}`);
      }
      if (existingAppRes.Results.length === 0) {
        const userApp = await md.GetEntityObject('MJ: User Applications', sysUser);
        userApp.NewRecord();
        userApp.UserID = userId;
        userApp.ApplicationID = app.ID;
        userApp.IsActive = true;
        if (!(await userApp.Save())) {
          throw new Error(`Failed to grant application '${appName}': ${userApp.LatestResult?.CompleteMessage ?? 'unknown error'}`);
        }
        addedApp = true;
        console.log(`Granted MJ: User Applications '${appName}' to '${email}'.`);
      } else {
        console.log(`MJ: User Applications '${appName}' already present for '${email}'.`);
      }
    }
  }

  if (!createdUser && addedRoles === 0 && !addedApp) {
    console.log(`Summary: nothing new created for '${email}'.`);
  }
} finally {
  await cleanupProvider();
}
process.exit(0);
