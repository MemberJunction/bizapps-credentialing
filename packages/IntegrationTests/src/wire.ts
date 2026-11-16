import { BaseEntity, RunView, UserInfo, UserRoleInfo } from '@memberjunction/core';
import {
    Assert,
    type IntegrationCheckContext,
} from '@memberjunction/testing-integration/registry';

interface LoadedUserRow {
    ID: string;
    Name: string;
    FirstName: string | null;
    LastName: string | null;
    Title: string | null;
    Email: string;
    Type: string;
    IsActive: boolean;
    IsTemplate: boolean | null;
    LinkedRecordType: 'None' | 'Employee' | 'Other' | null;
    FirstLast: string | null;
}

interface LoadedUserRoleRow {
    ID: string;
    UserID: string;
    RoleID: string;
    User: string;
    Role: string;
}

/** Escapes a value for use inside a single-quoted SQL string literal in an ExtraFilter. */
export function Quote(value: string): string {
    return value.replace(/'/g, "''");
}

/** A RunView bound to the run-scoped provider (SQL Server on the server transport, GraphQL on the client). */
export function View(ctx: IntegrationCheckContext): RunView {
    return RunView.FromMetadataProvider(ctx.Provider);
}

/** Saves the entity and throws, with the save's complete message, when the save fails. */
export async function RequireSave(entity: BaseEntity, label: string): Promise<void> {
    const saved = await entity.Save();
    Assert(saved, `${label} save failed: ${entity.LatestResult?.CompleteMessage ?? 'unknown'}`);
}

/** Saves the entity and throws unless the save is refused with a message containing the fragment. */
export async function ExpectSaveRefused(entity: BaseEntity, expectedMessageFragment: string): Promise<void> {
    const saved = await entity.Save();
    Assert(!saved, `Expected save to be refused with "${expectedMessageFragment}", but it succeeded.`);
    const msg = entity.LatestResult?.CompleteMessage ?? '';
    Assert(
        msg.includes(expectedMessageFragment),
        `Expected refusal message to include "${expectedMessageFragment}", got "${msg}"`,
    );
}

/** Runs a simple RunView as `asUser` (default: the context user) and throws when it fails. */
export async function FindRows<T extends object>(
    ctx: IntegrationCheckContext,
    entityName: string,
    filter: string,
    fields: string[],
    asUser?: UserInfo,
): Promise<T[]> {
    const res = await View(ctx).RunView<T>(
        {
            EntityName: entityName,
            ExtraFilter: filter,
            Fields: fields,
            ResultType: 'simple',
        },
        asUser ?? ctx.User,
    );
    Assert(res.Success, `RunView ${entityName} failed: ${res.ErrorMessage ?? 'unknown'}`);
    return res.Results ?? [];
}

/**
 * Loads a user and its roles in one RunViews call and builds a UserInfo from them, the same
 * construction MJServer's MagicLinkService uses when it caches a new user.
 */
export async function LoadUserInfo(ctx: IntegrationCheckContext, email: string): Promise<UserInfo> {
    const schema = ctx.Schema ?? '__mj';
    const quoted = Quote(email.trim());
    const results = await View(ctx).RunViews<LoadedUserRow | LoadedUserRoleRow>(
        [
            {
                EntityName: 'MJ: Users',
                ExtraFilter: `LOWER(Email) = LOWER('${quoted}')`,
                ResultType: 'simple',
            },
            {
                EntityName: 'MJ: User Roles',
                ExtraFilter: `UserID IN (SELECT ID FROM [${schema}].[vwUsers] WHERE LOWER(Email) = LOWER('${quoted}'))`,
                ResultType: 'simple',
            },
        ],
        ctx.User,
    );
    const userRes = results[0];
    const rolesRes = results[1];
    Assert(userRes?.Success === true, `RunView MJ: Users failed: ${userRes?.ErrorMessage ?? 'unknown'}`);
    Assert(rolesRes?.Success === true, `RunView MJ: User Roles failed: ${rolesRes?.ErrorMessage ?? 'unknown'}`);

    const users = (userRes.Results ?? []) as LoadedUserRow[];
    Assert(users.length === 1, `Expected 1 MJ: Users row for '${email}', found ${users.length}`);

    const roleRows = (rolesRes.Results ?? []) as LoadedUserRoleRow[];
    const userRoles = roleRows.map((r) => new UserRoleInfo(r));
    return new UserInfo(ctx.Provider, {
        ...users[0],
        UserRoles: userRoles,
    });
}
