#!/usr/bin/env node
/**
 * Isolation probe: signs in as the personas of `personas.json` over MJAPI's HTTP and GraphQL surface,
 * the way a browser does, and tries every B1 read path an external role or another organization's
 * staff member could use to reach the sample program of accrediting body A.
 *
 * It only reads, or attempts writes that must be refused; it changes no credentialing row, so it is
 * safe to run any number of times. (Signing in by magic link writes MJ's own invite and redemption
 * rows, and the first redemption for an account adds its application row or creates the account:
 * that is what a magic link does, docs/dev-instance.md "Signing in as a persona".)
 *
 * Prints one `PASS`/`FAIL` line per case and actor on stdout and exits 1 when any case fails.
 * MJ's own log output goes to stderr.
 *
 * Preconditions: MJAPI running (base URL `MJAPI_URL`, default http://localhost:4050), the world
 * loaded (`CRD-05 - Isolation` or `pnpm run seed:dev`) and MJAPI restarted since.
 *
 * Usage:
 *   pnpm run probe:isolation
 */
import { randomUUID } from 'node:crypto';
import {
  CloseSessions,
  ImportCredentialing,
  ImportMJ,
  LoadPersonas,
  OpenDevLoginSession,
  OpenPersonaSession,
  RouteConsoleToStderr,
} from './mint-persona-link.mjs';

RouteConsoleToStderr();

const { CompositeKey, RunView } = await ImportMJ();
const {
  CredentialingEntity,
  CreateProgramOperation,
  CloneVersionToDraftOperation,
  ReorderVersionTreeOperation,
  CreateOrganizationOperation,
} = await ImportCredentialing();

/** The world's program of accrediting body A (packages/IntegrationTests/src/world/load-world.ts). */
const SAMPLE_PROGRAM_NAME = 'Sample Certified Practitioner';
/** The world's program of accrediting body B, owned by staff-b. */
const PROGRAM_B_NAME = 'Sample Program B';
/** The local dev Owner that issues the links; also the control reader of P6, P7 and P10. */
const CONTROL_EMAIL = LoadPersonas().issuer.email;
const NOT_FOUND = 'Record not found.';
const READ_REFUSAL = /does not have read permissions? on/i;

const SEVEN_ENTITIES = Object.values(CredentialingEntity);
const PLATFORM_ENTITIES = ['MJ: Users', 'MJ: Entities', 'MJ_BizApps_Common: People', 'MJ_BizApps_Common: Organizations'];

/** @typedef {import('@memberjunction/graphql-dataprovider').GraphQLDataProvider} Session */
/** @typedef {{ Name: string; Email: string; Provider: Session }} PersonaSession */
/** @typedef {{ ID: string; Sequence: number }} SequencedRow */
/**
 * @typedef {object} Target the sample program as staff-a reads it
 * @property {Record<string, string | number | boolean | null>} Program the full program row
 * @property {string} VersionID a version of the sample program (Active when there is one)
 * @property {SequencedRow[]} Sections the version's sections
 * @property {SequencedRow[]} Standards the version's standards
 */
/** @typedef {{ ProgramName: string; Versions: string; Sections: string; Standards: string }} Snapshot */

/** @type {{ Id: string; Actor: string; Passed: boolean; Detail: string }[]} */
const results = [];

/**
 * Records and prints one case result.
 * @param {string} id
 * @param {string} actor
 * @param {boolean} passed
 * @param {string} detail
 */
function report(id, actor, passed, detail) {
  const oneLine = detail.replace(/\s+/g, ' ').trim();
  results.push({ Id: id, Actor: actor, Passed: passed, Detail: oneLine });
  process.stdout.write(`${passed ? 'PASS' : 'FAIL'} ${id} ${actor}: ${oneLine}\n`);
}

/**
 * Runs `work` and reports its outcome; a thrown error is a FAIL carrying its message.
 * @param {string} id
 * @param {string} actor
 * @param {() => Promise<{ passed: boolean; detail: string }>} work
 */
async function probeCase(id, actor, work) {
  try {
    const outcome = await work();
    report(id, actor, outcome.passed, outcome.detail);
  } catch (e) {
    report(id, actor, false, `error: ${e instanceof Error ? e.message : String(e)}`);
  }
}

/** @param {string} value */
function quote(value) {
  return value.replace(/'/g, "''");
}

/**
 * A simple RunView as the session's user.
 * @param {Session} session
 * @param {string} entityName
 * @param {string} filter
 * @param {string[]} fields
 * @returns {Promise<{ Success: boolean; Rows: Record<string, string | number | boolean | null>[]; ErrorMessage: string }>}
 */
async function readRows(session, entityName, filter, fields) {
  const res = await RunView.FromMetadataProvider(session).RunView(
    { EntityName: entityName, ExtraFilter: filter, Fields: fields, IgnoreMaxRows: true, ResultType: 'simple' },
    session.CurrentUser,
  );
  return { Success: res.Success, Rows: res.Results ?? [], ErrorMessage: res.ErrorMessage ?? '' };
}

/**
 * Like {@link readRows}, but throws when the read fails (used for the trusted readers).
 * @param {Session} session
 * @param {string} entityName
 * @param {string} filter
 * @param {string[]} fields
 */
async function requireRows(session, entityName, filter, fields) {
  const res = await readRows(session, entityName, filter, fields);
  if (!res.Success) {
    throw new Error(`RunView ${entityName} as ${session.CurrentUser.Email} failed: ${res.ErrorMessage}`);
  }
  return res.Rows;
}

/**
 * A read that must return nothing: zero rows, or refused for want of read permission.
 * @param {Session} session
 * @param {string} entityName
 * @param {string} filter
 * @returns {Promise<{ ok: boolean; how: string }>}
 */
async function readsNothing(session, entityName, filter) {
  const res = await readRows(session, entityName, filter, ['ID']);
  if (res.Success) {
    return { ok: res.Rows.length === 0, how: `${res.Rows.length} rows` };
  }
  return READ_REFUSAL.test(res.ErrorMessage)
    ? { ok: true, how: 'read refused' }
    : { ok: false, how: `failed for another reason: ${res.ErrorMessage}` };
}

/**
 * Every entity in `entityNames` reads nothing for the session.
 * @param {Session} session
 * @param {string[]} entityNames
 */
async function readsNothingFromAll(session, entityNames) {
  const outcomes = [];
  for (const name of entityNames) {
    outcomes.push({ name, ...(await readsNothing(session, name, '')) });
  }
  const leaks = outcomes.filter((o) => !o.ok);
  const refused = outcomes.filter((o) => o.how === 'read refused').length;
  return {
    passed: leaks.length === 0,
    detail: leaks.length === 0
      ? `${entityNames.length} entities read nothing (${refused} refused, ${entityNames.length - refused} returned 0 rows)`
      : `LEAK ${leaks.map((l) => `${l.name}: ${l.how}`).join('; ')}`,
  };
}

/**
 * The message a raw GraphQL request was refused with, or null when it succeeded.
 * @param {Session} session
 * @param {string} gql
 * @param {Record<string, object | string | null>} variables
 * @returns {Promise<string | null>}
 */
async function gqlRefusal(session, gql, variables) {
  try {
    await session.ExecuteGQL(gql, variables);
    return null;
  } catch (e) {
    /** @type {{ response?: { errors?: { message?: string }[] }; message?: string }} */
    const err = /** @type {object} */ (e);
    return err.response?.errors?.[0]?.message ?? err.message ?? String(e);
  }
}

/**
 * Reads the sample program, one of its versions and that version's tree, as staff-a.
 * @param {Session} staffA
 * @returns {Promise<Target>}
 */
async function readTarget(staffA) {
  // Every field named: over GraphQL an empty field list returns only the ID.
  const programFields = (staffA.Entities.find((e) => e.Name === CredentialingEntity.Program)?.Fields ?? []).map((f) => f.Name);
  if (!programFields.includes('AccreditingOrganizationID')) {
    throw new Error(`the ${CredentialingEntity.Program} metadata has no AccreditingOrganizationID field`);
  }
  const programs = await requireRows(staffA, CredentialingEntity.Program, `Name = '${quote(SAMPLE_PROGRAM_NAME)}'`, programFields);
  if (programs.length !== 1) {
    throw new Error(`staff-a reads ${programs.length} programs named ${SAMPLE_PROGRAM_NAME}; load the world first`);
  }
  const program = programs[0];
  const versions = await requireRows(staffA, CredentialingEntity.ProgramVersion, `ProgramID = '${program.ID}'`, ['ID', 'Status']);
  const version = versions.find((v) => v.Status === 'Active') ?? versions[0];
  if (version == null) {
    throw new Error(`${SAMPLE_PROGRAM_NAME} has no version`);
  }
  const versionID = String(version.ID);
  const [sections, standards] = await Promise.all([
    requireRows(staffA, CredentialingEntity.Section, `ProgramVersionID = '${versionID}'`, ['ID', 'Sequence']),
    requireRows(staffA, CredentialingEntity.Standard, `ProgramVersionID = '${versionID}'`, ['ID', 'Sequence']),
  ]);
  if (standards.length === 0) {
    throw new Error(`version ${versionID} of ${SAMPLE_PROGRAM_NAME} has no standards`);
  }
  /** @param {Record<string, string | number | boolean | null>} r @returns {SequencedRow} */
  const sequenced = (r) => ({ ID: String(r.ID), Sequence: Number(r.Sequence) });
  return { Program: program, VersionID: versionID, Sections: sections.map(sequenced), Standards: standards.map(sequenced) };
}

/**
 * What a refused write must leave unchanged: the program's name and versions, and the tree of the
 * target version, as staff-a reads them.
 * @param {Session} staffA
 * @param {Target} target
 * @returns {Promise<Snapshot>}
 */
async function snapshot(staffA, target) {
  const programID = String(target.Program.ID);
  const [program, versions, sections, standards] = await Promise.all([
    requireRows(staffA, CredentialingEntity.Program, `ID = '${programID}'`, ['ID', 'Name']),
    requireRows(staffA, CredentialingEntity.ProgramVersion, `ProgramID = '${programID}'`, ['ID', 'Status', 'Label']),
    requireRows(staffA, CredentialingEntity.Section, `ProgramVersionID = '${target.VersionID}'`, ['ID', 'Sequence']),
    requireRows(staffA, CredentialingEntity.Standard, `ProgramVersionID = '${target.VersionID}'`, ['ID', 'Sequence']),
  ]);
  /** @param {Record<string, string | number | boolean | null>[]} rows @param {string[]} keys */
  const flat = (rows, keys) => rows.map((r) => keys.map((k) => String(r[k]).toLowerCase()).join(':')).sort().join(',');
  return {
    ProgramName: String(program[0]?.Name ?? '(missing)'),
    Versions: flat(versions, ['ID', 'Status', 'Label']),
    Sections: flat(sections, ['ID', 'Sequence']),
    Standards: flat(standards, ['ID', 'Sequence']),
  };
}

/**
 * @param {Snapshot} before
 * @param {Snapshot} after
 * @returns {string} empty when nothing changed
 */
function changes(before, after) {
  return /** @type {(keyof Snapshot)[]} */ (['ProgramName', 'Versions', 'Sections', 'Standards'])
    .filter((k) => before[k] !== after[k])
    .join(', ');
}

/**
 * @param {{ Success: boolean; ResultCode?: string; ErrorMessage?: string }} result
 */
function describe(result) {
  return `${result.Success ? 'succeeded' : 'refused'} ${result.ResultCode ?? ''} "${result.ErrorMessage ?? ''}"`.trim();
}

/** @param {Target} target @returns {{ ID: string; Sequence: number }[]} */
function reversedStandards(target) {
  const ordered = [...target.Standards].sort((a, b) => a.Sequence - b.Sequence);
  return ordered.map((s, i) => ({ ID: s.ID, Sequence: ordered[ordered.length - 1 - i].Sequence }));
}

// ── cases ────────────────────────────────────────────────────────────────────────────────────────

/** P1 / P3: an external role reads nothing from the seven credentialing entities. */
async function caseSevenEntities(id, persona) {
  await probeCase(id, persona.Name, () => readsNothingFromAll(persona.Provider, SEVEN_ENTITIES));
}

/** P4: staff-b loads the sample program by its ID over GraphQL. */
async function caseLoadById(staffB, target) {
  await probeCase('P4', staffB.Name, async () => {
    const session = staffB.Provider;
    const program = await session.GetEntityObject(CredentialingEntity.Program, session.CurrentUser);
    const loaded = await program.InnerLoad(CompositeKey.FromID(String(target.Program.ID)));
    const version = await session.GetEntityObject(CredentialingEntity.ProgramVersion, session.CurrentUser);
    const versionLoaded = await version.InnerLoad(CompositeKey.FromID(target.VersionID));
    // The display-name lookup behind every link and breadcrumb (EntityRecordNameResolver).
    const name = await session.GetEntityRecordName(CredentialingEntity.Program, CompositeKey.FromID(String(target.Program.ID)));
    return {
      passed: !loaded && !versionLoaded && !name,
      detail: `program load ${loaded ? 'RETURNED THE RECORD' : 'not found'}, version load ${versionLoaded ? 'RETURNED THE RECORD' : 'not found'}, record name ${name ? `RETURNED "${name}"` : 'none'}`,
    };
  });
}

/** P5: staff-b updates the sample program's name over GraphQL, with and without OldValues. */
async function caseUpdateName(staffA, staffB, target) {
  await probeCase('P5', staffB.Name, async () => {
    const before = await snapshot(staffA.Provider, target);
    const gql = 'mutation ($input: UpdatemjBizAppsCredentialingProgramInput!) { UpdatemjBizAppsCredentialingProgram(input: $input) { ID Name } }';
    const newName = `Probe rename ${randomUUID().slice(0, 8)}`;
    const randomID = randomUUID().toUpperCase();
    /** @param {string} id */
    const oldValues = (id) => Object.entries({ ...target.Program, ID: id })
      .filter(([key]) => !key.startsWith('__mj_') && key !== 'AccreditingOrganization')
      .map(([Key, value]) => ({ Key, Value: value == null ? null : String(value) }));
    const attempts = [
      { label: 'no OldValues', real: { ID: target.Program.ID, Name: newName }, random: { ID: randomID, Name: newName } },
      {
        label: 'full OldValues',
        real: { ID: target.Program.ID, Name: newName, OldValues___: oldValues(String(target.Program.ID)) },
        random: { ID: randomID, Name: newName, OldValues___: oldValues(randomID) },
      },
    ];
    const problems = [];
    const seen = [];
    for (const attempt of attempts) {
      const real = await gqlRefusal(staffB.Provider, gql, { input: attempt.real });
      const random = await gqlRefusal(staffB.Provider, gql, { input: attempt.random });
      seen.push(`${attempt.label}: "${real}"`);
      if (real == null) problems.push(`${attempt.label}: the update SUCCEEDED`);
      else if (real !== random) problems.push(`${attempt.label}: "${real}" differs from the random-ID refusal "${random}"`);
    }
    const changed = changes(before, await snapshot(staffA.Provider, target));
    if (changed) problems.push(`changed: ${changed}`);
    return { passed: problems.length === 0, detail: problems.length ? problems.join('; ') : `refused like a random ID (${seen.join('; ')}); nothing changed` };
  });
}

/** P6: the sample program's change history, filtered to its record ID. */
async function caseRecordChanges(persona, target, controlRows) {
  await probeCase('P6', persona.Name, async () => {
    const filter = `RecordID LIKE '%${target.Program.ID}%'`;
    const outcome = await readsNothing(persona.Provider, 'MJ: Record Changes', filter);
    return {
      passed: outcome.ok && controlRows > 0,
      detail: `MJ: Record Changes for the program: ${outcome.how} (control reader sees ${controlRows})`,
    };
  });
}

/** P7: saved Queries, and SQL that reads a credentialing view. */
async function caseQueries(persona, credentialingQueryIDs) {
  await probeCase('P7', persona.Name, async () => {
    const session = persona.Provider;
    const problems = [];
    const listed = await readsNothing(session, 'MJ: Queries', '');
    if (!listed.ok) problems.push(`MJ: Queries listing: ${listed.how}`);
    for (const queryID of credentialingQueryIDs) {
      const run = await session.RunQuery({ QueryID: queryID });
      if (run.Success && (run.Results ?? []).length > 0) problems.push(`saved query ${queryID} returned ${run.Results.length} rows`);
    }
    const adhoc = await session.RunQuery({ SQL: 'SELECT ID, Name FROM [__mj_BizAppsCredentialing].[vwPrograms]' });
    if (adhoc.Success) problems.push(`ad-hoc SQL on vwPrograms ran and returned ${(adhoc.Results ?? []).length} rows`);
    return {
      passed: problems.length === 0,
      detail: problems.length
        ? `LEAK ${problems.join('; ')}`
        : `MJ: Queries ${listed.how}; ${credentialingQueryIDs.length} saved queries read a credentialing view; ad-hoc SQL refused ("${adhoc.ErrorMessage}")`,
    };
  });
}

/** P8: an applicant creates a Program by entity save and calls the four remote operations. */
async function caseApplicantWrites(applicant, staffA, admin, target) {
  await probeCase('P8', applicant.Name, async () => {
    const session = applicant.Provider;
    const before = await snapshot(staffA.Provider, target);
    const hex = randomUUID().replace(/-/g, '').slice(0, 8);
    const programName = `Probe Program ${hex}`;
    const organizationName = `Probe Body ${hex}`;
    const organizationID = String(target.Program.AccreditingOrganizationID);
    const problems = [];
    const seen = [];

    const program = await session.GetEntityObject(CredentialingEntity.Program, session.CurrentUser);
    program.NewRecord();
    program.AccreditingOrganizationID = organizationID;
    program.Name = programName;
    program.ProgramType = 'Certification';
    program.SubjectType = 'Person';
    program.SubjectNoun = 'professional';
    program.CredentialPrefix = `P${hex.toUpperCase()}`;
    const saved = await program.Save();
    seen.push(`entity save: ${saved ? 'SUCCEEDED' : `"${program.LatestResult?.CompleteMessage ?? ''}"`}`);
    if (saved) problems.push('the Program entity save succeeded');

    const created = await gqlRefusal(
      session,
      'mutation ($input: CreatemjBizAppsCredentialingProgramInput!) { CreatemjBizAppsCredentialingProgram(input: $input) { ID } }',
      { input: { AccreditingOrganizationID: organizationID, Name: programName, ProgramType: 'Certification', SubjectType: 'Person', SubjectNoun: 'professional', CredentialPrefix: `Q${hex.toUpperCase()}`, Description: null, HostEntityID: null } },
    );
    seen.push(`create mutation: "${created}"`);
    if (created == null) problems.push('the Create mutation succeeded');

    const operations = [
      ['CreateProgram', () => new CreateProgramOperation().Execute({ AccreditingOrganizationID: organizationID, Name: programName, ProgramType: 'Certification', SubjectType: 'Person', SubjectNoun: 'professional', CredentialPrefix: `R${hex.toUpperCase()}`, Description: null, FirstVersionLabel: 'Probe' }, { provider: session })],
      ['CloneVersionToDraft', () => new CloneVersionToDraftOperation().Execute({ SourceVersionID: target.VersionID, NewLabel: `Probe ${hex}` }, { provider: session })],
      ['ReorderVersionTree', () => new ReorderVersionTreeOperation().Execute({ VersionID: target.VersionID, Sections: [], Standards: reversedStandards(target) }, { provider: session })],
      ['CreateOrganization', () => new CreateOrganizationOperation().Execute({ Name: organizationName, FirstStaffEmail: applicant.Email }, { provider: session })],
    ];
    for (const [name, run] of operations) {
      const result = await run();
      seen.push(`${name}: ${describe(result)}`);
      if (result.Success) problems.push(`${name} succeeded`);
    }

    const [programs, organizations] = await Promise.all([
      requireRows(staffA.Provider, CredentialingEntity.Program, `Name = '${quote(programName)}'`, ['ID']),
      requireRows(admin.Provider, CredentialingEntity.AccreditingOrganization, `Name = '${quote(organizationName)}'`, ['ID']),
    ]);
    if (programs.length) problems.push(`${programs.length} programs named ${programName} exist`);
    if (organizations.length) problems.push(`${organizations.length} accrediting organizations named ${organizationName} exist`);
    const changed = changes(before, await snapshot(staffA.Provider, target));
    if (changed) problems.push(`changed: ${changed}`);
    return { passed: problems.length === 0, detail: problems.length ? problems.join('; ') : `${seen.join('; ')}; nothing created or changed` };
  });
}

/** P9: staff-b clones the sample program's version and reorders a tree naming one of its standards. */
async function caseCrossOrganizationOperations(staffA, staffB, target) {
  await probeCase('P9', staffB.Name, async () => {
    const session = staffB.Provider;
    const before = await snapshot(staffA.Provider, target);
    // A browser filter may not subquery a row-filtered view (docs/dev-instance.md, Program Studio), so two reads.
    const own = await requireRows(session, CredentialingEntity.Program, `Name = '${quote(PROGRAM_B_NAME)}'`, ['ID']);
    if (own.length !== 1) throw new Error(`staff-b reads ${own.length} programs named ${PROGRAM_B_NAME}`);
    const ownVersions = await requireRows(session, CredentialingEntity.ProgramVersion, `ProgramID = '${own[0].ID}'`, ['ID']);
    if (ownVersions.length === 0) throw new Error(`staff-b reads no version of ${PROGRAM_B_NAME}`);
    const sampleStandard = target.Standards[0];
    const attempts = [
      ['CloneVersionToDraft of the sample version', () => new CloneVersionToDraftOperation().Execute({ SourceVersionID: target.VersionID, NewLabel: `Probe ${randomUUID().slice(0, 8)}` }, { provider: session })],
      ['ReorderVersionTree of the sample version', () => new ReorderVersionTreeOperation().Execute({ VersionID: target.VersionID, Sections: [], Standards: [{ ID: sampleStandard.ID, Sequence: sampleStandard.Sequence + 1 }] }, { provider: session })],
      ['ReorderVersionTree of its own version naming a sample standard', () => new ReorderVersionTreeOperation().Execute({ VersionID: String(ownVersions[0].ID), Sections: [], Standards: [{ ID: sampleStandard.ID, Sequence: sampleStandard.Sequence + 1 }] }, { provider: session })],
    ];
    const problems = [];
    const seen = [];
    for (const [label, run] of attempts) {
      const result = await run();
      seen.push(`${label}: ${describe(result)}`);
      if (result.Success || result.ErrorMessage !== NOT_FOUND) problems.push(`${label}: ${describe(result)}`);
    }
    const changed = changes(before, await snapshot(staffA.Provider, target));
    if (changed) problems.push(`changed: ${changed}`);
    return { passed: problems.length === 0, detail: problems.length ? problems.join('; ') : `${seen.join('; ')}; nothing created or changed` };
  });
}

/**
 * P10: an actor creates an `MJ: Magic Link Invites` row directly over GraphQL (for the Developer role,
 * any application) and reads invite rows. A Create here would let its holder mint an invite for any
 * role, because redemption does not re-check the grantable roles (docs/isolation-read-paths.md).
 */
async function caseInviteRows(persona, controlInvites) {
  await probeCase('P10', persona.Name, async () => {
    const session = persona.Provider;
    const developer = session.Roles.find((r) => r.Name === 'Developer');
    const application = session.Applications.find((a) => a.Name === LoadPersonas().application);
    if (developer == null || application == null) throw new Error('the Developer role or the application is not in the metadata');
    const refusal = await gqlRefusal(
      session,
      'mutation ($input: CreateMJMagicLinkInviteInput!) { CreateMJMagicLinkInvite(input: $input) { ID } }',
      {
        input: {
          TokenHash: randomUUID().replace(/-/g, '').repeat(2),
          Email: `probe.${randomUUID().slice(0, 8)}@example.test`,
          ApplicationID: application.ID,
          RoleID: developer.ID,
          ExpiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
          MaxUses: 1,
          UseCount: 0,
          CreatedByUserID: session.CurrentUser.ID,
          Status: 'Active',
          ConsumedAt: null,
          ResourceTypeID: null,
          ResourceID: null,
        },
      },
    );
    const read = await readsNothing(session, 'MJ: Magic Link Invites', '');
    const problems = [];
    if (refusal == null) problems.push('the invite Create mutation SUCCEEDED');
    else if (!/permission/i.test(refusal)) problems.push(`the Create was refused for another reason than permission: "${refusal}"`);
    if (!read.ok) problems.push(`MJ: Magic Link Invites read: ${read.how}`);
    if (controlInvites === 0) problems.push('the control reader sees no invite, so the read proves nothing');
    return {
      passed: problems.length === 0,
      detail: problems.length
        ? `LEAK ${problems.join('; ')}`
        : `invite Create refused ("${refusal}"); invite read: ${read.how} (control reader sees ${controlInvites})`,
    };
  });
}

/**
 * P11: an actor deletes accrediting body A (the sample program's organization) over GraphQL. Only
 * `Credentialing Admin` may delete an accrediting organization, so the attempt must be refused for
 * want of permission (or as not found, for a caller who cannot read the organization), and body A
 * must still exist, as the admin reads it.
 */
async function caseDeleteOrganization(persona, admin, target) {
  await probeCase('P11', persona.Name, async () => {
    const organizationID = String(target.Program.AccreditingOrganizationID);
    const refusal = await gqlRefusal(
      persona.Provider,
      'mutation ($id: String!, $options: DeleteOptionsInput!) { DeletemjBizAppsCredentialingAccreditingOrganization(ID: $id, options___: $options) { ID } }',
      { id: organizationID, options: { SkipEntityAIActions: false, SkipEntityActions: false, ReplayOnly: false, IsParentEntityDelete: false } },
    );
    const still = await requireRows(admin.Provider, CredentialingEntity.AccreditingOrganization, `ID = '${quote(organizationID)}'`, ['ID']);
    const problems = [];
    if (refusal == null) problems.push('the Delete mutation SUCCEEDED');
    else if (!/permission|Record not found/i.test(refusal)) problems.push(`the Delete was refused for another reason than permission: "${refusal}"`);
    if (still.length !== 1) problems.push(`the admin reads ${still.length} rows of accrediting body A after the attempt`);
    return {
      passed: problems.length === 0,
      detail: problems.length ? problems.join('; ') : `Delete of accrediting body A refused ("${refusal}"); the organization still exists`,
    };
  });
}

// ── run ──────────────────────────────────────────────────────────────────────────────────────────

/**
 * Saved queries whose SQL reads a credentialing view, as the control reader lists them.
 * @param {Session} control
 */
async function credentialingQueryIDs(control) {
  const rows = await requireRows(control, 'MJ: Queries', `SQL LIKE '%BizAppsCredentialing%'`, ['ID']);
  return rows.map((r) => String(r.ID));
}

async function main() {
  try {
    const staffA = await OpenPersonaSession('staff-a');
    const staffB = await OpenPersonaSession('staff-b');
    const admin = await OpenPersonaSession('admin');
    const applicant = await OpenPersonaSession('applicant-a');
    const reviewer = await OpenPersonaSession('reviewer-a');
    const committee = await OpenPersonaSession('committee-a');
    const control = await OpenDevLoginSession(CONTROL_EMAIL);

    const target = await readTarget(staffA.Provider);
    const controlChanges = await requireRows(control.Provider, 'MJ: Record Changes', `RecordID LIKE '%${target.Program.ID}%'`, ['ID']);
    const queryIDs = await credentialingQueryIDs(control.Provider);

    await caseSevenEntities('P1', applicant);
    await probeCase('P2', applicant.Name, () => readsNothingFromAll(applicant.Provider, PLATFORM_ENTITIES));
    await caseSevenEntities('P3', reviewer);
    await caseSevenEntities('P3', committee);
    await caseLoadById(staffB, target);
    await caseUpdateName(staffA, staffB, target);
    await caseRecordChanges(applicant, target, controlChanges.length);
    await caseRecordChanges(staffB, target, controlChanges.length);
    await caseQueries(applicant, queryIDs);
    await caseQueries(staffB, queryIDs);
    await caseApplicantWrites(applicant, staffA, admin, target);
    await caseCrossOrganizationOperations(staffA, staffB, target);
    const controlInvites = await requireRows(control.Provider, 'MJ: Magic Link Invites', '', ['ID']);
    await caseInviteRows(applicant, controlInvites.length);
    await caseInviteRows(staffB, controlInvites.length);
    await caseDeleteOrganization(staffB, admin, target);
    await caseDeleteOrganization(applicant, admin, target);
  } catch (e) {
    report('SETUP', '-', false, e instanceof Error ? e.message : String(e));
  } finally {
    CloseSessions();
  }
  const failed = results.filter((r) => !r.Passed).length;
  process.stdout.write(`${failed === 0 ? 'PASS' : 'FAIL'} ${results.length - failed}/${results.length} cases passed\n`);
  process.exit(failed === 0 ? 0 : 1);
}

await main();
