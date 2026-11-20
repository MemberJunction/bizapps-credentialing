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
  MJAPI_BASE_URL,
  OpenDevLoginSession,
  OpenPersonaSession,
  RouteConsoleToStderr,
} from './mint-persona-link.mjs';

RouteConsoleToStderr();

const { CompositeKey, RunView } = await ImportMJ();
const {
  CredentialingEntity,
  CredentialingOperation,
  CreateProgramOperation,
  CloneVersionToDraftOperation,
  ReorderVersionTreeOperation,
  CreateOrganizationOperation,
  CreateCommitteeOperation,
  InviteApplicantOperation,
  ReissueInvitationOperation,
  GetMySubjectsOperation,
  GetApplicationWorkspaceOperation,
  SaveResponseOperation,
  ConfirmResponseOperation,
  ReopenResponseOperation,
  WithdrawApplicationOperation,
  AttestInLieuOperation,
  ConfirmDocumentCurrentOperation,
  GetDocumentLibraryOperation,
  RequeueReadingOperation,
  SaveResponseSourcesOperation,
  RefreshPrefillsOperation,
  GetSubmissionGateOperation,
  SubmitApplicationOperation,
} = await ImportCredentialing();

/** The world's program of accrediting body A (packages/IntegrationTests/src/world/load-world.ts). */
const SAMPLE_PROGRAM_NAME = 'Sample Certified Practitioner';
/** The world's program of accrediting body B, owned by staff-b. */
const PROGRAM_B_NAME = 'Sample Program B';
/** The world's Active program of accrediting body A, used by applicant-a and applicant-b. */
const SAMPLE_APPLICANT_PROGRAM = 'Sample Applicant Program';
const SAMPLE_APPLICANT_ONE = 'Sample Applicant One';
const SAMPLE_APPLICANT_TWO = 'Sample Applicant Two';
const SAMPLE_APPLICANT_ORG_B = 'Sample Applicant Org B';
/** The local dev Owner that issues the links; also the control reader of P6, P7 and P10. */
const CONTROL_EMAIL = LoadPersonas().issuer.email;
const NOT_FOUND = 'Record not found.';
const OPERATION_ONLY_REASON = "This record is changed only through the application's own actions.";
const READ_REFUSAL = /does not have read permissions? on/i;

/** Every credentialing entity (B1's seven and B2's ten). */
const ALL_CREDENTIALING_ENTITIES = Object.values(CredentialingEntity);
/**
 * The entities an applicant never reads: B1's seven and Response Sources. Since B2 Task 3 applicant-a
 * is a contact of the world subject `Sample Applicant One`, so it reads that subject's rows of the nine
 * applicant-data entities by design (proved on the probe as P11).
 */
const AUTHORING_ENTITIES = [
  CredentialingEntity.AccreditingOrganization,
  CredentialingEntity.OrganizationMembership,
  CredentialingEntity.Program,
  CredentialingEntity.ProgramVersion,
  CredentialingEntity.Section,
  CredentialingEntity.Standard,
  CredentialingEntity.DocumentRequirement,
  CredentialingEntity.ResponseSource,
];
/** The nine applicant-data entities, each carrying its subject ID. */
const APPLICANT_DATA_ENTITIES = [
  { Name: CredentialingEntity.Subject, SubjectColumn: 'ID' },
  { Name: CredentialingEntity.SubjectContact, SubjectColumn: 'SubjectID' },
  { Name: CredentialingEntity.Application, SubjectColumn: 'SubjectID' },
  { Name: CredentialingEntity.StandardResponse, SubjectColumn: 'SubjectID' },
  { Name: CredentialingEntity.ResponseCitation, SubjectColumn: 'SubjectID' },
  { Name: CredentialingEntity.EvidenceDocument, SubjectColumn: 'SubjectID' },
  { Name: CredentialingEntity.DocumentAttestation, SubjectColumn: 'SubjectID' },
  { Name: CredentialingEntity.ApplicationDocument, SubjectColumn: 'SubjectID' },
  { Name: CredentialingEntity.Extraction, SubjectColumn: 'SubjectID' },
];
const PLATFORM_ENTITIES = ['MJ: Users', 'MJ: Entities', 'MJ_BizApps_Common: People', 'MJ_BizApps_Common: Organizations'];
/** P16: authoring entities plus core/common/AI entities an applicant must read zero rows or refusal from. */
const P16_ENTITIES = [
  CredentialingEntity.Program,
  CredentialingEntity.ProgramVersion,
  CredentialingEntity.Section,
  CredentialingEntity.Standard,
  CredentialingEntity.DocumentRequirement,
  CredentialingEntity.ResponseSource,
  'MJ: Files',
  'MJ: File Storage Accounts',
  'MJ: Users',
  'MJ_BizApps_Common: People',
  'MJ_BizApps_Common: Organizations',
  'MJ: Record Changes',
  'MJ: AI Prompt Runs',
];

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

/**
 * P1 / P3: an external role reads nothing from `entities` — every credentialing entity for a reviewer
 * or committee member (P3), the authoring entities for a subject contact (P1).
 */
async function caseSevenEntities(id, persona, entities = ALL_CREDENTIALING_ENTITIES) {
  await probeCase(id, persona.Name, () => readsNothingFromAll(persona.Provider, entities));
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

/** P8: an applicant creates a Program by entity save and calls the four program and organization remote operations (P12 covers CreateCommittee). */
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
 * P10b (B1): an actor deletes accrediting body A (the sample program's organization) over GraphQL. Only
 * `Credentialing Admin` may delete an accrediting organization, so the attempt must be refused for
 * want of permission (or as not found, for a caller who cannot read the organization), and body A
 * must still exist, as the admin reads it.
 */
async function caseDeleteOrganization(persona, admin, target) {
  await probeCase('P10b', persona.Name, async () => {
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

/**
 * P10c (B1): an actor calls `Credentialing.CreateCommittee` for the sample program of accrediting body A.
 * The operation writes the committee as the system user, so its own checks are all that stand between
 * a caller and another organization's committee list. staff-b (staff of body B) must be told
 * `Record not found.`, exactly as for a random program ID; applicant-a must be refused outright
 * (`FORBIDDEN`). In both cases no committee of the probe's name exists afterwards, as the control
 * reader (who reads every committee) sees it.
 *
 * @param {PersonaSession} persona
 * @param {Session} control
 * @param {Target} target
 * @param {string} committeeTypeID a committee type that exists, so the refusal is not about the type
 * @param {'not-found' | 'forbidden'} expected
 */
async function caseCreateCommittee(persona, control, target, committeeTypeID, expected) {
  await probeCase('P10c', persona.Name, async () => {
    const name = `Probe Committee ${randomUUID().replace(/-/g, '').slice(0, 8)}`;
    /** @param {string} programID */
    const attempt = (programID) => new CreateCommitteeOperation().Execute({ ProgramID: programID, Name: name, CommitteeTypeID: committeeTypeID }, { provider: persona.Provider });
    const real = await attempt(String(target.Program.ID));
    const random = await attempt(randomUUID().toUpperCase());
    const problems = [];
    if (real.Success) problems.push('CreateCommittee for the sample program SUCCEEDED');
    else if (expected === 'not-found' && real.ErrorMessage !== NOT_FOUND) problems.push(`refused otherwise than as not found: ${describe(real)}`);
    else if (expected === 'forbidden' && real.ResultCode !== 'FORBIDDEN') problems.push(`refused otherwise than as forbidden: ${describe(real)}`);
    if (!real.Success && (real.ResultCode !== random.ResultCode || real.ErrorMessage !== random.ErrorMessage)) {
      problems.push(`the refusal ${describe(real)} differs from the random-ID refusal ${describe(random)}`);
    }
    const created = await requireRows(control, 'Committees: Committees', `Name = '${quote(name)}'`, ['ID']);
    if (created.length) problems.push(`${created.length} committees named ${name} exist`);
    return {
      passed: problems.length === 0,
      detail: problems.length ? problems.join('; ') : `CreateCommittee for the sample program: ${describe(real)}, like a random program ID; no committee created`,
    };
  });
}

// ── B2 applicant-data cases (P11–P20) ────────────────────────────────────────────────────────────

/**
 * Loads one world subject's IDs and its uploaded sample document + file storage details as `control`.
 * @param {Session} control
 * @param {string} displayName
 * @param {string} versionID
 */
async function loadWorldSubject(control, displayName, versionID) {
  const subjects = await requireRows(control, CredentialingEntity.Subject, `DisplayName = '${quote(displayName)}'`, ['ID', 'DisplayName', 'AccreditingOrganizationID']);
  if (subjects.length !== 1) throw new Error(`expected 1 subject named ${displayName}, found ${subjects.length}`);
  const subjectID = String(subjects[0].ID);
  const [contacts, apps, docs] = await Promise.all([
    requireRows(control, CredentialingEntity.SubjectContact, `SubjectID = '${quote(subjectID)}'`, ['ID', 'UserID']),
    requireRows(control, CredentialingEntity.Application, `SubjectID = '${quote(subjectID)}' AND ProgramVersionID = '${quote(versionID)}' AND Status = 'Draft'`, ['ID']),
    requireRows(control, CredentialingEntity.EvidenceDocument, `SubjectID = '${quote(subjectID)}' AND Status <> 'Superseded'`, ['ID', 'FileID', 'FileName', 'ExtractedText']),
  ]);
  if (apps.length === 0) throw new Error(`${displayName} has no Draft application on version ${versionID}`);
  const appID = String(apps[0].ID);
  const responses = await requireRows(control, CredentialingEntity.StandardResponse, `ApplicationID = '${quote(appID)}'`, ['ID', 'StandardID', 'Status', 'ResponseText']);
  if (responses.length === 0) throw new Error(`${displayName} application ${appID} has no responses`);
  let doc = null;
  if (docs.length > 0) {
    const first = docs[0];
    const files = await requireRows(control, 'MJ: Files', `ID = '${quote(String(first.FileID))}'`, ['ID', 'Name', 'ProviderID', 'ProviderKey']);
    doc = {
      ID: String(first.ID),
      FileID: String(first.FileID),
      FileName: String(first.FileName),
      ExtractedText: first.ExtractedText == null ? '' : String(first.ExtractedText),
      ObjectKey: String(files[0]?.ProviderKey ?? files[0]?.Name ?? ''),
    };
  }
  return {
    ID: subjectID,
    DisplayName: String(subjects[0].DisplayName),
    AccreditingOrganizationID: String(subjects[0].AccreditingOrganizationID),
    ContactIDs: contacts.map((c) => String(c.ID)),
    ApplicationID: appID,
    ResponseIDs: responses.map((r) => String(r.ID)),
    StandardID: String(responses[0].StandardID),
    Document: doc,
  };
}

/**
 * Loads the B2 probe targets as `control` and `staffA`.
 * @param {Session} control
 * @param {Session} staffA
 */
async function readApplicantTargets(control, staffA) {
  const programs = await requireRows(staffA, CredentialingEntity.Program, `Name = '${quote(SAMPLE_APPLICANT_PROGRAM)}'`, ['ID']);
  if (programs.length !== 1) throw new Error(`expected 1 program named ${SAMPLE_APPLICANT_PROGRAM}, found ${programs.length}`);
  const versions = await requireRows(staffA, CredentialingEntity.ProgramVersion, `ProgramID = '${quote(String(programs[0].ID))}' AND Status = 'Active'`, ['ID']);
  if (versions.length !== 1) throw new Error(`expected 1 Active version of ${SAMPLE_APPLICANT_PROGRAM}, found ${versions.length}`);
  const versionID = String(versions[0].ID);
  const [standards, requirements, accounts, orgBPrograms] = await Promise.all([
    requireRows(staffA, CredentialingEntity.Standard, `ProgramVersionID = '${quote(versionID)}'`, ['ID']),
    requireRows(staffA, CredentialingEntity.DocumentRequirement, `ProgramVersionID = '${quote(versionID)}'`, ['ID', 'Name']),
    requireRows(control, 'MJ: File Storage Accounts', `Name = 'Credentialing Evidence (Local Disk)'`, ['ID']),
    requireRows(control, CredentialingEntity.Program, `Name = 'Sample Program B Applicants'`, ['ID']),
  ]);
  if (standards.length === 0 || requirements.length === 0) throw new Error(`${SAMPLE_APPLICANT_PROGRAM} lacks standards or requirements`);
  if (accounts.length === 0) throw new Error(`storage account 'Credentialing Evidence (Local Disk)' missing (run pnpm run dev:storage)`);
  if (orgBPrograms.length === 0) throw new Error(`Sample Program B Applicants missing`);
  const orgBVersions = await requireRows(control, CredentialingEntity.ProgramVersion, `ProgramID = '${quote(String(orgBPrograms[0].ID))}' AND Status = 'Active'`, ['ID']);
  if (orgBVersions.length === 0) throw new Error(`Sample Program B Applicants has no Active version`);

  const [subjectOne, subjectTwo, subjectOrgB] = await Promise.all([
    loadWorldSubject(control, SAMPLE_APPLICANT_ONE, versionID),
    loadWorldSubject(control, SAMPLE_APPLICANT_TWO, versionID),
    loadWorldSubject(control, SAMPLE_APPLICANT_ORG_B, String(orgBVersions[0].ID)),
  ]);
  if (subjectTwo.Document == null) {
    throw new Error(`${SAMPLE_APPLICANT_TWO} has no uploaded sample document yet; run pnpm run seed:dev first`);
  }
  if (subjectOne.Document == null) {
    throw new Error(`${SAMPLE_APPLICANT_ONE} has no uploaded sample document yet; run pnpm run seed:dev first`);
  }
  return {
    ApplicantProgramVersionID: versionID,
    ApplicantStandardID: String(standards[0].ID),
    ApplicantRequirementID: String(requirements[0].ID),
    StorageAccountID: String(accounts[0].ID),
    SubjectOne: subjectOne,
    SubjectTwo: subjectTwo,
    SubjectOrgB: subjectOrgB,
  };
}

/**
 * P11 / P17-P11: RunView on all nine applicant-data entities returns only rows belonging to `allowedSubjectIDs`.
 * @param {string} id
 * @param {PersonaSession} persona
 * @param {Set<string>} allowedSubjectIDs
 * @param {string[]} requiredPresentSubjectIDs
 * @param {string[]} forbiddenSubjectIDs
 */
async function caseApplicantDataRunViews(id, persona, allowedSubjectIDs, requiredPresentSubjectIDs, forbiddenSubjectIDs) {
  await probeCase(id, persona.Name, async () => {
    const problems = [];
    const seenCounts = [];
    for (const entity of APPLICANT_DATA_ENTITIES) {
      const fields = entity.SubjectColumn === 'ID' ? ['ID'] : ['ID', entity.SubjectColumn];
      const res = await readRows(persona.Provider, entity.Name, '', fields);
      if (!res.Success) {
        problems.push(`${entity.Name} read failed: ${res.ErrorMessage}`);
        continue;
      }
      const subjects = res.Rows.map((r) => String(r[entity.SubjectColumn] ?? '').toLowerCase());
      const foreign = subjects.filter((s) => !allowedSubjectIDs.has(s));
      const explicitForbidden = subjects.filter((s) => forbiddenSubjectIDs.includes(s));
      if (foreign.length > 0 || explicitForbidden.length > 0) {
        problems.push(`${entity.Name} returned ${foreign.length} out-of-scope row(s) (${[...new Set(foreign)].slice(0, 3).join(', ')})`);
      }
      seenCounts.push(`${entity.Name.replace('MJ_BizApps_Credentialing: ', '')}:${res.Rows.length}`);
    }
    const subjectView = await readRows(persona.Provider, CredentialingEntity.Subject, '', ['ID']);
    const visibleSubjects = new Set((subjectView.Rows ?? []).map((r) => String(r.ID).toLowerCase()));
    for (const expectedID of requiredPresentSubjectIDs) {
      if (!visibleSubjects.has(expectedID.toLowerCase())) {
        problems.push(`expected own subject ${expectedID} missing from Subject RunView`);
      }
    }
    return {
      passed: problems.length === 0,
      detail: problems.length ? `LEAK ${problems.join('; ')}` : `all 9 applicant-data entities scoped (${seenCounts.join(', ')})`,
    };
  });
}

/**
 * P12 / P17-P12: single-record load (InnerLoad, GraphQL single-record query, GetEntityRecordName) for a foreign subject's records.
 * @param {string} id
 * @param {PersonaSession} persona
 * @param {Awaited<ReturnType<typeof loadWorldSubject>>} foreign
 */
async function caseForeignSingleRecordLoad(id, persona, foreign) {
  await probeCase(id, persona.Name, async () => {
    const session = persona.Provider;
    const targets = [
      {
        label: 'application',
        entity: CredentialingEntity.Application,
        realID: foreign.ApplicationID,
        gql: 'query ($id: String!) { mjBizAppsCredentialingApplication(ID: $id) { ID } }',
        field: 'mjBizAppsCredentialingApplication',
      },
      {
        label: 'response',
        entity: CredentialingEntity.StandardResponse,
        realID: foreign.ResponseIDs[0],
        gql: 'query ($id: String!) { mjBizAppsCredentialingStandardResponse(ID: $id) { ID } }',
        field: 'mjBizAppsCredentialingStandardResponse',
      },
      {
        label: 'document',
        entity: CredentialingEntity.EvidenceDocument,
        realID: foreign.Document.ID,
        gql: 'query ($id: String!) { mjBizAppsCredentialingEvidenceDocument(ID: $id) { ID } }',
        field: 'mjBizAppsCredentialingEvidenceDocument',
      },
    ];
    const problems = [];
    for (const t of targets) {
      const randID = randomUUID().toUpperCase();
      const ent = await session.GetEntityObject(t.entity, session.CurrentUser);
      const loaded = await ent.InnerLoad(CompositeKey.FromID(t.realID));
      if (loaded) problems.push(`InnerLoad(${t.label}) RETURNED THE RECORD`);

      const realGql = await session.ExecuteGQL(t.gql, { id: t.realID });
      const randGql = await session.ExecuteGQL(t.gql, { id: randID });
      if (realGql?.[t.field] != null) problems.push(`GraphQL(${t.label}) RETURNED ${JSON.stringify(realGql[t.field])}`);
      if (JSON.stringify(realGql?.[t.field] ?? null) !== JSON.stringify(randGql?.[t.field] ?? null)) {
        problems.push(`GraphQL(${t.label}) differed from random ID`);
      }

      const name = await session.GetEntityRecordName(t.entity, CompositeKey.FromID(t.realID));
      if (name) problems.push(`GetEntityRecordName(${t.label}) RETURNED "${name}"`);
    }
    return {
      passed: problems.length === 0,
      detail: problems.length ? `LEAK ${problems.join('; ')}` : 'application, response and document InnerLoad/GraphQL/recordName all not found (identical to random ID)',
    };
  });
}

/**
 * P13 / P17-P13: every Tasks 4–11 remote operation called with a foreign subject's IDs vs random UUIDs.
 * @param {string} id
 * @param {PersonaSession} persona
 * @param {'applicant' | 'staff'} actorKind
 * @param {Awaited<ReturnType<typeof readApplicantTargets>>} appTargets
 * @param {Target} sampleTarget
 */
async function caseB2Operations(id, persona, actorKind, appTargets, sampleTarget) {
  await probeCase(id, persona.Name, async () => {
    const provider = persona.Provider;
    const foreign = appTargets.SubjectTwo;
    const own = appTargets.SubjectOne;
    const problems = [];
    const testedKeys = new Set();

    // 1. GetMySubjects (no ID input)
    testedKeys.add(CredentialingOperation.GetMySubjects);
    const mySubjects = await new GetMySubjectsOperation().Execute({}, { provider });
    if (actorKind === 'applicant') {
      if (!mySubjects.Success || mySubjects.Output == null) {
        problems.push(`GetMySubjects failed for applicant: ${describe(mySubjects)}`);
      } else {
        const returnedIDs = mySubjects.Output.Subjects.map((s) => s.SubjectID.toLowerCase());
        if (returnedIDs.some((sid) => sid !== own.ID.toLowerCase())) {
          problems.push(`GetMySubjects returned foreign subject(s): ${returnedIDs.join(', ')}`);
        }
      }
    } else {
      if (mySubjects.Success || mySubjects.ResultCode !== 'FORBIDDEN') {
        problems.push(`GetMySubjects for staff expected FORBIDDEN, got ${describe(mySubjects)}`);
      }
    }

    /** @type {{ key: string; expected: 'not-found' | 'forbidden'; call: (foreignIDs: boolean) => Promise<{ Success: boolean; ResultCode?: string; ErrorMessage?: string }> }[]} */
    const idOps = [
      {
        key: CredentialingOperation.GetApplicationWorkspace,
        expected: 'not-found',
        call: (f) => new GetApplicationWorkspaceOperation().Execute({ ApplicationID: f ? foreign.ApplicationID : randomUUID().toUpperCase() }, { provider }),
      },
      {
        key: CredentialingOperation.SaveResponse,
        expected: 'not-found',
        call: (f) => new SaveResponseOperation().Execute({
          ResponseID: f ? foreign.ResponseIDs[0] : randomUUID().toUpperCase(),
          ResponseText: 'Probe text',
          SelfAssessment: 'Met',
          ExpectedUpdatedAt: new Date().toISOString(),
        }, { provider }),
      },
      {
        key: CredentialingOperation.ConfirmResponse,
        expected: 'not-found',
        call: (f) => new ConfirmResponseOperation().Execute({
          ResponseID: f ? foreign.ResponseIDs[0] : randomUUID().toUpperCase(),
          ExpectedUpdatedAt: new Date().toISOString(),
        }, { provider }),
      },
      {
        key: CredentialingOperation.WithdrawApplication,
        expected: 'not-found',
        call: (f) => new WithdrawApplicationOperation().Execute({
          ApplicationID: f ? foreign.ApplicationID : randomUUID().toUpperCase(),
          Reason: 'Probe withdrawal',
        }, { provider }),
      },
      {
        key: CredentialingOperation.AttestInLieu,
        expected: actorKind === 'applicant' ? 'not-found' : 'forbidden',
        call: (f) => new AttestInLieuOperation().Execute({
          SubjectID: f ? foreign.ID : randomUUID().toUpperCase(),
          DocumentRequirementID: f ? appTargets.ApplicantRequirementID : randomUUID().toUpperCase(),
          Statement: 'Probe attestation',
        }, { provider }),
      },
      {
        key: CredentialingOperation.ConfirmDocumentCurrent,
        expected: actorKind === 'applicant' ? 'not-found' : 'forbidden',
        call: (f) => new ConfirmDocumentCurrentOperation().Execute({
          EvidenceDocumentID: f ? foreign.Document.ID : randomUUID().toUpperCase(),
        }, { provider }),
      },
      {
        key: CredentialingOperation.GetDocumentLibrary,
        expected: 'not-found',
        call: (f) => new GetDocumentLibraryOperation().Execute({
          SubjectID: f ? foreign.ID : randomUUID().toUpperCase(),
        }, { provider }),
      },
      {
        key: CredentialingOperation.RequeueReading,
        expected: 'not-found',
        call: (f) => new RequeueReadingOperation().Execute({
          EvidenceDocumentID: f ? foreign.Document.ID : randomUUID().toUpperCase(),
        }, { provider }),
      },
      {
        key: CredentialingOperation.RefreshPrefills,
        expected: 'not-found',
        call: (f) => new RefreshPrefillsOperation().Execute({
          ApplicationID: f ? foreign.ApplicationID : randomUUID().toUpperCase(),
        }, { provider }),
      },
      {
        key: CredentialingOperation.GetSubmissionGate,
        expected: 'not-found',
        call: (f) => new GetSubmissionGateOperation().Execute({
          ApplicationID: f ? foreign.ApplicationID : randomUUID().toUpperCase(),
        }, { provider }),
      },
      {
        key: CredentialingOperation.SubmitApplication,
        expected: 'not-found',
        call: (f) => new SubmitApplicationOperation().Execute({
          ApplicationID: f ? foreign.ApplicationID : randomUUID().toUpperCase(),
          Attestation: null,
        }, { provider }),
      },
      {
        key: CredentialingOperation.ReopenResponse,
        expected: actorKind === 'staff' ? 'not-found' : 'forbidden',
        call: (f) => new ReopenResponseOperation().Execute({
          ResponseID: f ? foreign.ResponseIDs[0] : randomUUID().toUpperCase(),
          Reason: 'Probe reopen',
        }, { provider }),
      },
      {
        key: CredentialingOperation.SaveResponseSources,
        expected: actorKind === 'staff' ? 'not-found' : 'forbidden',
        call: (f) => new SaveResponseSourcesOperation().Execute({
          StandardID: f ? String(sampleTarget.Standards[0].ID) : randomUUID().toUpperCase(),
          Sources: [],
        }, { provider }),
      },
      {
        key: CredentialingOperation.InviteApplicant,
        expected: actorKind === 'staff' ? 'not-found' : 'forbidden',
        call: (f) => new InviteApplicantOperation().Execute({
          ProgramVersionID: f ? appTargets.ApplicantProgramVersionID : randomUUID().toUpperCase(),
          Subject: { ExistingSubjectID: f ? foreign.ID : randomUUID().toUpperCase() },
          Contact: { FirstName: 'Probe', LastName: 'Invite', Email: `probe.${randomUUID().slice(0, 8)}@example.test`, ContactRole: 'Primary' },
        }, { provider }),
      },
      {
        key: CredentialingOperation.ReissueInvitation,
        expected: actorKind === 'staff' ? 'not-found' : 'forbidden',
        call: (f) => new ReissueInvitationOperation().Execute({
          SubjectContactID: f ? foreign.ContactIDs[0] : randomUUID().toUpperCase(),
        }, { provider }),
      },
    ];

    for (const op of idOps) {
      testedKeys.add(op.key);
      const real = await op.call(true);
      const rand = await op.call(false);
      if (real.Success) {
        problems.push(`${op.key} SUCCEEDED`);
        continue;
      }
      if (op.expected === 'not-found' && (real.ResultCode !== 'REFUSED' || real.ErrorMessage !== NOT_FOUND)) {
        problems.push(`${op.key} expected REFUSED/${NOT_FOUND}, got ${describe(real)}`);
      }
      if (op.expected === 'forbidden' && real.ResultCode !== 'FORBIDDEN') {
        problems.push(`${op.key} expected FORBIDDEN, got ${describe(real)}`);
      }
      const realPayload = JSON.stringify({ Success: real.Success, ResultCode: real.ResultCode, ErrorMessage: real.ErrorMessage });
      const randPayload = JSON.stringify({ Success: rand.Success, ResultCode: rand.ResultCode, ErrorMessage: rand.ErrorMessage });
      if (realPayload !== randPayload) {
        problems.push(`${op.key} differs from random-UUID answer: ${realPayload} vs ${randPayload}`);
      }
    }

    // Completeness check against OperationKeys.ts (B1's 5 ops are covered in P8 + P10c; Tasks 4–11's 16 ops are here).
    const b1Keys = new Set([
      CredentialingOperation.CreateProgram,
      CredentialingOperation.CloneVersionToDraft,
      CredentialingOperation.ReorderVersionTree,
      CredentialingOperation.CreateOrganization,
      CredentialingOperation.CreateCommittee,
    ]);
    const missing = Object.values(CredentialingOperation).filter((k) => !b1Keys.has(k) && !testedKeys.has(k));
    if (missing.length > 0) {
      problems.push(`OperationKeys missing from probe: ${missing.join(', ')}`);
    }

    return {
      passed: problems.length === 0,
      detail: problems.length
        ? problems.join('; ')
        : `all ${testedKeys.size} Tasks 4–11 operations refused (${actorKind === 'applicant' ? '11 Record not found. + 4 FORBIDDEN + GetMySubjects own-only' : '13 Record not found. + 3 FORBIDDEN'}), byte-equal to random UUID`,
    };
  });
}

/**
 * P14 / P17-P14: `GET /credentialing/evidence/<applicant-b's document>/content` vs random UUID.
 * Signed-in non-authorized callers get 404 byte-equal to random UUID; unauthenticated gets MJAPI's 401 byte-equal to random UUID.
 * @param {string} id
 * @param {string} actorName
 * @param {string | null} bearerToken
 * @param {string} documentID
 * @param {number} expectedStatus
 */
async function caseEvidenceDownload(id, actorName, bearerToken, documentID, expectedStatus) {
  await probeCase(id, actorName, async () => {
    /** @param {string} docID */
    const get = async (docID) => {
      /** @type {Record<string, string>} */
      const headers = {};
      if (bearerToken != null) headers.Authorization = `Bearer ${bearerToken}`;
      const res = await fetch(`${MJAPI_BASE_URL}/credentialing/evidence/${encodeURIComponent(docID)}/content`, { headers });
      return { status: res.status, body: Buffer.from(await res.arrayBuffer()) };
    };
    const real = await get(documentID);
    const rand = await get(randomUUID().toUpperCase());
    const problems = [];
    if (real.status !== expectedStatus) problems.push(`expected status ${expectedStatus}, got ${real.status} (${real.body.toString('utf8')})`);
    if (rand.status !== expectedStatus) problems.push(`random UUID expected status ${expectedStatus}, got ${rand.status}`);
    if (!real.body.equals(rand.body)) {
      problems.push(`body differs from random UUID: "${real.body.toString('utf8')}" vs "${rand.body.toString('utf8')}"`);
    }
    return {
      passed: problems.length === 0,
      detail: problems.length ? problems.join('; ') : `HTTP ${real.status}, body byte-identical to random UUID (${real.body.toString('utf8')})`,
    };
  });
}

/**
 * P15: applicant-a calls generated Create/Update/Delete mutations on its OWN response, application and document.
 * @param {PersonaSession} applicant
 * @param {Session} control
 * @param {Awaited<ReturnType<typeof readApplicantTargets>>} appTargets
 */
async function caseOwnGeneratedMutations(applicant, control, appTargets) {
  await probeCase('P15', applicant.Name, async () => {
    const own = appTargets.SubjectOne;
    const session = applicant.Provider;
    const deleteOptions = { SkipEntityAIActions: false, SkipEntityActions: false, ReplayOnly: false, IsParentEntityDelete: false };
    const beforeResponses = await requireRows(control, CredentialingEntity.StandardResponse, `SubjectID = '${quote(own.ID)}'`, ['ID', 'Status', 'ResponseText']);
    const beforeApps = await requireRows(control, CredentialingEntity.Application, `SubjectID = '${quote(own.ID)}'`, ['ID', 'Status']);
    const beforeDocs = await requireRows(control, CredentialingEntity.EvidenceDocument, `SubjectID = '${quote(own.ID)}'`, ['ID', 'FileName']);

    const attempts = [
      {
        label: 'Create StandardResponse',
        kind: 'operation-only',
        gql: 'mutation ($input: CreatemjBizAppsCredentialingStandardResponseInput!) { CreatemjBizAppsCredentialingStandardResponse(input: $input) { ID } }',
        vars: { input: { ApplicationID: own.ApplicationID, StandardID: own.StandardID, SubjectID: own.ID, ResponseText: 'Direct create', SelfAssessment: null, Status: 'Empty', AuthorType: 'Human', LastEditedByUserID: null, ConfirmedByUserID: null, ConfirmedAt: null, SourceType: null, SourceLabel: null, SourceReference: null, SourceRetrievedAt: null, SourceRawValue: null, IsStale: false, ReopenReason: null } },
      },
      {
        label: 'Update StandardResponse',
        kind: 'operation-only',
        gql: 'mutation ($input: UpdatemjBizAppsCredentialingStandardResponseInput!) { UpdatemjBizAppsCredentialingStandardResponse(input: $input) { ID } }',
        vars: { input: { ID: own.ResponseIDs[0], Status: 'Confirmed', ResponseText: 'Direct bypass' } },
      },
      {
        label: 'Delete StandardResponse',
        kind: 'refused',
        gql: 'mutation ($id: String!, $options: DeleteOptionsInput!) { DeletemjBizAppsCredentialingStandardResponse(ID: $id, options___: $options) { ID } }',
        vars: { id: own.ResponseIDs[0], options: deleteOptions },
      },
      {
        label: 'Create Application',
        kind: 'operation-only',
        gql: 'mutation ($input: CreatemjBizAppsCredentialingApplicationInput!) { CreatemjBizAppsCredentialingApplication(input: $input) { ID } }',
        vars: { input: { SubjectID: own.ID, ProgramVersionID: appTargets.ApplicantProgramVersionID, Status: 'Draft', IsHistorical: false, SubmittedAt: null, SubmittedByUserID: null, SubmissionDispatchedAt: null, SubmissionDispatchClaimID: null, SubmissionDispatchClaimedAt: null, SubmissionDispatchAttempts: 0, SubmissionDispatchNote: null, SubjectSnapshot: null, AttestationOfficerName: null, AttestationOfficerRole: null, AttestationApprovalDate: null, AttestationStatement: null, AttestedByUserID: null, AttestedAt: null, WithdrawnAt: null, WithdrawnByUserID: null, WithdrawalReason: null } },
      },
      {
        label: 'Update Application',
        kind: 'operation-only',
        gql: 'mutation ($input: UpdatemjBizAppsCredentialingApplicationInput!) { UpdatemjBizAppsCredentialingApplication(input: $input) { ID } }',
        vars: { input: { ID: own.ApplicationID, Status: 'Submitted' } },
      },
      {
        label: 'Delete Application',
        kind: 'refused',
        gql: 'mutation ($id: String!, $options: DeleteOptionsInput!) { DeletemjBizAppsCredentialingApplication(ID: $id, options___: $options) { ID } }',
        vars: { id: own.ApplicationID, options: deleteOptions },
      },
      {
        label: 'Create EvidenceDocument',
        kind: 'operation-only',
        gql: 'mutation ($input: CreatemjBizAppsCredentialingEvidenceDocumentInput!) { CreatemjBizAppsCredentialingEvidenceDocument(input: $input) { ID } }',
        vars: { input: { SubjectID: own.ID, DocumentRequirementID: null, FileID: own.Document.FileID, FileName: 'direct.pdf', ContentType: 'application/pdf', SizeBytes: 100, ContentHash: 'a'.repeat(64), ExtractedText: null, TextStatus: 'Extracted', TextNote: null, PageCount: 1, ReadingStatus: 'Pending', ReadingNote: null, ReadingClaimID: null, ReadingClaimedAt: null, ReadingAttempts: 0, Status: 'Current', SupersedesDocumentID: null, ConfirmedCurrentAt: null, UploadedByUserID: session.CurrentUser.ID, UploadedAt: new Date().toISOString() } },
      },
      {
        label: 'Update EvidenceDocument',
        kind: 'operation-only',
        gql: 'mutation ($input: UpdatemjBizAppsCredentialingEvidenceDocumentInput!) { UpdatemjBizAppsCredentialingEvidenceDocument(input: $input) { ID } }',
        vars: { input: { ID: own.Document.ID, FileName: 'direct-rename.pdf' } },
      },
      {
        label: 'Delete EvidenceDocument',
        kind: 'refused',
        gql: 'mutation ($id: String!, $options: DeleteOptionsInput!) { DeletemjBizAppsCredentialingEvidenceDocument(ID: $id, options___: $options) { ID } }',
        vars: { id: own.Document.ID, options: deleteOptions },
      },
    ];

    const problems = [];
    for (const attempt of attempts) {
      const refusal = await gqlRefusal(session, attempt.gql, attempt.vars);
      if (refusal == null) {
        problems.push(`${attempt.label}: SUCCEEDED`);
      } else if (attempt.kind === 'operation-only' && !refusal.includes(OPERATION_ONLY_REASON)) {
        problems.push(`${attempt.label}: expected "${OPERATION_ONLY_REASON}", got "${refusal}"`);
      }
    }

    const [afterResponses, afterApps, afterDocs] = await Promise.all([
      requireRows(control, CredentialingEntity.StandardResponse, `SubjectID = '${quote(own.ID)}'`, ['ID', 'Status', 'ResponseText']),
      requireRows(control, CredentialingEntity.Application, `SubjectID = '${quote(own.ID)}'`, ['ID', 'Status']),
      requireRows(control, CredentialingEntity.EvidenceDocument, `SubjectID = '${quote(own.ID)}'`, ['ID', 'FileName']),
    ]);
    if (JSON.stringify(beforeResponses) !== JSON.stringify(afterResponses)) problems.push('StandardResponse rows changed');
    if (JSON.stringify(beforeApps) !== JSON.stringify(afterApps)) problems.push('Application rows changed');
    if (JSON.stringify(beforeDocs) !== JSON.stringify(afterDocs)) problems.push('EvidenceDocument rows changed');

    return {
      passed: problems.length === 0,
      detail: problems.length ? problems.join('; ') : 'all 9 generated Create/Update/Delete mutations on own response, application and document refused; rows unchanged',
    };
  });
}

/**
 * P16: applicant-a RunView on authoring + file/user/common/audit/AI entities returns 0 rows or permission refusal.
 * @param {PersonaSession} applicant
 * @param {Session} control
 */
async function caseP16NonReadableEntities(applicant, control) {
  await probeCase('P16', applicant.Name, async () => {
    const res = await readsNothingFromAll(applicant.Provider, P16_ENTITIES);
    // Confirm control actually sees rows in the platform/common tables so the refusal is non-vacuous.
    const controlFiles = await requireRows(control, 'MJ: Files', '', ['ID']);
    const controlAccounts = await requireRows(control, 'MJ: File Storage Accounts', '', ['ID']);
    if (controlFiles.length === 0 || controlAccounts.length === 0) {
      return { passed: false, detail: `control sees ${controlFiles.length} MJ: Files and ${controlAccounts.length} storage accounts` };
    }
    return res;
  });
}

/**
 * P19: applicant-a calls CreateMediaAccessToken, GetFileContents, CreatePreAuthDownloadUrl for applicant-b's and its own FileID.
 * @param {PersonaSession} applicant
 * @param {Awaited<ReturnType<typeof readApplicantTargets>>} appTargets
 */
async function caseFileResolvers(applicant, appTargets) {
  await probeCase('P19', applicant.Name, async () => {
    const session = applicant.Provider;
    const files = [
      { label: "applicant-b's FileID", fileID: appTargets.SubjectTwo.Document.FileID, objectKey: appTargets.SubjectTwo.Document.ObjectKey },
      { label: 'own FileID', fileID: appTargets.SubjectOne.Document.FileID, objectKey: appTargets.SubjectOne.Document.ObjectKey },
    ];
    const problems = [];
    const seen = [];
    for (const f of files) {
      // 1. CreateMediaAccessToken
      try {
        const res = await session.ExecuteGQL(
          'mutation ($fileId: String!) { CreateMediaAccessToken(fileId: $fileId) { Success Url ErrorMessage } }',
          { fileId: f.fileID },
        );
        const payload = res?.CreateMediaAccessToken;
        if (payload?.Success || payload?.Url) {
          problems.push(`CreateMediaAccessToken(${f.label}) SUCCEEDED: ${JSON.stringify(payload)}`);
        } else {
          seen.push(`CreateMediaAccessToken(${f.label}): "${payload?.ErrorMessage ?? 'refused'}"`);
        }
      } catch (e) {
        seen.push(`CreateMediaAccessToken(${f.label}): gql error`);
      }

      // 2. GetFileContents
      try {
        const res = await session.ExecuteGQL(
          'query ($fileId: String!) { GetFileContents(fileId: $fileId) { Success Base64 ErrorMessage } }',
          { fileId: f.fileID },
        );
        const payload = res?.GetFileContents;
        if (payload?.Success || payload?.Base64) {
          problems.push(`GetFileContents(${f.label}) SUCCEEDED`);
        } else {
          seen.push(`GetFileContents(${f.label}): "${payload?.ErrorMessage ?? 'refused'}"`);
        }
      } catch (e) {
        seen.push(`GetFileContents(${f.label}): gql error`);
      }

      // 3. CreatePreAuthDownloadUrl
      const preAuthRefusal = await gqlRefusal(
        session,
        'query ($input: CreatePreAuthDownloadUrlInput!) { CreatePreAuthDownloadUrl(input: $input) }',
        { input: { AccountID: appTargets.StorageAccountID, ObjectName: f.objectKey || 'credentialing-evidence/probe' } },
      );
      if (preAuthRefusal == null) {
        problems.push(`CreatePreAuthDownloadUrl(${f.label}) SUCCEEDED`);
      } else {
        seen.push(`CreatePreAuthDownloadUrl(${f.label}): "${preAuthRefusal}"`);
      }
    }
    return {
      passed: problems.length === 0,
      detail: problems.length ? `LEAK ${problems.join('; ')}` : `all 6 MJ file resolver calls refused (${seen.length} checked)`,
    };
  });
}

/**
 * P20: applicant-a calls SearchEntities for applicant-b's display name and a phrase from applicant-b's document text.
 * @param {PersonaSession} applicant
 * @param {Session} control
 * @param {Awaited<ReturnType<typeof readApplicantTargets>>} appTargets
 */
async function caseGlobalSearch(applicant, control, appTargets) {
  await probeCase('P20', applicant.Name, async () => {
    const foreign = appTargets.SubjectTwo;
    const textLines = foreign.Document.ExtractedText.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length >= 20);
    const phrase = textLines.find((l) => !appTargets.SubjectOne.Document.ExtractedText.includes(l)) ?? textLines[0];
    if (!phrase) {
      return { passed: false, detail: "applicant-b's document has no searchable extracted text phrase" };
    }
    // Control sanity check: SearchEntities actually finds Sample Applicant Two on Subject when authorized.
    const controlMatches = await control.SearchEntities([
      { entityName: CredentialingEntity.Subject, searchText: foreign.DisplayName, options: { mode: 'hybrid' } },
    ]);
    if (!controlMatches[0]?.some((r) => r.recordId.toLowerCase() === foreign.ID.toLowerCase())) {
      return { passed: false, detail: `control SearchEntities did not match ${foreign.DisplayName} (non-vacuous check failed)` };
    }

    // SearchEntitiesResolver caps batches at MAX_SEARCH_ENTITIES_BATCH_SIZE = 20.
    const searchTargets = [...ALL_CREDENTIALING_ENTITIES, 'MJ: Files', 'MJ: AI Prompt Runs', 'MJ: Users'];
    const queries = [
      { label: 'display name', text: foreign.DisplayName },
      { label: 'document phrase', text: phrase },
    ];
    const problems = [];
    for (const q of queries) {
      for (const mode of ['hybrid', 'lexical']) {
        const params = searchTargets.map((entityName) => ({ entityName, searchText: q.text, options: { mode } }));
        const groups = await applicant.Provider.SearchEntities(params);
        groups.forEach((resultsForEntity, i) => {
          if (resultsForEntity.length > 0) {
            problems.push(`SearchEntities(${q.label}, ${mode}, ${searchTargets[i]}) returned ${resultsForEntity.length} result(s): ${resultsForEntity.map((r) => r.recordId).join(', ')}`);
          }
        });
      }
    }
    return {
      passed: problems.length === 0,
      detail: problems.length
        ? `LEAK ${problems.join('; ')}`
        : `SearchEntities across ${searchTargets.length} entities (hybrid + lexical) returned 0 results for "${foreign.DisplayName}" and "${phrase.slice(0, 40)}…"`,
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

    await caseSevenEntities('P1', applicant, AUTHORING_ENTITIES);
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
    const committeeTypes = await requireRows(control.Provider, 'Committees: Types', '', ['ID']);
    if (committeeTypes.length === 0) throw new Error('the control reader sees no committee type, so CreateCommittee would be refused for its type');
    await caseCreateCommittee(staffB, control.Provider, target, String(committeeTypes[0].ID), 'not-found');
    await caseCreateCommittee(applicant, control.Provider, target, String(committeeTypes[0].ID), 'forbidden');

    // B2 applicant-data cases (P11–P20)
    const appTargets = await readApplicantTargets(control.Provider, staffA.Provider);
    const orgBSubjects = await requireRows(control.Provider, CredentialingEntity.Subject, `AccreditingOrganizationID = '${quote(appTargets.SubjectOrgB.AccreditingOrganizationID)}'`, ['ID']);
    const orgBAllowed = new Set(orgBSubjects.map((r) => String(r.ID).toLowerCase()));

    await caseApplicantDataRunViews(
      'P11',
      applicant,
      new Set([appTargets.SubjectOne.ID.toLowerCase()]),
      [appTargets.SubjectOne.ID],
      [appTargets.SubjectTwo.ID.toLowerCase(), appTargets.SubjectOrgB.ID.toLowerCase()],
    );
    await caseForeignSingleRecordLoad('P12', applicant, appTargets.SubjectTwo);
    await caseB2Operations('P13', applicant, 'applicant', appTargets, target);
    await caseEvidenceDownload('P14', applicant.Name, applicant.Token, appTargets.SubjectTwo.Document.ID, 404);
    await caseEvidenceDownload('P14', staffB.Name, staffB.Token, appTargets.SubjectTwo.Document.ID, 404);
    await caseEvidenceDownload('P14', 'no-token', null, appTargets.SubjectTwo.Document.ID, 401);
    await caseOwnGeneratedMutations(applicant, control.Provider, appTargets);
    await caseP16NonReadableEntities(applicant, control.Provider);
    await caseApplicantDataRunViews(
      'P17-P11',
      staffB,
      orgBAllowed,
      [appTargets.SubjectOrgB.ID],
      [appTargets.SubjectOne.ID.toLowerCase(), appTargets.SubjectTwo.ID.toLowerCase()],
    );
    await caseForeignSingleRecordLoad('P17-P12', staffB, appTargets.SubjectTwo);
    await caseB2Operations('P17-P13', staffB, 'staff', appTargets, target);
    await caseEvidenceDownload('P17-P14', staffB.Name, staffB.Token, appTargets.SubjectTwo.Document.ID, 404);
    await probeCase('P18', reviewer.Name, () => readsNothingFromAll(reviewer.Provider, APPLICANT_DATA_ENTITIES.map((e) => e.Name)));
    await probeCase('P18', committee.Name, () => readsNothingFromAll(committee.Provider, APPLICANT_DATA_ENTITIES.map((e) => e.Name)));
    await caseFileResolvers(applicant, appTargets);
    await caseGlobalSearch(applicant, control.Provider, appTargets);
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
