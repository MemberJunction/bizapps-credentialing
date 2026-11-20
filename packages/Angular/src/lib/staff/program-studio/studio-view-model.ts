/**
 * What Program Studio offers for a version in each state (FRD FR-2.2, FR-2.5, FR-2.6). Pure: no
 * Angular, no data access. The server guards decide every write; this decides only which controls
 * exist on screen, so a frozen version shows no authoring control at all.
 */
import type { VersionStatus } from '@mj-biz-apps/credentialing-core';

/** Which of the three settings tiers can be edited. */
export interface SettingsTierEditable {
    WorkflowToggles: boolean;
    PromotionThresholds: boolean;
    RolloutFlags: boolean;
}

/** The controls Program Studio shows for one version. */
export interface StudioVersionView {
    /** Sections, standards and document requirements can be added, edited, reordered and deleted. */
    CanAuthor: boolean;
    /** `Edit in draft` (copy this version into a new Draft) is offered. */
    ShowEditInDraft: boolean;
    ShowActivate: boolean;
    ShowRetire: boolean;
    /** Only a Draft can be deleted. */
    ShowDelete: boolean;
    /** `New committee` (create a committee for the program's organization) is offered: on a Draft only, where the deciding committee can still be chosen. */
    ShowNewCommittee: boolean;
    SettingsTierEditable: SettingsTierEditable;
}

export class StudioViewModel {
    public static For(version: { Status: VersionStatus }): StudioVersionView {
        const isDraft = version.Status === 'Draft';
        const isActive = version.Status === 'Active';
        return {
            CanAuthor: isDraft,
            ShowEditInDraft: !isDraft,
            ShowActivate: isDraft,
            ShowRetire: isActive,
            ShowDelete: isDraft,
            ShowNewCommittee: isDraft,
            SettingsTierEditable: {
                WorkflowToggles: isDraft,
                PromotionThresholds: isDraft,
                RolloutFlags: isDraft || isActive,
            },
        };
    }

    /**
     * The version to show for a program: the one asked for when the program has it; otherwise its
     * Draft, then its Active version, then the newest. Null when the program has no version.
     */
    public static PickVersion<T extends { ID: string; Status: VersionStatus }>(versions: readonly T[], requestedID: string | null): T | null {
        const requested = requestedID?.toLowerCase();
        return (
            versions.find((v) => requested != null && v.ID.toLowerCase() === requested) ??
            versions.find((v) => v.Status === 'Draft') ??
            versions.find((v) => v.Status === 'Active') ??
            versions[0] ??
            null
        );
    }
}
