import { LogError, RunView, type IMetadataProvider, type RunViewParams, type UserInfo } from '@memberjunction/core';
import { IsValidUUID } from '@memberjunction/global';
import { CredentialingEntity, type VersionStatus } from '@mj-biz-apps/credentialing-core';

/** The parts of a program its children's rules read. */
export interface LoadedProgram {
    ID: string;
    AccreditingOrganizationID: string;
}

/** The parts of a version its children's rules read. */
export interface LoadedVersion {
    ID: string;
    Status: VersionStatus;
    ProgramID: string;
    ClonedFromVersionID: string | null;
}

/** The parts of a section its children's rules read. */
export interface LoadedSection {
    ID: string;
    ProgramVersionID: string;
}

/** The parts of an accrediting organization a new program's rules read. */
export interface LoadedAccreditingOrganization {
    ID: string;
}

/**
 * Loads the parent of a row being written, **as the caller**: through the caller's permissions and
 * row filters, so a parent the caller cannot read comes back `null` exactly as one that does not
 * exist. Callers refuse the write with `NOT_FOUND_REASON` in both cases (BR-13), which keeps another
 * organization's IDs indistinguishable from random ones.
 *
 * A read that fails (no read permission on the entity, or a database error) is logged and also comes
 * back `null`: the write it guards is refused rather than let through unchecked.
 */
export class ParentVersionLoader {
    public static LoadProgram(programID: string, contextUser: UserInfo, provider: IMetadataProvider): Promise<LoadedProgram | null> {
        return ParentVersionLoader.loadOne<LoadedProgram>(ParentVersionLoader.ProgramParams(programID), contextUser, provider);
    }

    public static LoadVersion(versionID: string, contextUser: UserInfo, provider: IMetadataProvider): Promise<LoadedVersion | null> {
        return ParentVersionLoader.loadOne<LoadedVersion>(ParentVersionLoader.VersionParams(versionID), contextUser, provider);
    }

    public static LoadSection(sectionID: string, contextUser: UserInfo, provider: IMetadataProvider): Promise<LoadedSection | null> {
        return ParentVersionLoader.loadOne<LoadedSection>(ParentVersionLoader.SectionParams(sectionID), contextUser, provider);
    }

    public static LoadAccreditingOrganization(
        organizationID: string,
        contextUser: UserInfo,
        provider: IMetadataProvider,
    ): Promise<LoadedAccreditingOrganization | null> {
        return ParentVersionLoader.loadOne<LoadedAccreditingOrganization>(
            ParentVersionLoader.byID(CredentialingEntity.AccreditingOrganization, organizationID, ['ID']),
            contextUser,
            provider,
        );
    }

    /** RunView parameters reading one program by ID; for callers that batch it into a RunViews call. */
    public static ProgramParams(programID: string): RunViewParams {
        return ParentVersionLoader.byID(CredentialingEntity.Program, programID, ['ID', 'AccreditingOrganizationID']);
    }

    /** RunView parameters reading one version by ID; for callers that batch it into a RunViews call. */
    public static VersionParams(versionID: string): RunViewParams {
        return ParentVersionLoader.byID(CredentialingEntity.ProgramVersion, versionID, ['ID', 'Status', 'ProgramID', 'ClonedFromVersionID']);
    }

    /** RunView parameters reading one section by ID; for callers that batch it into a RunViews call. */
    public static SectionParams(sectionID: string): RunViewParams {
        return ParentVersionLoader.byID(CredentialingEntity.Section, sectionID, ['ID', 'ProgramVersionID']);
    }

    /**
     * Parameters reading one row by ID. An ID that is not a UUID matches nothing (`1 = 0`) rather
     * than reaching the filter text, so nothing a client sends is ever spliced into SQL.
     */
    private static byID(entityName: string, id: string | null | undefined, fields: string[]): RunViewParams {
        const filter = id != null && IsValidUUID(id) ? `ID = '${id}'` : '1 = 0';
        return { EntityName: entityName, ExtraFilter: filter, Fields: fields, ResultType: 'simple', MaxRows: 1 };
    }

    private static async loadOne<T>(params: RunViewParams, contextUser: UserInfo, provider: IMetadataProvider): Promise<T | null> {
        const result = await RunView.FromMetadataProvider(provider).RunView<T>(params, contextUser);
        if (!result.Success) {
            LogError(`ParentVersionLoader: reading ${params.EntityName} as ${contextUser?.Email ?? 'no user'} failed: ${result.ErrorMessage}`);
            return null;
        }
        return result.Results[0] ?? null;
    }
}
