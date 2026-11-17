import type { UserInfo } from '@memberjunction/core';
import type { ProgramTree } from './program-tree.js';

/** An accrediting organization of the world, with the BizApps Common organization it stands for. */
export interface WorldOrganization {
    ID: string;
    Name: string;
    /** The BizApps Common `Organization` row behind this accrediting organization. */
    OrganizationID: string;
}

/** A BizApps Committees committee of the world. */
export interface WorldCommittee {
    ID: string;
    Name: string;
}

/**
 * The users every credentialing check can act as. Each holds exactly the roles named here: no world
 * user holds `Developer` or `UI` beside a credentialing role, because a role with an unfiltered grant
 * exempts its holder from every other role's row filter on that entity
 * (`EntityInfo.UserExemptFromRowLevelSecurity`), which would hide an isolation defect.
 */
export interface WorldUsers {
    /** Staff member of OrgA (`staff.a@example.test`, `Credentialing Staff`). */
    StaffA: UserInfo;
    /** Staff member of OrgB (`staff.b@example.test`, `Credentialing Staff`). */
    StaffB: UserInfo;
    /** Holds `Credentialing Staff` and no organization membership (`staff.none@example.test`). */
    StaffNoMembership: UserInfo;
    /** The credentialing administrator who sets up organizations (`admin@example.test`, `Credentialing Admin`). */
    Admin: UserInfo;
    /** Holds only the platform `UI` role (`ui.only@example.test`). */
    UIOnly: UserInfo;
    /**
     * Holds only `Credentialing Applicant` (`applicant.a@example.test`); the contact of
     * `Sample Applicant One` (see {@link WorldApplicants}).
     */
    ApplicantA: UserInfo;
    /**
     * Holds only `Credentialing Applicant` (`applicant.two@example.test`); contact of both
     * `Sample Applicant One` and `Sample Applicant Two`.
     */
    ApplicantTwo: UserInfo;
}

/** A subject of the world with its contacts and its Draft application on its organization's Active version. */
export interface WorldSubject {
    ID: string;
    DisplayName: string;
    AccreditingOrganizationID: string;
    /** The subject's contacts, in the order they were added; the first is the primary contact. */
    Contacts: UserInfo[];
    /** The Draft application on the organization's sample Active version. */
    ApplicationID: string;
    /** The ID of every response of that application (one per standard of the version). */
    ResponseIDs: string[];
    /** Optional Draft application on `Sample Large Program` (150 standards) for Sample Applicant Two. */
    LargeApplicationID?: string;
}

/**
 * The applicant world. Written by `EnsureApplicantWorld` as the system user inside the server's
 * operation-only write path, so it holds only states an operation could create: each subject has a
 * party record, its contacts were invited by staff of its organization, and its Draft application is
 * on an Active version of its own organization with one Empty response per standard.
 */
export interface WorldApplicants {
    /** `Sample Applicant One` in OrgA; contacts ApplicantA (`applicant.a@example.test`) and `applicant.two@example.test`. */
    SubjectOne: WorldSubject;
    /** `Sample Applicant Two` in OrgA; contact `applicant.b@example.test`. */
    SubjectTwo: WorldSubject;
    /** `Sample Applicant Org B` in OrgB; contact `applicant.orgb@example.test`. */
    SubjectOrgB: WorldSubject;
    /**
     * `Sample Evidence Applicant` in OrgA; contact `applicant.evidence@example.test`; its Draft
     * application is on `Sample Evidence Program` 2026. Evidence checks upload and attest for it.
     */
    SubjectEvidence: WorldSubject;
}

/** The organizations, committee and sample program the checks read. */
export interface WorldData {
    OrgA: WorldOrganization;
    OrgB: WorldOrganization;
    /** A committee owned by OrgA's Common organization. */
    CommitteeA: WorldCommittee;
    /** A committee owned by OrgB's Common organization (the deciding committee of OrgB's Active version). */
    CommitteeB: WorldCommittee;
    /**
     * `Sample Certified Practitioner` in OrgA, with its Draft version `2027`. Read-only to checks:
     * a check that changes a program makes its own with `MakeScratchProgram`.
     */
    SampleProgram: ProgramTree;
    /**
     * `Placeholder Organization Program (sample data)` in OrgA, with its Draft version `2027`.
     * Read-only to checks.
     */
    PlaceholderProgram: ProgramTree;
    /** `Sample Program B` in OrgB, StaffB's organization, with its Draft version `2027`. Read-only to checks. */
    ProgramB: ProgramTree;
    /**
     * `Sample Applicant Program` in OrgA with its **Active** version `2026` (deciding committee
     * CommitteeA): "the sample Active version" the applicant world and the invitation tasks use.
     * Read-only to checks.
     */
    ApplicantProgram: ProgramTree;
    /** `Sample Program B Applicants` in OrgB with its Active version `2026` (CommitteeB). Read-only to checks. */
    ApplicantProgramB: ProgramTree;
    /** `Sample Large Program` in OrgA with Active version `2026` (10 sections × 15 standards = 150). Read-only to checks. */
    LargeProgram: ProgramTree;
    /**
     * `Sample Evidence Program` in OrgA with Active version `2026`: one `Normal` and one
     * `Restricted Allowed` document requirement. Read-only to checks.
     */
    EvidenceProgram: ProgramTree;
}

/** Everything a credentialing check can rely on existing. */
export interface CredentialingWorld extends WorldUsers, WorldData {
    Loaded: boolean;
    Applicants: WorldApplicants;
}

let current: CredentialingWorld | null = null;

export function SetWorld(world: CredentialingWorld): void {
    current = world;
}

export function GetWorld(): CredentialingWorld | null {
    return current;
}

export function World(): CredentialingWorld {
    if (!current) {
        throw new Error('CredentialingWorld has not been loaded. Call GetOrLoadWorld(ctx) first.');
    }
    return current;
}
