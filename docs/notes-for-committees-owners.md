# Notes for the BizApps Committees owners

What BizApps Credentialing needs from BizApps Committees, what it does in the meantime, and what
we found while building against Committees. Written so it can be handed to the Committees owners
as it stands.

- **From:** BizApps Credentialing (`MemberJunction/bizapps-credentialing`)
- **Against:** BizApps Committees `1.5.0` (branch `next`, commit `25a7970`, 2026-11-08), on
  MemberJunction `6.2.2`
- **Written:** 2026-11-17
- **Status:** nothing here is blocking Credentialing today. Items 1 to 3 are requests; items 4 to 6
  are observations.

## How Credentialing uses Committees

Credentialing declares Committees as a dependency app (`mj-committees >=1.5.0 <2.0.0`). It never
migrates, generates or alters the Committees schema.

- A program version names the committee that will decide applications to it:
  `ProgramVersion.CommitteeID` is a foreign key to `[__mj_BizAppsCommittees].[Committee]`. A version
  cannot be activated until that committee is chosen.
- A committee belongs to an accrediting organization through `Committee.OrganizationID`, the
  BizApps Common organization of that accrediting body. Credentialing only ever offers staff the
  committees of their own organization.
- Later Credentialing work (committee review of applications) will also need committee rosters,
  meetings, agenda items and ballots.

## The constraint that shapes everything below

Credentialing isolates accrediting organizations from one another. A staff member of one
organization must not read another organization's programs, applications or committees, on any
read path. To hold that boundary, **no Credentialing role holds the `UI` role**: `UI` carries
unfiltered read on most entities, and one unfiltered grant exempts its holder from every row
filter on that entity. Credentialing roles get narrow grants, each with a row filter.

Committees assumes the opposite. Its permission metadata is one row (for `UI`, on votes), and
every other Committees entity is readable through `UI`'s default grant. Its screens are written
for a user who can see every committee, every organization and every person in the host.

So a Credentialing staff member cannot use the Committees application or its components as they
are, and giving them `UI` to make that work would remove the organization boundary.

## What Credentialing does today

1. **Reads committees through one filtered grant.** `Credentialing Staff` has Read on
   `Committees: Committees`, filtered to committees whose `OrganizationID` is the Common
   organization of an accrediting organization the user is a member of. Nothing else on any
   Committees entity, apart from read on the committee type catalog (below).
2. **Creates a committee through its own server operation** (`Credentialing.CreateCommittee`).
   Staff give a name and a committee type; the operation checks the caller's membership, fixes the
   owning organization itself, refuses a duplicate name within the organization, and writes the
   `Committees: Committees` record as the system user, because staff hold no Create permission on
   Committees entities. The record is an ordinary committee, visible in the Committees application.
3. **Does not manage rosters, meetings or motions.** Those stay in the Committees application for
   a user who has access to it.

Item 2 is a stopgap. It means a committee can be created in two places, and Credentialing writes
another app's entity with elevated rights. The requests below are what would let us remove it.

## Requests

### 1. A create/edit committee component that can be embedded with the organization fixed

`committee-edit-dialog` (exported from `@mj-biz-apps/committees-ng`) is the natural thing to reuse,
but it cannot be used by a caller who is confined to one organization:

- It shows an organization picker and lets the user choose any organization.
- It loads its lookups as the signed-in user, who in our case can read neither organizations nor
  most Committees entities.

Requested: inputs that let a host application fix the organization (and hide the picker), limit or
preselect the committee type, and pass the data provider to use; and an output that returns the
created committee's ID. With that, Credentialing would drop its own form.

### 2. A supported way for another app to create a committee

Requested: a server-side operation in Committees (a remote operation, so the browser and server
call it the same way) that creates a committee for a given organization and applies Committees'
own rules. Dependent apps would call it rather than saving the `Committee` entity themselves.

Two things we had to decide alone and would rather Committees decided:

- **Name uniqueness.** `Committee` has no unique constraint on `Name`, alone or per organization.
  Credentialing refuses a duplicate name within one organization. Is that the rule Committees
  wants?
- **`IsPublic`.** It defaults to 1. Credentialing creates its committees with `IsPublic = 0`,
  because in the Committees application a private committee is locked for anyone who is neither
  Committees staff nor a member. Is that the right reading of the flag, and what should a
  dependent app set?
- **Who created it.** Because the record is written as the system user, the committee's change
  history names the system user, not the staff member who asked for it.

### 3. An organization-scoped permission model

Requested: Committees roles and row filters that confine a user to the committees of
organizations they belong to, on committees, memberships, terms, meetings, agenda items, motions,
ballots and documents. Without it, every dependent app that isolates by organization has to write
its own filters on Committees' entities, as Credentialing has started to do, and cannot use
Committees' screens for its users at all.

Related, for the roster screens: they pick people from BizApps Common, which is not scoped to an
organization either. A host that isolates organizations needs a way to limit that picker.

## Observations

### 4. Angular overrides in the Committees `package.json` pin 21.1.3

`package.json` `pnpm.overrides` pins every `@angular/*` package to `21.1.3`. MemberJunction 6.2.2's
Angular packages require `^21.2.22`. In a linked development workspace (`mj dev workspace`) those
member overrides won over the lockfile-derived pins and downgraded Angular for the whole workspace
to 21.1.3; the workspace doctor then reported a single copy at the wrong version. We corrected the
generated parent `pnpm-workspace.yaml` by hand, which does not survive `dev workspace --force`.

### 5. Membership checks resolve a user through `Person.LinkedUserID`

Several places resolve "which person is this user" through `LinkedUserID` (for example
`shared/committee-permission-helper.ts`, `membership/membership-list.component.ts`,
`dashboard/committee-dashboard.component.ts`, `comments/comment-thread.component.ts`, and
`services/BallotReminderService.ts`). BizApps Common now binds a person to a user through
`User.LinkedEntityID` / `LinkedEntityRecordID`. Credentialing's reviewers and committee members
will be bound that way, so committee-membership checks will need to resolve through it when
Credentialing starts using rosters.

### 6. Agenda items cannot point at a record in another app

`AgendaItem` has no reference to an external record (an entity and a record ID). When a committee
decides credentialing applications, each application should appear as an agenda item that links
back to the application. Today that link would have to live in a Credentialing-owned table.

## Smaller notes

- The manifest name is `mj-committees`, while the other BizApps manifests are `mj-bizapps-*`
  (`mj-bizapps-common`, `mj-bizapps-tasks`). Dependents have to remember the exception.
- Entity names use the prefix `Committees: `, while Common and Tasks use `MJ_BizApps_Common: ` and
  `MJ_BizApps_Tasks: `.

## What we would change in Credentialing once these land

| When Committees ships | Credentialing would |
|---|---|
| Request 1 | replace its own "New committee" form with the Committees component |
| Request 2 | call the Committees operation and stop writing `Committees: Committees` as the system user |
| Request 3 | replace its own filter on `Committees: Committees` with Committees' roles, and be able to offer rosters and meetings to its staff |
| Observation 5 addressed | bind reviewers and committee members through Common's user link only |
| Observation 6 addressed | put applications on a committee's agenda with a real link |
