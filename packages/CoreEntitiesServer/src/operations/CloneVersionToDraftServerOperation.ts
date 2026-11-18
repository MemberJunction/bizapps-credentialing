/**
 * Server body of `Credentialing.CloneVersionToDraft` (FRD FR-2.2): copies an Active or Retired
 * version — settings, sections, standards, document requirements — into a new Draft of the same
 * program, in one transaction. Every row is saved as the caller, parent before child and one at a
 * time, so each guard reads its parent through the open transaction; the first refusal rolls the
 * whole copy back.
 */
import {
    BaseRemotableOperation,
    RunView,
    type BaseEntity,
    type IMetadataProvider,
    type RunViewParams,
    type UserInfo,
} from '@memberjunction/core';
import { IsValidUUID, RegisterClass, UUIDsEqual } from '@memberjunction/global';
import {
    CREDENTIALING_STAFF_ROLE,
    CloneVersionToDraftOperation,
    CredentialingEntity,
    CredentialingOperation,
    NOT_FOUND_REASON,
    type CloneVersionToDraftInput,
    type CloneVersionToDraftOutput,
} from '@mj-biz-apps/credentialing-core';
import type {
    mjBizAppsCredentialingDocumentRequirementEntity,
    mjBizAppsCredentialingProgramVersionEntity,
    mjBizAppsCredentialingSectionEntity,
    mjBizAppsCredentialingStandardEntity,
} from '@mj-biz-apps/credentialing-entities';
import type { StandardEntityServer } from '../StandardEntityServer.js';
import { OperationSupport } from './OperationSupport.js';

type VersionEntity = mjBizAppsCredentialingProgramVersionEntity;
type SectionEntity = mjBizAppsCredentialingSectionEntity;
type StandardEntity = mjBizAppsCredentialingStandardEntity;
type DocumentRequirementEntity = mjBizAppsCredentialingDocumentRequirementEntity;

/** The refusal given for a source version that is still a Draft. */
export const CLONE_SOURCE_STATUS_REASON = 'Only an Active or Retired version can be copied into a new draft.';

/** The source version and its tree, as stored, read as the caller. */
interface SourceTree {
    Version: VersionEntity;
    Sections: SectionEntity[];
    Standards: StandardEntity[];
    DocumentRequirements: DocumentRequirementEntity[];
}

@RegisterClass(BaseRemotableOperation, CredentialingOperation.CloneVersionToDraft)
export class CloneVersionToDraftServerOperation extends CloneVersionToDraftOperation {
    /**
     * Test seam: when set, the copy throws after saving this many standards, so a check can prove a
     * failure partway leaves nothing behind. A static on the server class: no client input reaches it.
     */
    public static FailAfterStandards: number | null = null;

    protected override async Authorize(_input: CloneVersionToDraftInput, user: UserInfo): Promise<boolean> {
        return OperationSupport.HoldsRole(user, CREDENTIALING_STAFF_ROLE);
    }

    protected override async InternalExecute(
        input: CloneVersionToDraftInput,
        provider: IMetadataProvider,
        user: UserInfo,
    ): Promise<CloneVersionToDraftOutput> {
        return OperationSupport.InTransaction(provider, async () => {
            const source = await this.loadSource(input.SourceVersionID, provider, user);
            if (source.Version.Status !== 'Active' && source.Version.Status !== 'Retired') {
                OperationSupport.Refuse(CLONE_SOURCE_STATUS_REASON);
            }
            // The version guard refuses a second Draft or a duplicate label here, before any child is written.
            const draft = await this.copyVersion(source.Version, input.NewLabel, provider, user);
            const standardCount = await this.copySections(source, draft.ID, provider, user);
            for (const requirement of source.DocumentRequirements) {
                await this.copyDocumentRequirement(requirement, draft.ID, provider, user);
            }
            return {
                VersionID: draft.ID,
                SectionCount: source.Sections.length,
                StandardCount: standardCount,
                DocumentRequirementCount: source.DocumentRequirements.length,
            };
        });
    }

    /** The source version, its sections, standards and document requirements, in one RunViews call, as the caller. */
    private async loadSource(versionID: string, provider: IMetadataProvider, user: UserInfo): Promise<SourceTree> {
        if (versionID == null || !IsValidUUID(versionID)) {
            OperationSupport.Refuse(NOT_FOUND_REASON);
        }
        const byVersion = `ProgramVersionID = '${versionID}'`;
        const params: RunViewParams[] = [
            { EntityName: CredentialingEntity.ProgramVersion, ExtraFilter: `ID = '${versionID}'`, ResultType: 'entity_object', MaxRows: 1 },
            { EntityName: CredentialingEntity.Section, ExtraFilter: byVersion, OrderBy: 'Sequence, Number', ResultType: 'entity_object' },
            { EntityName: CredentialingEntity.Standard, ExtraFilter: byVersion, OrderBy: 'Sequence, Code', ResultType: 'entity_object' },
            { EntityName: CredentialingEntity.DocumentRequirement, ExtraFilter: byVersion, OrderBy: 'Sequence, Name', ResultType: 'entity_object' },
        ];
        const results = await RunView.FromMetadataProvider(provider).RunViews<BaseEntity>(params, user);
        const failed = results.find((r) => !r.Success);
        if (failed != null) {
            throw new Error(`reading the version to copy failed: ${failed.ErrorMessage}`);
        }
        const version = results[0].Results[0] as VersionEntity | undefined;
        if (version == null) {
            OperationSupport.Refuse(NOT_FOUND_REASON);
        }
        return {
            Version: version,
            Sections: results[1].Results as SectionEntity[],
            Standards: results[2].Results as StandardEntity[],
            DocumentRequirements: results[3].Results as DocumentRequirementEntity[],
        };
    }

    /** Saves the new Draft: every settings column of the source, `ClonedFromVersionID` = the source. */
    private async copyVersion(source: VersionEntity, label: string, provider: IMetadataProvider, user: UserInfo): Promise<VersionEntity> {
        const draft = await OperationSupport.NewRecord<VersionEntity>(provider, CredentialingEntity.ProgramVersion, user);
        draft.ProgramID = source.ProgramID;
        draft.Label = label;
        draft.Status = 'Draft';
        draft.ClonedFromVersionID = source.ID;
        draft.CommitteeID = source.CommitteeID;
        draft.PeerReviewerCount = source.PeerReviewerCount;
        draft.PassiveApprovalWindowDays = source.PassiveApprovalWindowDays;
        draft.RequiresScreening = source.RequiresScreening;
        draft.RequiresExecutiveApproval = source.RequiresExecutiveApproval;
        draft.RequiresGoverningBodyAttestation = source.RequiresGoverningBodyAttestation;
        draft.MinimumAgreeRate = source.MinimumAgreeRate;
        draft.MinimumObservations = source.MinimumObservations;
        draft.MinimumReviewers = source.MinimumReviewers;
        draft.MinimumReplayFloor = source.MinimumReplayFloor;
        draft.AgentObservationsVisibleToReviewers = source.AgentObservationsVisibleToReviewers;
        draft.PromotionEnabled = source.PromotionEnabled;
        draft.AutoCarryForwardOnRenewal = source.AutoCarryForwardOnRenewal;
        await OperationSupport.Save(draft);
        return draft;
    }

    /** Copies each section in `Sequence` order and, after each, its standards in `Sequence` order. Returns the standards copied. */
    private async copySections(source: SourceTree, draftID: string, provider: IMetadataProvider, user: UserInfo): Promise<number> {
        let standardsSaved = 0;
        for (const section of source.Sections) {
            const copy = await OperationSupport.NewRecord<SectionEntity>(provider, CredentialingEntity.Section, user);
            copy.ProgramVersionID = draftID;
            copy.Number = section.Number;
            copy.Name = section.Name;
            copy.Description = section.Description;
            copy.Sequence = section.Sequence;
            await OperationSupport.Save(copy);
            for (const standard of source.Standards.filter((s) => UUIDsEqual(s.SectionID, section.ID))) {
                await this.copyStandard(standard, copy.ID, draftID, provider, user);
                standardsSaved++;
                const failAfter = CloneVersionToDraftServerOperation.FailAfterStandards;
                if (failAfter != null && standardsSaved >= failAfter) {
                    throw new Error(`The copy stopped after ${standardsSaved} standards (FailAfterStandards).`);
                }
            }
        }
        return standardsSaved;
    }

    /**
     * Copies one standard with every authoring column, its lineage and its evaluation mode. The clone
     * mark lets the guard accept the carried-over evaluation mode, after checking it against the source.
     */
    private async copyStandard(source: StandardEntity, sectionID: string, draftID: string, provider: IMetadataProvider, user: UserInfo): Promise<void> {
        const copy = await OperationSupport.NewRecord<StandardEntityServer>(provider, CredentialingEntity.Standard, user);
        copy.SectionID = sectionID;
        copy.ProgramVersionID = draftID;
        copy.Code = source.Code;
        copy.Statement = source.Statement;
        copy.Guidance = source.Guidance;
        copy.ResponseType = source.ResponseType;
        copy.IntakeMode = source.IntakeMode;
        copy.EvaluationMode = source.EvaluationMode;
        copy.IsInterpretive = source.IsInterpretive;
        copy.IsEligibility = source.IsEligibility;
        copy.IsNewForVersion = false;
        copy.EvidenceHint = source.EvidenceHint;
        copy.LineageKey = source.LineageKey;
        copy.Sequence = source.Sequence;
        copy.MarkAsVersionClone(source.ID);
        await OperationSupport.Save(copy);
    }

    private async copyDocumentRequirement(
        source: DocumentRequirementEntity,
        draftID: string,
        provider: IMetadataProvider,
        user: UserInfo,
    ): Promise<void> {
        const copy = await OperationSupport.NewRecord<DocumentRequirementEntity>(provider, CredentialingEntity.DocumentRequirement, user);
        copy.ProgramVersionID = draftID;
        copy.Name = source.Name;
        copy.Description = source.Description;
        copy.IsRequired = source.IsRequired;
        copy.SensitivityPolicy = source.SensitivityPolicy;
        copy.Sequence = source.Sequence;
        await OperationSupport.Save(copy);
    }
}
