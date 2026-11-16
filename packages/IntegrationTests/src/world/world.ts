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
    /** Holds only `Credentialing Applicant` (`applicant.a@example.test`). */
    ApplicantA: UserInfo;
}

/** The organizations, committee and sample program the checks read. */
export interface WorldData {
    OrgA: WorldOrganization;
    OrgB: WorldOrganization;
    /** A committee owned by OrgA's Common organization. */
    CommitteeA: WorldCommittee;
    /**
     * `Sample Certified Practitioner` in OrgA, with its Draft version `2027`. Read-only to checks:
     * a check that changes a program makes its own with `MakeScratchProgram`.
     */
    SampleProgram: ProgramTree;
    /** `Sample Program B` in OrgB, StaffB's organization, with its Draft version `2027`. Read-only to checks. */
    ProgramB: ProgramTree;
}

/** Everything a credentialing check can rely on existing. */
export interface CredentialingWorld extends WorldUsers, WorldData {
    Loaded: boolean;
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
