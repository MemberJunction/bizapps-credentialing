import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { RunViewParams, RunViewResult, UserInfo } from '@memberjunction/core';

interface MjAppManifest {
  name: string;
  metadata?: { directory?: string };
}

interface RootSyncConfig {
  directoryOrder?: string[];
}

interface SkillSyncConfig {
  entity?: string;
  filePattern?: string;
  pull?: {
    filter?: string;
    relatedEntities?: Record<string, { entity: string; foreignKey: string }>;
  };
}

interface AgentSkillRecord {
  fields: {
    AgentID: string;
    SkillID: string;
    Status: string;
  };
  primaryKey: { ID: string };
  sync?: Record<string, string>;
}

interface SkillRecord {
  fields: {
    Name: string;
    Description: string;
    Instructions: string;
    Status: string;
    ActivationMode: string;
    Category?: string;
    IconClass?: string;
    CreatedByUserID: string;
  };
  relatedEntities?: {
    'MJ: AI Agent Skills'?: AgentSkillRecord[];
  };
  primaryKey: { ID: string };
  sync?: Record<string, string>;
}

interface SimulatedAgent {
  ID: string;
  Name: string;
  BaseAgentID: string | null;
}

interface OrgMembershipRow {
  AccreditingOrganizationID: string;
  UserID: string;
}

interface SubjectContactRow {
  SubjectID: string;
  UserID: string;
  ContactRole: 'Primary' | 'Staff';
}

interface SubjectRow {
  ID: string;
  AccreditingOrganizationID: string;
  DisplayName: string;
  Status: 'Active' | 'Inactive';
}

interface ApplicationRow {
  ID: string;
  SubjectID: string;
  ProgramVersionID: string;
  Status:
    | 'Draft'
    | 'Submitted'
    | 'Screening'
    | 'Info Requested'
    | 'In Review'
    | 'Committee'
    | 'Executive Sign-Off'
    | 'Decided'
    | 'Closed'
    | 'Withdrawn';
}

interface EvidenceDocumentRow {
  ID: string;
  SubjectID: string;
  FileName: string;
  Status: 'Current' | 'Confirm Current' | 'Superseded';
}

interface CredentialingDataset {
  orgMemberships: OrgMembershipRow[];
  subjectContacts: SubjectContactRow[];
  subjects: SubjectRow[];
  applications: ApplicationRow[];
  evidenceDocuments: EvidenceDocumentRow[];
}

interface CredentialingBriefing {
  userId: string;
  subjects: SubjectRow[];
  applications: ApplicationRow[];
  evidenceDocuments: EvidenceDocumentRow[];
}

const UUID_V4_RE = /^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/;
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const SKILL_DIR = join(REPO_ROOT, 'metadata', 'chief-of-staff-skills');
const SKILL_FILE = join(SKILL_DIR, '.chief-of-staff-credentialing-skill.json');

function readJsonFile<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, 'utf8')) as T;
}

function makeUser(id: string, email: string, roles: string[]): UserInfo {
  return {
    ID: id,
    Email: email,
    Name: email,
    UserRoles: roles.map((role) => ({ Role: role })),
  } as UserInfo;
}

function resolveEffectiveSkillNames(
  agent: SimulatedAgent,
  allAgents: SimulatedAgent[],
  skills: SkillRecord[],
): string[] {
  const lineage = new Set<string>([agent.Name]);
  let cursor: SimulatedAgent | undefined = agent;
  while (cursor?.BaseAgentID) {
    const parent = allAgents.find((a) => a.ID === cursor?.BaseAgentID);
    if (!parent || lineage.has(parent.Name)) break;
    lineage.add(parent.Name);
    cursor = parent;
  }

  return skills
    .filter((skill) => skill.fields.Status === 'Active')
    .filter((skill) =>
      (skill.relatedEntities?.['MJ: AI Agent Skills'] ?? []).some((grant) => {
        if (grant.fields.Status !== 'Active') return false;
        const prefix = '@lookup:MJ: AI Agents.Name=';
        return grant.fields.AgentID.startsWith(prefix) && lineage.has(grant.fields.AgentID.slice(prefix.length));
      }),
    )
    .map((skill) => skill.fields.Name);
}

/**
 * Typed RunView harness modeling Credentialing's shipped RLS filters from
 * `metadata/row-level-security-filters/.row-level-security-filters.json`:
 *   - `Credentialing: Staff Subjects` & `Credentialing: Staff Rows By Subject`
 *   - `Credentialing: Applicant Subjects` & `Credentialing: Applicant Rows By Subject`
 */
class CredentialingRlsRunViewHarness {
  private readonly dataset: CredentialingDataset;

  constructor(dataset: CredentialingDataset) {
    this.dataset = dataset;
  }

  private visibleSubjectIds(contextUser: UserInfo): Set<string> {
    const roleNames = new Set((contextUser.UserRoles ?? []).map((r) => r.Role));
    const visible = new Set<string>();

    if (roleNames.has('Credentialing Staff')) {
      const staffOrgs = new Set(
        this.dataset.orgMemberships
          .filter((m) => m.UserID === contextUser.ID)
          .map((m) => m.AccreditingOrganizationID),
      );
      for (const subject of this.dataset.subjects) {
        if (staffOrgs.has(subject.AccreditingOrganizationID)) {
          visible.add(subject.ID);
        }
      }
    }

    if (roleNames.has('Credentialing Applicant')) {
      for (const contact of this.dataset.subjectContacts) {
        if (contact.UserID === contextUser.ID) {
          visible.add(contact.SubjectID);
        }
      }
    }

    return visible;
  }

  public async RunView<T>(params: RunViewParams, contextUser: UserInfo): Promise<RunViewResult<T>> {
    const allowedSubjects = this.visibleSubjectIds(contextUser);

    if (params.EntityName === 'MJ_BizApps_Credentialing: Subjects') {
      const rows = this.dataset.subjects.filter((s) => allowedSubjects.has(s.ID));
      return this.ok(rows as T[]);
    }

    if (params.EntityName === 'MJ_BizApps_Credentialing: Applications') {
      const rows = this.dataset.applications.filter((a) => allowedSubjects.has(a.SubjectID));
      return this.ok(rows as T[]);
    }

    if (params.EntityName === 'MJ_BizApps_Credentialing: Evidence Documents') {
      const rows = this.dataset.evidenceDocuments.filter((d) => allowedSubjects.has(d.SubjectID));
      return this.ok(rows as T[]);
    }

    return {
      Success: false,
      Results: [],
      UserViewRunID: '',
      RowCount: 0,
      TotalRowCount: 0,
      ExecutionTime: 0,
      ErrorMessage: `Unsupported entity in test harness: ${params.EntityName}`,
    };
  }

  private ok<T>(rows: T[]): RunViewResult<T> {
    return {
      Success: true,
      Results: rows,
      UserViewRunID: '',
      RowCount: rows.length,
      TotalRowCount: rows.length,
      ExecutionTime: 1,
      ErrorMessage: '',
    };
  }
}

async function queryCredentialingBriefing(
  runView: CredentialingRlsRunViewHarness,
  contextUser: UserInfo,
): Promise<CredentialingBriefing> {
  const [subjectsRes, appsRes, docsRes] = await Promise.all([
    runView.RunView<SubjectRow>({ EntityName: 'MJ_BizApps_Credentialing: Subjects', ResultType: 'simple' }, contextUser),
    runView.RunView<ApplicationRow>({ EntityName: 'MJ_BizApps_Credentialing: Applications', ResultType: 'simple' }, contextUser),
    runView.RunView<EvidenceDocumentRow>(
      { EntityName: 'MJ_BizApps_Credentialing: Evidence Documents', ResultType: 'simple' },
      contextUser,
    ),
  ]);

  if (!subjectsRes.Success || !appsRes.Success || !docsRes.Success) {
    throw new Error('Credentialing Chief of Staff RunView read failed');
  }

  return {
    userId: contextUser.ID,
    subjects: subjectsRes.Results,
    applications: appsRes.Results,
    evidenceDocuments: docsRes.Results,
  };
}

describe('Credentialing Chief of Staff skill — metadata & auto-install integrity', () => {
  it('wires metadata/chief-of-staff-skills into mj-app.json and metadata/.mj-sync.json', () => {
    const appManifest = readJsonFile<MjAppManifest>(join(REPO_ROOT, 'mj-app.json'));
    expect(appManifest.metadata?.directory).toBe('metadata');

    const rootSync = readJsonFile<RootSyncConfig>(join(REPO_ROOT, 'metadata', '.mj-sync.json'));
    expect(rootSync.directoryOrder).toContain('chief-of-staff-skills');

    const skillSync = readJsonFile<SkillSyncConfig>(join(SKILL_DIR, '.mj-sync.json'));
    expect(skillSync.entity).toBe('MJ: AI Skills');
    expect(skillSync.pull?.relatedEntities?.['MJ: AI Agent Skills']?.foreignKey).toBe('SkillID');
  });

  it('declares a valid Chief of Staff skill with UUIDv4 keys, zero sync blocks, real Credentialing entities, and Pepper inheritance', () => {
    const records = readJsonFile<SkillRecord[]>(SKILL_FILE);
    expect(records).toHaveLength(1);

    const skill = records[0];
    expect(skill.sync).toBeUndefined();
    expect(skill.primaryKey.ID).toMatch(UUID_V4_RE);
    expect(skill.fields.Name).toBe('Credentialing & Accreditation');
    expect(skill.fields.Status).toBe('Active');
    expect(skill.fields.ActivationMode).toBe('Auto');
    expect(skill.fields.CreatedByUserID).toBe('@lookup:MJ: Users.Name=System');

    const grants = skill.relatedEntities?.['MJ: AI Agent Skills'] ?? [];
    expect(grants).toHaveLength(1);
    expect(grants[0].sync).toBeUndefined();
    expect(grants[0].primaryKey.ID).toMatch(UUID_V4_RE);
    expect(grants[0].fields.AgentID).toBe('@lookup:MJ: AI Agents.Name=Chief of Staff');
    expect(grants[0].fields.SkillID).toBe('@parent:ID');
    expect(grants[0].fields.Status).toBe('Active');

    expect(skill.fields.Instructions.startsWith('@file:')).toBe(true);
    const templatePath = join(SKILL_DIR, skill.fields.Instructions.slice('@file:'.length));
    expect(existsSync(templatePath)).toBe(true);

    const markdown = readFileSync(templatePath, 'utf8');
    expect(markdown).toContain('MJ_BizApps_Credentialing: Accrediting Organizations');
    expect(markdown).toContain('MJ_BizApps_Credentialing: Programs');
    expect(markdown).toContain('MJ_BizApps_Credentialing: Applications');
    expect(markdown).toContain('MJ_BizApps_Credentialing: Standard Responses');
    expect(markdown).toContain('MJ_BizApps_Credentialing: Evidence Documents');
    expect(markdown).toContain('RunView');
    expect(markdown).toMatch(/never execute raw SQL/i);

    const chiefTemplate: SimulatedAgent = {
      ID: '11111111-1111-4111-8111-111111111111',
      Name: 'Chief of Staff',
      BaseAgentID: null,
    };
    const pepper: SimulatedAgent = {
      ID: '22222222-2222-4222-8222-222222222222',
      Name: 'Pepper',
      BaseAgentID: chiefTemplate.ID,
    };
    expect(resolveEffectiveSkillNames(pepper, [chiefTemplate, pepper], records)).toEqual([
      'Credentialing & Accreditation',
    ]);
  });
});

describe('Credentialing Chief of Staff skill — two-user organization & applicant RLS isolation', () => {
  const orgA = 'ORG-A-0001';
  const orgB = 'ORG-B-0002';

  const dataset: CredentialingDataset = {
    orgMemberships: [
      { AccreditingOrganizationID: orgA, UserID: 'staff-org-a' },
      { AccreditingOrganizationID: orgB, UserID: 'staff-org-b' },
    ],
    subjectContacts: [
      { SubjectID: 'subj-a1', UserID: 'applicant-a1', ContactRole: 'Primary' },
      { SubjectID: 'subj-a2', UserID: 'applicant-a2', ContactRole: 'Primary' },
    ],
    subjects: [
      { ID: 'subj-a1', AccreditingOrganizationID: orgA, DisplayName: 'Northside Clinic', Status: 'Active' },
      { ID: 'subj-a2', AccreditingOrganizationID: orgA, DisplayName: 'Eastside Lab', Status: 'Active' },
      { ID: 'subj-b1', AccreditingOrganizationID: orgB, DisplayName: 'Summit Institute', Status: 'Active' },
    ],
    applications: [
      { ID: 'app-a1', SubjectID: 'subj-a1', ProgramVersionID: 'pv-a', Status: 'In Review' },
      { ID: 'app-a2', SubjectID: 'subj-a2', ProgramVersionID: 'pv-a', Status: 'Draft' },
      { ID: 'app-b1', SubjectID: 'subj-b1', ProgramVersionID: 'pv-b', Status: 'Committee' },
    ],
    evidenceDocuments: [
      { ID: 'doc-a1', SubjectID: 'subj-a1', FileName: 'northside-bylaws.pdf', Status: 'Current' },
      { ID: 'doc-a2', SubjectID: 'subj-a2', FileName: 'eastside-audit.pdf', Status: 'Current' },
      { ID: 'doc-b1', SubjectID: 'subj-b1', FileName: 'summit-charter.pdf', Status: 'Current' },
    ],
  };

  it('isolates Staff users across Accrediting Organizations and isolates Applicants to only their linked Subjects', async () => {
    const harness = new CredentialingRlsRunViewHarness(dataset);

    const staffOrgA = makeUser('staff-org-a', 'staff.a@org-a.example', ['Credentialing Staff']);
    const staffOrgB = makeUser('staff-org-b', 'staff.b@org-b.example', ['Credentialing Staff']);
    const applicantA1 = makeUser('applicant-a1', 'contact@northside.example', ['Credentialing Applicant']);
    const applicantA2 = makeUser('applicant-a2', 'contact@eastside.example', ['Credentialing Applicant']);

    const [briefStaffA, briefStaffB, briefAppA1, briefAppA2] = await Promise.all([
      queryCredentialingBriefing(harness, staffOrgA),
      queryCredentialingBriefing(harness, staffOrgB),
      queryCredentialingBriefing(harness, applicantA1),
      queryCredentialingBriefing(harness, applicantA2),
    ]);

    // Staff A sees only Org A's two subjects/applications/documents.
    expect(briefStaffA.subjects.map((s) => s.ID)).toEqual(['subj-a1', 'subj-a2']);
    expect(briefStaffA.applications.map((a) => a.ID)).toEqual(['app-a1', 'app-a2']);
    expect(briefStaffA.evidenceDocuments.map((d) => d.ID)).toEqual(['doc-a1', 'doc-a2']);

    // Staff B sees only Org B's subject/application/document — zero overlap with Staff A.
    expect(briefStaffB.subjects.map((s) => s.ID)).toEqual(['subj-b1']);
    expect(briefStaffB.applications.map((a) => a.ID)).toEqual(['app-b1']);
    expect(briefStaffB.evidenceDocuments.map((d) => d.ID)).toEqual(['doc-b1']);

    // Applicant A1 and Applicant A2 belong to the same Accrediting Organization, yet each sees ONLY their own Subject.
    expect(briefAppA1.subjects.map((s) => s.ID)).toEqual(['subj-a1']);
    expect(briefAppA1.applications.map((a) => a.ID)).toEqual(['app-a1']);
    expect(briefAppA1.evidenceDocuments.map((d) => d.ID)).toEqual(['doc-a1']);

    expect(briefAppA2.subjects.map((s) => s.ID)).toEqual(['subj-a2']);
    expect(briefAppA2.applications.map((a) => a.ID)).toEqual(['app-a2']);
    expect(briefAppA2.evidenceDocuments.map((d) => d.ID)).toEqual(['doc-a2']);
  });
});
