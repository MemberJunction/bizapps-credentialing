import { LogError, Metadata, RunView } from '@memberjunction/core';
import { NotificationEngine } from '@memberjunction/notifications';
import { CredentialingEntity } from '@mj-biz-apps/credentialing-core';
import { SystemUser, type StaffNotifier } from '@mj-biz-apps/credentialing-core-entities-server';

/** Name of the seeded `MJ: User Notification Types` metadata row for submitted applications. */
export const APPLICATION_SUBMITTED_NOTIFICATION_TYPE = 'Credentialing: Application Submitted';

/** Name of the MJ `Records` resource type that routes a notification click to an entity record. */
const RECORDS_RESOURCE_TYPE_NAME = 'Records';

/**
 * Delivers staff submission notifications through MJ's `NotificationEngine` (plan Task 11, NFR-4.2).
 * Runs as the system user on the process's `Metadata.Provider` (never a short-lived isolated
 * provider, because `NotificationEngine` and `UserInfoEngine` are `BaseEngine` singletons that
 * cache `ProviderToUse`).
 */
export class EngineStaffNotifier implements StaffNotifier {
    private recordsResourceTypeID: string | null = null;

    constructor(
        private readonly notificationTypeName: string = APPLICATION_SUBMITTED_NOTIFICATION_TYPE,
    ) {}

    /**
     * The notification's sentence. A subject is a person or an organization, so the sentence names
     * the application with "the", never a pronoun.
     */
    public static SubmittedMessage(e: { SubjectName: string; ProgramName: string; VersionLabel: string }): string {
        return `${e.SubjectName} submitted the ${e.ProgramName} ${e.VersionLabel} application.`;
    }

    public async ApplicationSubmitted(e: {
        ApplicationID: string;
        SubjectName: string;
        ProgramName: string;
        VersionLabel: string;
        StaffUserIDs: string[];
    }): Promise<void> {
        if (e.StaffUserIDs.length === 0) {
            return;
        }
        const system = SystemUser.Get('Sending submission notification');
        const provider = Metadata.Provider;
        await NotificationEngine.Instance.Config(false, system, provider);
        const recordsTypeID = await this.resolveRecordsResourceTypeID();
        const message = EngineStaffNotifier.SubmittedMessage(e);

        for (const userId of e.StaffUserIDs) {
            const result = await NotificationEngine.Instance.SendNotification(
                {
                    userId,
                    typeNameOrId: this.notificationTypeName,
                    title: 'Application submitted',
                    message,
                    resourceTypeId: recordsTypeID ?? undefined,
                    resourceRecordId: e.ApplicationID,
                    resourceConfiguration: { Entity: CredentialingEntity.Application },
                },
                system,
            );
            if (!result.success) {
                LogError(
                    `EngineStaffNotifier: failed for user ${userId} on application ${e.ApplicationID}: ${(result.errors ?? []).join('; ') || 'unknown error'}`,
                );
            }
        }
    }

    private async resolveRecordsResourceTypeID(): Promise<string | null> {
        if (this.recordsResourceTypeID != null) {
            return this.recordsResourceTypeID;
        }
        const res = await new RunView().RunView<{ ID: string }>(
            {
                EntityName: 'MJ: Resource Types',
                ExtraFilter: `Name = '${RECORDS_RESOURCE_TYPE_NAME}'`,
                Fields: ['ID'],
                ResultType: 'simple',
                MaxRows: 1,
                SkipTotalRowCount: true,
            },
            SystemUser.Get('Resolving Records resource type for notification'),
        );
        const id = res.Success ? (res.Results?.[0]?.ID ?? null) : null;
        if (id != null) {
            this.recordsResourceTypeID = id;
        }
        return id;
    }
}
