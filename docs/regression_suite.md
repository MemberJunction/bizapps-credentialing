# Credentialing regression suite (MJExplorer UI)

A step-by-step manual regression of everything the Credentialing app does today, driven through
MJExplorer and checked against the database. It covers the first feature set: accrediting
organizations, staff membership, role-scoped navigation, and Program Studio (programs, versions,
sections, standards, document requirements, version settings and the version lifecycle); and the
second: invitations and the Pipeline, the applicant area, the Standards Runner, the document library
and viewer, reading on the AI model, prefill with citations, review and submit, and applicant
isolation (sections O–V).

It is written to be followed by a person or by an agent with a browser tool. Every case has an ID,
the persona to sign in as, the steps, the expected result, and, where a write is involved, the
database check that proves it.

The automated suites cover the same rules below the UI and are listed in
[section N](#n-automated-suites-run-alongside). This document is the UI pass.

## 0. Before you start

### 0.1 Instance

Everything here assumes the linked development instance described in
[`dev-instance.md`](dev-instance.md): MJAPI and MJExplorer running, the test world loaded
(`corepack pnpm run seed:dev`), and the persona harness available. In the examples MJExplorer is at
`http://localhost:4251` and MJAPI at `http://localhost:4050`; use your own ports.

### 0.2 Personas and sign-in

Nobody signs in by hand. From the repository root:

```sh
corepack pnpm run -s persona <name>
```

| Persona | Account | Holds | Sign-in |
|---|---|---|---|
| `staff-a` | `staff.a@example.test` | Credentialing Staff, member of Sample Accrediting Body A | token |
| `staff-b` | `staff.b@example.test` | Credentialing Staff, member of Sample Accrediting Body B | token |
| `staff-none` | `staff.none@example.test` | Credentialing Staff, no membership | token |
| `admin` | `admin@example.test` | Credentialing Admin | token |
| `applicant-a` | `applicant.a@example.test` | Credentialing Applicant, contact of `Sample Applicant One` (Body A) | magic link |
| `applicant-b` | `applicant.b@example.test` | Credentialing Applicant, contact of `Sample Applicant Two` (Body A) | magic link |
| `applicant-two` | `applicant.two@example.test` | Credentialing Applicant, contact of both Body A subjects (subject picker) | magic link |
| `applicant-org-b` | `applicant.orgb@example.test` | Credentialing Applicant, contact of `Sample Applicant Org B` (Body B) | magic link |
| `applicant-reading` | `applicant.reading@example.test` | Credentialing Applicant, contact of `Sample Reading Applicant` (`Sample Reading Program`) | magic link |
| `reviewer-a` | `reviewer.a@example.test` | Credentialing Reviewer | magic link |
| `committee-a` | `committee.a@example.test` | Credentialing Committee | magic link |

- A **token** persona prints `token=<jwt>`. Open
  `http://localhost:4251/app/credentialing#token=<jwt>` in a fresh browser context.
- A **magic-link** persona prints `url=<link>`. Open the link in a fresh browser context and click
  through the interstitial.
- Use a separate browser context (profile, private window or isolated context) per persona, so
  sessions never mix.

### 0.3 Run ID and names

Pick a short run ID (six characters, for example the output of `openssl rand -hex 3`, upper-cased)
and use it wherever the steps say `<RUN>`. It keeps a run's data apart from earlier runs and from
the test world. Nothing in this suite changes the world's own programs (`Sample Certified
Practitioner`, `Placeholder Organization Program (sample data)`, `Sample Program B`).

### 0.4 Database checks

Checks are written as SQL for `sqlcmd` against the instance database, schema
`__mj_BizAppsCredentialing`. They only read. Example helper:

```sh
q() { sqlcmd -S localhost,1433 -U "$DB_USERNAME" -P "$DB_PASSWORD" -C -d "$DB_DATABASE" -W -Q "SET NOCOUNT ON; $1"; }
```

### 0.5 What counts as a pass

A case passes only when every expected result is seen. A refusal must appear as its exact sentence,
as visible text, beside the control it concerns (or under the form when it concerns no single
field). Database error text (constraint names, `REFERENCE constraint`, `duplicate key`) on screen is
always a failure. After each screen, the browser console must show no error caused by this app
(the shell's own warnings, and its logging of an expected refusal, are not failures).

---

## A. Access and navigation

| ID | Persona | Steps | Expected |
|---|---|---|---|
| A1 | `staff-a` | Sign in. | Lands in the Credentialing app. The only nav item is **Program Studio**, and it is open. The account menu names Staff A. |
| A2 | `staff-none` | Sign in. | Nav item **Program Studio**. The page shows the heading `You are not a member of an accrediting organization` and the body `Your account has the Credentialing Staff role but is not attached to an organization, so there is nothing to show and nothing can be saved. Ask a Credentialing administrator to add you.` No program list, no `New program` button. |
| A3 | `admin` | Sign in. | The only nav item is **New organization** (or **Set up organization** when the database has no accrediting organization). The setup form is shown. No Program Studio item. |
| A4 | `staff-b` | Sign in. | Nav item **Program Studio**. The program list shows only programs of Sample Accrediting Body B (`Sample Program B` on a freshly seeded world). |
| A5 | `applicant-a` | Open the magic link, click through. | Lands in Credentialing on **My Applications** with `You have no applications yet.` There is no application switcher (the session is locked to this app). |
| A6 | `applicant-a` | In the same session open `/app/admin`, then `/app/home`, then `/`. | Each returns to the Credentialing app; no other application opens. |
| A7 | `reviewer-a` | Open the magic link. | Lands on **Assignments** with `You have no review assignments.` No Program Studio, no setup item. |
| A8 | `committee-a` | Open the magic link. | Same as A7: **Assignments**, `You have no review assignments.` |
| A9 | `staff-a` | Open each of these directly: `/app/credentialing/New%20organization`, `/app/credentialing/Set%20up%20organization`, `/app/credentialing/Assignments`, `/app/credentialing/My%20Applications`. | Each shows only `This area is not available to your account.` No form, no data. |
| A10 | `admin` | Open `/app/credentialing/Program%20Studio` directly. | `This area is not available to your account.` |
| A11 | `applicant-a` | Open `/app/credentialing/Program%20Studio` and `/app/credentialing/New%20organization` directly. | `This area is not available to your account.` on both. |
| A12 | any staff | Reload the page on Program Studio. | The same page returns; the console has no `Nav item … not found` error. |

---

## B. Organization setup (admin)

Sign in as `admin` for all of B. Create the test user for B4 first, as the dev owner or with an
entity script (see `dev-instance.md`); it needs no role. Use `regress.staff.<run>@example.test`
(lower-case run ID).

| ID | Steps | Expected | Database check |
|---|---|---|---|
| B1 | Open the setup page. Leave both fields empty. | `Create organization` cannot be pressed. | — |
| B2 | Enter a name, leave the email empty; then the reverse. | `Create organization` cannot be pressed in either state. | — |
| B3 | Name `Regression Body <RUN>`, email `nobody.<run>@example.test`. Press `Create organization`. | Refusal beside the email field: `No user has the email address nobody.<run>@example.test. Create the user first, then set up the organization.` | No `AccreditingOrganization` named `Regression Body <RUN>`; no Common `Organization` of that name. |
| B4 | Same name, email `regress.staff.<run>@example.test`. Press `Create organization`. | Success message: `Regression Body <RUN> is set up. regress.staff.<run>@example.test can now sign in; if they are already signed in, they need to sign out and in again.` The button is disabled while the call is in flight. | Exactly one `AccreditingOrganization` of that name; one Common `Organization` of that name; one `OrganizationMembership` for the user; the user holds `Credentialing Staff`; the user has a `Credentialing` application row. |
| B5 | Press `Create organization` again with the same input. | The same success message. | The counts of B4 are unchanged. |
| B6 | Enter the name with extra spaces and different case in the email (`  Regression   Body <RUN> `, upper-case email). Press. | Success; treated as the same organization and user. | Counts unchanged. |
| B7 | Without restarting MJAPI, sign in as the new user (dev-login token for `regress.staff.<run>@example.test`). | Program Studio opens; the program list is empty with `No programs yet. Create the first one with New program.`; the wizard would create in `Regression Body <RUN>`. | — |
| B8 | As `admin`, look at the nav item after B4. | It reads **New organization** and the page heading matches. | — |

Database checks for B4:

```sql
SELECT COUNT(*) FROM __mj_BizAppsCredentialing.AccreditingOrganization WHERE Name = N'Regression Body <RUN>';
SELECT COUNT(*) FROM __mj_BizAppsCommon.Organization WHERE Name = N'Regression Body <RUN>';
SELECT COUNT(*) FROM __mj_BizAppsCredentialing.OrganizationMembership m
  JOIN __mj_BizAppsCredentialing.AccreditingOrganization a ON a.ID = m.AccreditingOrganizationID
  JOIN __mj.[User] u ON u.ID = m.UserID
 WHERE a.Name = N'Regression Body <RUN>' AND u.Email = N'regress.staff.<run>@example.test';
SELECT r.Name FROM __mj.UserRole ur JOIN __mj.Role r ON r.ID = ur.RoleID JOIN __mj.[User] u ON u.ID = ur.UserID
 WHERE u.Email = N'regress.staff.<run>@example.test';
SELECT COUNT(*) FROM __mj.UserApplication ua JOIN __mj.Application a ON a.ID = ua.ApplicationID JOIN __mj.[User] u ON u.ID = ua.UserID
 WHERE u.Email = N'regress.staff.<run>@example.test' AND a.Name = N'Credentialing';
```

---

## C. Program list and the New program wizard

Sign in as `staff-a` for C through H.

| ID | Steps | Expected | Database check |
|---|---|---|---|
| C1 | Open Program Studio. | The list shows Staff A's programs with name, prefix, type and organization. `Find a program` filters by name or prefix as you type; a filter that matches nothing shows `No program matches.` | — |
| C2 | Press `New program`, then `Cancel`. | The wizard closes; nothing is created. | Program count for the organization unchanged. |
| C3 | Press `New program`. Leave everything empty and try to create. | Creation is not possible (button disabled or required fields flagged); nothing is sent. | — |
| C4 | Fill: name `Regression Technician <RUN>`, type `Certification`, credentials `Person`, noun `technician`, prefix `R<RUN>`, description `Regression run <RUN>.`. Leave the first version label blank, then try three spaces. | `Create program` stays disabled in both states, so nothing can be sent. (The server's own refusal, `Enter a label for this version.`, is covered by the automated check `cred-operations.2`.) | No program of that name. |
| C5 | Set the label to `2027`. Create. | The wizard closes; the new program is open on version `2027 (Draft)`; the header shows `Certification of people (technician) · prefix R<RUN> · Sample Accrediting Body A`. The address bar now carries `programId` and `versionId`. | One `Program` of that name; exactly one `ProgramVersion`, `Label = 2027`, `Status = Draft`, default settings (`PeerReviewerCount 2`, `PassiveApprovalWindowDays 14`, `RequiresExecutiveApproval 1`, `MinimumAgreeRate 0.9000`, `MinimumObservations 30`, `MinimumReviewers 3`, `MinimumReplayFloor 0.8500`, `AutoCarryForwardOnRenewal 1`, the other flags 0). |
| C6 | `New program` again with name ` regression technician <run> ` (different case, extra spaces), prefix `X<RUN>`, other fields valid. Create. | Refusal beside the name field: `A program named regression technician <run> already exists in this organization.` (the name as stored, trimmed). | Still one program of that name. |
| C7 | Change the name to `Regression Other <RUN>`, prefix ` r<run> ` (same prefix, different case, spaces). Create. | Refusal beside the prefix field: `Credential prefix r<run> is already used in this organization.` | No program named `Regression Other <RUN>`. |
| C8 | Cancel the wizard. In `Find a program` type `R<RUN>`. | Exactly the one program is listed. | — |

Database check for C5:

```sql
SELECT p.Name, p.ProgramType, p.SubjectType, p.SubjectNoun, p.CredentialPrefix, v.Label, v.Status,
       v.PeerReviewerCount, v.PassiveApprovalWindowDays, v.RequiresScreening, v.RequiresExecutiveApproval,
       v.RequiresGoverningBodyAttestation, v.MinimumAgreeRate, v.MinimumObservations, v.MinimumReviewers,
       v.MinimumReplayFloor, v.AgentObservationsVisibleToReviewers, v.PromotionEnabled, v.AutoCarryForwardOnRenewal
  FROM __mj_BizAppsCredentialing.Program p
  JOIN __mj_BizAppsCredentialing.ProgramVersion v ON v.ProgramID = p.ID
 WHERE p.Name = N'Regression Technician <RUN>';
```

---

## D. Sections and standards on a Draft version

On `Regression Technician <RUN>`, version `2027 (Draft)`, tab **Sections and standards**.

| ID | Steps | Expected | Database check |
|---|---|---|---|
| D1 | Look at the empty version. | `This version has no sections yet.` Buttons `Activate` and `Delete draft` are present; `Add section` is present. | — |
| D2 | `Add section`: number `1`, name `Safety`, description `Safety practice.` Save. | Section `1 Safety` appears. | One `Section` (`Number 1`). |
| D3 | `Add section`: number ` 1 ` (spaces), name `Duplicate`. Save. | Refusal beside Number: `Section number 1 is already used in this version.` | Still one section. |
| D4 | Change the number to `2`, name `Operations`. Save. | Section `2 Operations` appears below `1 Safety`. | Two sections; `Sequence` of 2 is greater than that of 1. |
| D5 | Edit section 2: rename to `Field Operations`. Save. | The new name shows. | `Section.Name = Field Operations`. |
| D6 | In section 1 press `+ Standard`. Code `1.1`, statement `The applicant attests that a written safety plan is in place.`, response type `Attestation`. Save. | Standard `1.1` appears in section 1 with `Attestation`. | One `Standard`: `Code 1.1`, `ProgramVersionID` equals the section's version, `EvaluationMode = Human Only`, `IntakeMode = Manual`. |
| D7 | Add `1.2`: statement `The applicant provides evidence of annual safety training.`, response type `Evidence`, intake mode `Locate`, evidence hint `Training records`. Save. | `1.2` appears with `Evidence`. | `IntakeMode = Locate`, `EvidenceHint` stored. |
| D8 | Add `1.3`: statement `The applicant describes how incidents are reviewed.`, response type `Narrative`, tick `Interpretive`. Save. | `1.3` appears, marked interpretive. | `IsInterpretive = 1`, `EvaluationMode = Human Only`. |
| D9 | In section 2 add `2.1`: statement `The applicant meets the minimum years of practice.`, response type `Composite`, tick `Eligibility`, intake mode `Prefill`. Note that `New for this version` is already on for a new standard. Save. | `2.1` appears, marked eligibility. | `IsEligibility = 1`, `IsNewForVersion = 1` (the default for a standard added to a Draft), `IntakeMode = Prefill`, `ResponseType = Composite`. |
| D10 | In section 1 add a standard with code ` 1.1 ` (spaces). Save. | Refusal beside Code: `Standard code 1.1 is already used in this version.` | Still four standards. |
| D11 | Change the code to `1.1A`, save; then add another with code `1.1a`. | The first saves as `1.1A`. The second is refused beside Code: `Standard code 1.1a is already used in this version.` | Five standards; one `1.1A`. |
| D12 | Add a standard with code ` 9.9 ` and a statement. Save. | It shows as `9.9`. | `Code = '9.9'` (no spaces, length 3). |
| D13 | Open standard `1.2` for editing, either with its pencil button (`Edit standard 1.2`) or by clicking its row. Change its statement and guidance. Save. | Both ways open the same editor. On save the editor closes, the row shows the new text, and `Standard 1.2 saved.` appears under the row until another standard is opened. A refused save keeps the editor open with the refusal beside its field. | Stored text matches. |
| D13a | On a version with many sections (the placeholder program has 12; do not save anything there), scroll down and open a standard in a late section with its pencil; then click another standard's row; then click that same row again; then press `+ Standard` on a section. | The editor always opens **inside the section being worked on**: directly under the standard's own row for an existing standard, at the end of the section's standards for a new one. It is in view without scrolling, only one editor is open at a time, and clicking the open standard's row again closes it. | — |
| D14 | Open any standard and look at **Evaluation mode**. | It reads `Human Only` with the note `Changes only through the Trust screen.` There is no control that edits it. | — |
| D15 | In section 1 move `1.2` up one place with the arrow button. | `1.2` is now above `1.1`; the order survives a reload. | `Sequence` of `1.2` is less than that of `1.1`. |
| D16 | Move section 2 above section 1 with its arrow, then back. | The sections swap and swap back; the order survives a reload each time. | `Section.Sequence` reflects the final order. |
| D17 | Delete standard `9.9` (confirm). | It disappears. | No standard `9.9` in the version. |
| D18 | Delete section 1 while it still has standards (confirm). | Refusal beside the section: `Remove this section's standards before deleting it.` | Section 1 and all its standards remain. |
| D19 | `Add section` number `3`, name `Scratch`. Then delete it (confirm). | It is removed. | No section 3. |
| D20 | Add a standard with a code and leave the statement empty; save. Then enter only spaces in the statement; save. | Each time, refusal beside Statement: `Enter the standard's statement.` Nothing is saved. | Standard count unchanged; no standard with a blank statement. |
| D21 | Add a standard with a statement and an empty code (then only spaces). Save. | Refusal beside Code: `Enter the standard's code.` | Unchanged. |
| D22 | `Add section` with an empty number, then an empty name (each also with only spaces). | Refusals beside the field: `Enter the section's number.` / `Enter the section's name.` | Section count unchanged. |
| D23 | Each delete (standard, section) opens a confirmation naming what will be deleted; choose `Cancel`. | Nothing is deleted. The confirm button is on the left, `Cancel` on the right. | Unchanged. |

Database check for the tree:

```sql
SELECT s.Number, s.Name, s.Sequence, st.Code, st.ResponseType, st.IntakeMode, st.EvaluationMode,
       st.IsInterpretive, st.IsEligibility, st.IsNewForVersion, st.Sequence AS StdSeq, LEN(st.Code) AS CodeLen
  FROM __mj_BizAppsCredentialing.Program p
  JOIN __mj_BizAppsCredentialing.ProgramVersion v ON v.ProgramID = p.ID AND v.Label = N'2027'
  JOIN __mj_BizAppsCredentialing.Section s ON s.ProgramVersionID = v.ID
  LEFT JOIN __mj_BizAppsCredentialing.Standard st ON st.SectionID = s.ID
 WHERE p.Name = N'Regression Technician <RUN>'
 ORDER BY s.Sequence, st.Sequence;
```

---

## E. Document requirements

Same Draft version, tab **Document requirements**.

| ID | Steps | Expected | Database check |
|---|---|---|---|
| E1 | Look at the empty list. | `This version asks for no documents.` | — |
| E2 | Add: name `Safety Manual`, description `The current safety manual.`, required on, sensitivity `Restricted Allowed`. | Row `Safety Manual · Required · Restricted Allowed`; the tab shows a count of 1. | One `DocumentRequirement` with those values. |
| E3 | Add another named ` safety manual ` (case and spaces). | Refusal: `A document requirement named safety manual already exists in this version.` | Still one. |
| E4 | Add `Training Log`, not required, sensitivity `Normal`. | Row `Training Log · Optional · Normal`. | Two rows. |
| E5 | Edit `Training Log`: make it required. Save. | Row reads `Required`. | `IsRequired = 1`. |
| E6 | Delete `Training Log` (confirm). | Removed; count 1. | One row. |
| E7 | Add a requirement with an empty name (then only spaces). | Refusal: `Enter the document's name.` | Unchanged. |

---

## F. Version settings

Same Draft version, tab **Settings**.

| ID | Steps | Expected | Database check |
|---|---|---|---|
| F1 | Look at the page. | Three labelled groups: workflow settings, promotion thresholds, rollout flags. All are editable on a Draft. The deciding committee is a picker. | — |
| F2a | As a staff member of an organization that has no committee (for example the new staff member of B7), open Settings on a Draft version. | The picker has nothing to choose, and under it the page says: `This program's organization has no committee yet, so the version cannot be activated. Create one with New committee.` A `New committee` button is beside the picker. | — |
| F2 | Open the committee picker. | It lists only committees of the program's organization (on the test world: `Sample Accrediting Body A Standards Committee`). | — |
| F3 | Change `Peer reviewers` to `3`, the passive approval window to `21`, turn `Requires screening` on. Save. | A saved message; the values persist after a reload. | `PeerReviewerCount 3`, `PassiveApprovalWindowDays 21`, `RequiresScreening 1`. |
| F4 | Change a threshold (minimum observations to `40`). Save. | Saved; persists. | `MinimumObservations 40`. |
| F5 | Change a value, then press `Discard changes`. | The stored value returns; nothing is saved. | Unchanged. |
| F6 | Type `-1` for peer reviewers, and `1.5` for the minimum agree rate. | The control holds each value inside its range (`0`; `1.0000`) as soon as focus leaves the field. | — |
| F7 | Set `Passive approval window` to `0`; save. Repeat for `Minimum observations` and `Minimum reviewers`. | Each is refused with a sentence beside the setting (`Passive approval window must be at least 1 day.`, `Minimum observations must be at least 1.`, `Minimum reviewers must be at least 1.`), or the control does not accept a value below 1. Never database text. | Unchanged. |
| F8 | Clear `Peer reviewers per application` entirely; save. | Refused with `Enter a value for Peer reviewers per application.` | Unchanged. |
| F9 | Change a setting without saving, go to **Sections and standards** and press `Activate` (committee chosen, tree valid). | The version is activated; the unsaved setting is **not** saved. | `Status = Active`; the setting has its stored value. |
| F10 | On a Draft version press `New committee` beside the deciding-committee picker. Enter `Regression Committee <RUN>`, leave the type as offered, press `Create committee`. | A small form opens with `Committee name`, `Committee type` (a list of the committee types, the first one chosen) and the buttons `Create committee` (primary, left) and `Cancel` (right). Both buttons are disabled while the call is in flight. On success the form closes, the picker shows `Regression Committee <RUN>` selected, and a line says `Regression Committee <RUN> was created and selected. Save settings to keep it.` `Save settings` is enabled. Any other unsaved setting on the page is still there. | One committee of that name, owned by the program's organization, `Active`, not public (query below). The version's `CommitteeID` is unchanged until F10a. |
| F10a | Press `Save settings`. Reload the page. | `Settings saved.`; after the reload the picker still shows `Regression Committee <RUN>`. | The version's `CommitteeID` is that committee's `ID`. |
| F10b | Press `New committee`, then `Cancel`. | The form closes; nothing is created, the picker and the other settings are unchanged. | Committee count for the organization unchanged. |
| F11 | Press `New committee`. Leave the name empty (then try spaces only) and press `Create committee`. | Refusal beside the name: `Enter the committee's name.` The form stays open. | No committee created. |
| F12 | In the form enter `Regression Committee <RUN>` again and press `Create committee`; then try ` regression   committee <run> ` (other case, extra spaces). | Each is refused beside the name: `A committee named Regression Committee <RUN> already exists for this organization.` for the first, and the same sentence naming `regression committee <run>` (as typed, spaces trimmed and collapsed) for the second. The form stays open; never database text. | Still exactly one committee of that name. |
| F13 | Open Settings on an **Active** version, then on a **Retired** one. | The deciding committee is shown as text. There is **no** `New committee` button and no form (absent, not disabled). | — |
| F14 | The whole path, as the staff member of an organization with **no** committee (the new staff member of B7): create a program with a section and a standard; on **Sections and standards** press `Activate`; follow `Choose the committee in Settings`; press `New committee`, create `Regression First Committee <RUN>`; press `Save settings`; go back and press `Activate`. | The first `Activate` is refused with `Choose the deciding committee before activating this version.` Settings says the organization has no committee yet and points at `New committee`. After the committee is created it is selected; after `Save settings` the second `Activate` succeeds and the version becomes Active. | `Status = Active`, `CommitteeID` is the new committee, whose `OrganizationID` is the Common organization of `Regression Body <RUN>`. |
| F15 | As `staff-b`, open Settings on a Draft version of `Sample Program B` and open the committee picker. | None of the committees created in F10 or F14 is listed (they belong to other organizations). | — |

Database check for F10, F12 and F14 (committees are in the BizApps Committees schema):

```sql
SELECT c.Name, c.Status, c.IsPublic, t.Name AS Type, o.Name AS Organization
  FROM __mj_BizAppsCommittees.Committee c
  JOIN __mj_BizAppsCommittees.[Type] t ON t.ID = c.TypeID
  LEFT JOIN __mj_BizAppsCommon.Organization o ON o.ID = c.OrganizationID
 WHERE c.Name LIKE N'Regression%<RUN>';
```

---

## G. Version lifecycle

| ID | Steps | Expected | Database check |
|---|---|---|---|
| G1 | New program `Regression Empty <RUN>` (prefix `E<RUN>`, version `2027`). Press `Activate`. | Refusal beside Activate: `This version has no standards. Add at least one standard before activating.` | `Status = Draft`. |
| G2 | In it add section `1 Only` with no standards and section `2 Full` with one standard. Press `Activate`. | Refusal: `Section 1 has no standards. Add a standard or remove the section before activating.` | `Status = Draft`. |
| G3 | Back on `Regression Technician <RUN>` 2027, with no committee chosen, press `Activate`. | Refusal: `Choose the deciding committee before activating this version.`, with a button `Choose the committee in Settings` that opens the Settings tab on the committee picker. | `Status = Draft`, `ActivatedAt` null. |
| G4 | In Settings choose the committee and save. Press `Activate` (confirm if asked). | The version becomes `2027 (Active)`. | `Status = Active`, `ActivatedAt` set, `CommitteeID` set. |
| G5 | On the Active version open **Sections and standards**. | A sentence explains the tree is frozen. There is **no** add, edit, delete or reorder control anywhere in the tree (absent, not disabled). The buttons are `Retire` and `Edit in draft`. | — |
| G6 | Open a standard on the Active version. | It is shown read-only: text, no inputs, no Save. | — |
| G7 | **Document requirements** on the Active version. | Rows are listed with no Add, Edit or Delete. | — |
| G8 | **Settings** on the Active version. | Workflow settings and promotion thresholds show as read-only values under `These settings define what a review means for applications already in progress, so they can only be changed on a Draft version.` Rollout flags are still editable under `These flags change only what happens next.` | — |
| G9 | Turn `Promotion enabled` on. Save. | Saved. | `PromotionEnabled = 1`, `Status` still `Active`. |
| G10 | Press `Edit in draft`, leave the label empty, create. | Refusal: `Enter a label for this version.` | One version. |
| G11 | Label `2027`. Create draft. | Refusal: `A version labelled 2027 already exists for this program.` | One version. |
| G12 | Label `2028`. Create draft. | Version `2028 (Draft)` opens with the same sections, standards and document requirement as 2027. The version picker lists both. | New version: `Status Draft`, `ClonedFromVersionID` = 2027's ID; the same number of sections, standards and requirements; the set of `LineageKey` values equals 2027's; every `IsNewForVersion = 0`; settings copied (`PeerReviewerCount 3`, …). 2027 is still `Active`. |
| G13 | Switch to `2027 (Active)` and press `Edit in draft`, label `2029`. | Refusal: `This program already has a draft version (2028). Finish or delete it before starting another.` | Still two versions. |
| G14 | On `2028 (Draft)` change a standard's statement. Then look at 2027. | 2028 has the new text; 2027 is unchanged. | Statements differ between the two versions for that `LineageKey`. |
| G15 | On `2028 (Draft)` press `Delete draft` (confirm). | The draft is removed; the program shows `2027 (Active)`; the address bar names 2027. | No version `2028`; no section, standard or requirement rows for its ID; 2027 intact. |
| G16 | `Edit in draft` to `2028` again, choose nothing else, `Activate` it. | `2028 (Active)`. 2027 **stays Active** (activating a version does not retire another). | Two `Active` versions. |
| G17 | On `2027 (Active)` press `Retire` (confirm; the dialog says this cannot be undone). | `2027 (Retired)`. Buttons: `Edit in draft` only. Nothing in the tree, the document requirements or the settings is editable (rollout flags included), and the settings say `A retired version cannot be changed.` | `Status = Retired`, `RetiredAt` set. |
| G18 | On `2027 (Retired)` press `Edit in draft`, label `2030`. | A Draft `2030` cloned from the Retired version opens. | `ClonedFromVersionID` = 2027's ID. |
| G19 | Delete draft `2030`. | Removed. | Gone. |

Database check for G12:

```sql
SELECT v.Label, v.Status, v.ClonedFromVersionID, v.PeerReviewerCount,
       (SELECT COUNT(*) FROM __mj_BizAppsCredentialing.Section s WHERE s.ProgramVersionID = v.ID) AS Sections,
       (SELECT COUNT(*) FROM __mj_BizAppsCredentialing.Standard st WHERE st.ProgramVersionID = v.ID) AS Standards,
       (SELECT COUNT(*) FROM __mj_BizAppsCredentialing.DocumentRequirement d WHERE d.ProgramVersionID = v.ID) AS Requirements,
       (SELECT COUNT(*) FROM __mj_BizAppsCredentialing.Standard st WHERE st.ProgramVersionID = v.ID AND st.IsNewForVersion = 1) AS NewFlags
  FROM __mj_BizAppsCredentialing.ProgramVersion v
  JOIN __mj_BizAppsCredentialing.Program p ON p.ID = v.ProgramID
 WHERE p.Name = N'Regression Technician <RUN>' ORDER BY v.Label;
-- lineage keys present in one version and not the other (expect no rows)
SELECT a.LineageKey FROM __mj_BizAppsCredentialing.Standard a WHERE a.ProgramVersionID = '<2027 id>'
EXCEPT SELECT b.LineageKey FROM __mj_BizAppsCredentialing.Standard b WHERE b.ProgramVersionID = '<2028 id>';
```

---

## H. Address bar, reload and deep links

| ID | Persona | Steps | Expected |
|---|---|---|---|
| H1 | `staff-a` | Select a program, then another version in the picker. | After each selection the address bar carries that `programId` and `versionId`. |
| H2 | `staff-a` | Reload. | The same URL, program and version return. |
| H3 | `staff-a` | Copy the URL. Open it in a fresh browser context signed in as `staff-a`. | The same program and version open, whatever that session last had open. |
| H4 | `staff-b` | Open the copied URL. | `Program not found` with `This program does not exist, or you do not have access to it.` No tree, no program details. The list still shows only Body B's programs. |
| H5 | `staff-a` | Replace `programId` with a random UUID. | `Program not found`. |
| H6 | `staff-a` | Keep a valid `programId`, replace `versionId` with a random UUID. | The program opens on one of its own versions (never an error page, never another program's version). |
| H7 | `staff-none` | Open the copied URL. | The no-membership panel (A2). |
| H8 | `staff-a` | Replace `programId` with text that is not a UUID (`not-a-uuid`); then do the same to `versionId` with a valid `programId`. | `Program not found` for the first; the program on one of its own versions for the second. Never an error page or database text. |

---

## I. Isolation seen from the UI

| ID | Persona | Steps | Expected |
|---|---|---|---|
| I1 | `staff-b` | Read the whole program list; search for `Regression`, `Sample Certified`, `Placeholder`. | None of Body A's programs appears. |
| I2 | `staff-a` | Search for `Sample Program B`. | `No program matches.` |
| I3 | `staff-b` | Press `New program`. | No organization selector (one membership), or a selector listing only Body B. A program created here belongs to Body B. |
| I4 | `staff-a` (token) | Behind the UI: send the GraphQL update mutation for a standard of the Active 2027 version, changing `Statement`. | Refused with `Sections and standards can only be edited on a Draft version. Use "Edit in draft" to create one.` The stored statement is unchanged. |
| I5 | `staff-b` (token) | Behind the UI: send the same mutation for a standard of Body A's Draft version, and again for a random UUID. | Both refused with the same message (`Record not found or access denied`), so the reply does not reveal that the record exists. Stored statement unchanged. |
| I6 | `staff-b` | Create a program with the same name and prefix as one of Body A's (`Regression Technician <RUN>`, `R<RUN>`). | It is created in Body B: names and prefixes are unique per organization, and the attempt reveals nothing about Body A. |

The full set of read-path and write-path isolation cases is automated: `corepack pnpm run probe:isolation`.

---

## J. Two people editing at once

Use two browser contexts, both signed in as `staff-a`, on a Draft version (create
`Regression Shared <RUN>` with one section and one standard for this).

| ID | Steps | Expected | Database check |
|---|---|---|---|
| J1 | In both contexts open the same standard for editing. In context 1 change the statement and save. In context 2 change the guidance and save. | Both save: changes to different fields are merged. Context 2 then shows context 1's statement. | Statement is context 1's, guidance is context 2's. |
| J1b | With the standard open in both contexts, change the **statement** in context 1 and save, then change the statement in context 2 and save. | Context 2 is refused beside the field with `This record was changed by someone else. Reload it and try again.` | The stored statement is context 1's. |
| J2 | In context 2 the version page is open on the Draft. In context 1 choose a committee and activate the version. In context 2 (not reloaded) add a standard. | Context 2 is refused with the tree-edit sentence `Sections and standards can only be edited on a Draft version. Use "Edit in draft" to create one.` | The Active version has no new standard. |
| J3 | In context 2 (still showing Draft) change `Peer reviewers` in Settings and save. | Refused: either the changed-by-someone-else sentence or `PeerReviewerCount can only be changed on a Draft version. It defines what a review means for applications already in progress.` The version stays Active. | `Status = Active`, `PeerReviewerCount` unchanged. |
| J4 | In context 2 (still showing Draft) press `Delete draft` and confirm. | Refused with `Only a Draft version can be deleted.` | The Active version and its tree remain. |
| J5 | After any refusal in J2–J4. | The message stays visible and the page then shows the stored state (status `Active`, the Active version's buttons). | — |

---

## K. The placeholder program

| ID | Persona | Steps | Expected |
|---|---|---|---|
| K1 | `staff-a` | Open `Placeholder Organization Program (sample data)`. | 12 sections render, each with 3 standards (36 in all); 5 document requirements; the description begins `Sample data for development and demonstration. Not a real standards catalog.` |
| K2 | `staff-a` | With the network panel open, reload the page on this program. Count the data requests (GraphQL `RunViews` calls) the studio makes. | At most three: one for the program list, two for the program. |
| K3 | `staff-a` | Open standard `12.3`. | It is marked interpretive; evaluation mode `Human Only`. |
| K4 | `staff-a` | Open standard `4.1`. | Response type `Evidence`, intake mode `Prefill`, evidence hint `Audited financial statements, notes to the financial statements`. |

Do not edit this program; it is shared test data.

---

## L. Look, wording and accessibility

| ID | Steps | Expected |
|---|---|---|
| L1 | Switch Explorer between light and dark theme on Program Studio (list, tree, editor, settings, document requirements, wizard). | Every screen is readable in both; no white-on-white or black-on-black text, no unstyled block. |
| L2 | Narrow the window to about 900 px wide. | The list moves above the program; no horizontal scrolling of the page; long statements are shortened with an ellipsis in the tree and shown in full in the editor. |
| L3 | Tab through the wizard and the standard editor with the keyboard only. | Every field and button is reachable in order; reorder is possible with the arrow buttons; focus is visible. |
| L4 | Trigger any refusal (D10). Inspect the field. | The field is marked invalid and the refusal text is associated with it (`aria-invalid`, `aria-describedby`), and the text is announced (`role="alert"` or a live region). |
| L5 | Read every screen for wording. | No customer name, no internal term, no raw entity or column name where a label exists, no database error text. |
| L6 | After every screen in this suite, read the browser console. | No error raised by this app. |

---

## M. Generated entity forms (instance administrator)

Sign in as the instance's dev owner (holds `Developer`). These are the platform's generated forms,
outside the product's own screens; the server rules still apply to them.

| ID | Steps | Expected |
|---|---|---|
| M1 | Open the entity `MJ_BizApps_Credentialing: Programs` from the application/entity browser. | The grid lists programs; a record opens in the generated form with its fields and related lists. |
| M2 | Open a standard of an Active version in its generated form, change the statement, save. | Refused with the tree-edit sentence. |
| M3 | Open the Credentialing app as the dev owner. | The app opens with no nav item for this account (it holds no credentialing role); no error. |

---

## N. Automated suites (run alongside)

Run these in the same session; each must pass in full.

| Command | Expect |
|---|---|
| `corepack pnpm run build` | 7 of 7 packages build, 0 TypeScript errors |
| `corepack pnpm test` | every package's tests pass, 0 failed |
| `MJ_INTEGRATION_TEST=1 RUN_MUTATION_TESTS=1 corepack pnpm mj test run --name "<row>"` for every row in `metadata-tests/tests/` (`CRD-00 - Smoke` … `CRD-15 - Applicant world`, sixteen rows) | every row passes with 0 failed and 0 skipped checks |
| `corepack pnpm run test:integration` (after an MJAPI restart) | 0 failed |
| `corepack pnpm run seed:dev` | 2 passed, 0 failed; a second run creates nothing |
| `corepack pnpm run probe:isolation` | every case `PASS` |

## O. Invitations and the Pipeline

Create the program of P–U first if you want one of your own: `Regression Inspector <RUN>` (Person,
noun `inspector`, prefix `RI<RUN>`), two sections, six standards (one Eligibility attestation, two
Narrative `Prefill`, one Evidence `Locate`, two Narrative `Manual`), document requirements `Safety
policy <RUN>` (Normal) and `Inspection license <RUN>` (Restricted Allowed), the Prefill and Locate
standards bound to `Safety policy <RUN>` under **Where the assistant looks**, `Applicant's governing
body attests` on, the deciding committee chosen, activated.

| ID | Persona | Steps | Expected | Database check |
|---|---|---|---|---|
| O1 | `staff-a` | In the standard editor of a Prefill standard on the Draft, add `Safety policy <RUN>` under **Where the assistant looks** and press `Save sources`. | `1. Reads the applicant's Safety policy <RUN> and drafts an answer.`; `Sources saved.` A Manual standard shows `Manual standards have no sources.` | One `ResponseSource` row, `Document Extraction`, rank 1. |
| O2 | `staff-a` | Open the same standard on the Active version. | The sources are listed read-only with `Sources are part of the standards and change only in a draft version.` | — |
| O3 | `staff-a` | Pipeline → `Invite applicant`. Step 1 lists only Active versions of Body A (`<program> — <label> (Person)`). Choose the version; `Create a new applicant` `Sample Applicant <RUN>`, `applicant.<run>@example.test`; contact `Sample`, `Applicant <RUN>`, same email; `Send invitation`. | Step 4 summarizes program, applicant and contact. The result: `No email was sent from this server. Copy this link and send it to applicant.<run>@example.test. It works once and expires on {date}.`, the link, `Copy link`. The new row appears in the Pipeline as `Draft`. | One `Subject` (Person, Body A, party = a Common person), one `SubjectContact` (Primary), one user with `Credentialing Applicant` only, one Draft `Application` with one `Empty` response per standard; `__mj.MagicLinkInvite` row `Status = 'Active'` (`Consumed` once redeemed). |
| O4 | `staff-a` | Invite the same subject to the same version again (`Use an existing applicant`). | `This subject already has an open application on this version.` | No second application. |
| O5 | `staff-a` | Leave a contact field blank or type an invalid email in the wizard. | `Next` stays disabled, or the field's sentence (`Enter the contact's first name.`, `Enter a valid email address for the contact.`) shows beside it. | — |
| O6 | `staff-a` | `Send a new link` on the row. | A dialog with a new link and the same `No email was sent…` sentence. | A new `MagicLinkInvite` row. |
| O7 | `staff-a` | After an application of P–U is submitted: open the bell, then the notification `<subject> submitted the <program> <label> application.` | The Pipeline opens with that application's detail: `Status: Submitted · n of n confirmed · Submitted on {date}`, `Documents frozen at submission`, the governing-body attestation. The notification is read. | `UserNotification.Unread = 0`. |
| O8 | `staff-a` | Open Pipeline from the nav with no `applicationId` in the URL. | The list, no detail and no `Record not found.` | — |
| O9 | `staff-a` | With the Pipeline open, activate a version in Program Studio, return to the Pipeline tab (do not reload), press `Invite applicant`. | The new version is listed in step 1. | — |

---

## P. Applicant area and My Applications

| ID | Persona | Steps | Expected |
|---|---|---|---|
| P1 | invitee of O3 | Open the link in a fresh browser context; press `Continue to sign in`. | Lands on **My Applications**. Nav: `My Applications`, `Standards`, `Documents` only; no app switcher. The card: program, version, `Sample Accrediting Body A`, `Draft`, `0 of 6 confirmed`, `Continue`. |
| P2 | invitee of O3 | Open the used link again in another fresh context. | It does not sign in (a link works once); staff must `Send a new link`. |
| P3 | `applicant-two` | Sign in. | A subject picker listing both subjects; choosing one puts `subjectId` in the URL. |
| P4 | invitee | Confirm an answer in Standards, then press `My Applications` (no reload). | The count shows the new number of confirmed answers. |
| P5 | `applicant-a` | Sign in. | `Sample Applicant Program 2026`, Draft. |

---

## Q. Standards Runner

| ID | Persona | Steps | Expected | Database check |
|---|---|---|---|---|
| Q1 | invitee | `Continue`. | Header: program, label, status, organization, `n of 6 confirmed`, `Withdraw application`, `Review and submit`. A section rail with `0/3` per section. Filters `Needs your review`, `Confirmed`, `All`. A program with no Prefill/Locate standard shows `This program does not draft answers. Every answer is written by you.` | — |
| Q2 | invitee | On the Eligibility standard, read the disabled `Read and confirm`. | `Choose Met, Partially met or Not met before confirming.` below it (a Narrative standard with no text says `Write an answer before confirming.`; a Locate one `Point to a document or write an answer before confirming.`). | — |
| Q3 | invitee | `Edit answer`, type an answer, choose `Met`, `Save draft`. | `Draft saved`; the answer and `Self-assessment: Met` show; `Read and confirm` is enabled. While editing, `Save draft` is disabled with `Make a change before saving.` until something changes and `Read and confirm` with `Save your draft before confirming.` | Response `Drafted`, `AuthorType = Human`. |
| Q4 | invitee | `Read and confirm` → the dialog → `Confirm this answer`. | `Confirmed by <email> on {date}` and `Confirmed answers are locked. Ask the program's staff to reopen one if it must change.` | `Status = Confirmed`, `ConfirmedByUserID` = the invitee. |
| Q5 | `staff-a` | Pipeline → `View answers` on that application → reopen the confirmed answer with a reason. | The applicant's card returns to Drafted and can be edited. | `Status = Drafted`, `ReopenReason` set. |
| Q6 | invitee | `Withdraw application` → the dialog. Tab through it, press Escape. | Focus stays in the dialog; Escape closes it and focus returns to `Withdraw application`; nothing changes. | `Status = Draft`. |

---

## R. Documents and the viewer

| ID | Persona | Steps | Expected | Database check |
|---|---|---|---|---|
| R1 | invitee | Documents. | One ledger per application with each requirement, `Required`, `Restricted Allowed` where set, `None on file`, `Not uploaded`, and `Upload` (plus `Attest instead of uploading` on a restricted one); `General uploads` with `Uploading does not submit anything.` | — |
| R2 | invitee | `Upload` on `Safety policy <RUN>`, choose a two-page text PDF. | `Document uploaded.`; the row shows the file, the date, `Current`, `Reading…`, then (without a reload) `n passages cited` or `n passages found for n standards.` | `EvidenceDocument`: `TextStatus = Extracted`, `PageCount = 2`, `ReadingStatus = Complete`, `ReadingAttempts = 1`; a file under the store root. |
| R3 | invitee | Upload an empty file, a 26 MB file, a `.pdf` whose bytes are not a PDF, a `.exe`. | `This file is empty.` / `This file is larger than 25 MB.` / `This file is not a valid PDF file.` / `This file type cannot be read. Upload a PDF, Word (.docx), Excel (.xlsx), text, Markdown, PNG or JPEG file.` | No new row. |
| R4 | invitee | `View` the PDF; switch to `Extracted text`; Tab around; Escape. | Original and Extracted text tabs; focus stays in the dialog; Escape closes it and focus returns to `View`. | — |
| R5 | invitee | `Upload new` with another PDF; `Versions (2)`. | Both versions listed with uploader, date and hash; the earlier one replaced. | Earlier row `Status = Superseded`. |
| R6 | invitee | `Attest instead of uploading` on `Inspection license <RUN>`; read the statement; `Record attestation`. | `Attestation recorded for Inspection license <RUN>.`; the row: `Attested by <email> on {date}. No file is stored.`, `Restricted attestation`, `Update attestation`. | One `DocumentAttestation` with the statement `I attest that Inspection license <RUN> exists and is maintained, and can be shown to a reviewer on request.` |
| R7 | invitee | Upload a scanned page (an image-only PDF) as a general upload. | `This is a scan. The assistant is reading it; this can take a few minutes.`, then `This text was read from a scan by the assistant and may contain errors.`; the viewer's Extracted text starts with `[Page 1]` and the transcription. | `TextStatus = Recognized`; one `Credentialing: Scan Reader` prompt run. |

---

## S. Reading on the AI model

| ID | Persona | Steps | Expected | Database check |
|---|---|---|---|---|
| S1 | — | After R2. | — | One `Extraction` per bound standard, `Status = Proposed`, `Excerpt` found verbatim in `ExtractedText`, `StartOffset`/`EndOffset` set, `AIPromptRunID` set; the run's model is the one the reader prompt lists (Gemini 3.8 Flash on the dev instance). |
| S2 | `applicant-reading` | Documents: a document the assistant could not read shows why, and `Read again`. Press it. | The row goes back to `Reading…` and then to its result. A document the model could not be reached for never reads as `0 passages found`. | `ReadingAttempts` increases. |
| S3 | — | Stop MJAPI while a document is `Reading…`; start it again. | The document finishes reading within 5 minutes with nobody acting (boot sweep, then every 5 minutes). | `ReadingStatus = Complete`. |

---

## T. Prefill and citations

| ID | Persona | Steps | Expected | Database check |
|---|---|---|---|---|
| T1 | invitee | After R2, open Standards (no reload). | Each Prefill standard: `Drafted by assistant`, `Drafted from <file> · {date}`, a citation chip `<file>`, `How this was drafted`, the drafted answer. The Locate standard: `Passages located`, `The assistant found these passages. Write your answer.`, its chip. | Responses `Prefilled` / `Located`, `AuthorType = Agent`, `SourceType = Document Extraction`; one `ResponseCitation` each. |
| T2 | invitee | Press a chip. | The viewer opens on `Extracted text` with the quoted sentence highlighted. | — |
| T3 | invitee | Edit a drafted answer and save; then `Refresh prefills`. | The edited text stays; nothing a person wrote or confirmed is overwritten. | `AuthorType = Human`, text unchanged after the refresh. |
| T4 | invitee | Confirm every answer. | Each card confirmed; the section rail shows `3/3`. | All responses `Confirmed`. |

---

## U. Review and submit

| ID | Persona | Steps | Expected | Database check |
|---|---|---|---|---|
| U1 | invitee | `Review and submit` before everything is done. | Readiness checklist with `Pass` / `Needs attention` per eligibility standard, section, required document and attestation; `Submit application` disabled with `{n} items still need attention before you can submit.` (`1 item still needs attention…` for one). Each gap links to its screen. | — |
| U2 | invitee | When only the attestation is left. | The reason under the button is the attestation's: `Give the attesting officer's name and role, or the date the governing body approved.` | — |
| U3 | invitee | Fill officer name and role, tick the statement, `Submit application`, confirm in the dialog. | The runner shows `Submitted` and `This application was submitted on {date} (UTC). Its answers and documents are locked.` (the date is the UTC day). | `Application.Status = Submitted`, `SubmittedAt`, attestation fields, `SubmissionDispatchedAt` set; one `ApplicationDocument` per frozen document and attestation (general uploads included); one `UserNotification` per staff member of Body A, none for Body B. |
| U4 | invitee | Look at every card and every document row. | No `Edit answer` or `Read and confirm`; each document says `This document is part of a submitted application and cannot be replaced until that review is finished.` (attestation: `…cannot be changed until that review is finished.`). | — |
| U5 | invitee | Behind the UI, with the session's own token: `ExecuteRemoteOperation` `Credentialing.SaveResponse` on a confirmed response. | `REFUSED` with the locked sentence of U3. | Response row unchanged. |
| U6 | another subject | Run P1–U3 once on an Organization program (subject type `Organization`). | Everything reads correctly for an organization (party record a Common organization; the notification says `<organization> submitted the <program> <label> application.`). | `Subject.SubjectType = Organization`. |

---

## V. Applicant isolation seen from the UI

Use the subject, application and document IDs of P–U.

| ID | Persona | Steps | Expected |
|---|---|---|---|
| V1 | `staff-b` | `/app/credentialing/Pipeline?applicationId=<P–U application>`; then a random UUID. | Body B's list and `Record not found.` both times; no detail. |
| V2 | `staff-b`, `applicant-b`, no token | `GET /credentialing/evidence/<P–U document>/content`; then a random UUID. | `404 {"Message":"Record not found."}` for both (no token: `401 {"error":"Authentication required"}`). |
| V3 | `applicant-b` | `/app/credentialing/Standards?subjectId=<P–U subject>&applicationId=<P–U application>`. | `This area is not available to your account.` (not a blank page). |
| V4 | `applicant-b` | `/app/credentialing/Standards?applicationId=<P–U application>` (own subject). | `This area is not available to your account.` |
| V5 | `applicant-b` | `/app/credentialing/Documents?documentId=<P–U document>`. | Their own library and `Record not found.` |
| V6 | any applicant | Read the console on each applicant screen. | Nothing logged by this app. The shell's own cache warnings for an account without `UI` (`[WARNING] [Cache] … lacks read permission on …`) are logged at error level by MemberJunction and are not failures. |

The full read-path and write-path isolation cases are automated: `corepack pnpm run probe:isolation` (P11–P20).

---

## Run log

Record each run here: date, commit, run ID, who ran it, and the result of every case (Pass, Fail
with what was seen, or Not run with the reason). A failed case links to its issue or fix.

### Run 1 — 2026-11-17, run ID `9599A7`

- **Build under test:** `feature/b1-foundation` at `2f4bb63`, then the same tree with the fixes
  listed below (uncommitted at the time of the run).
- **Instance:** the linked development instance of `dev-instance.md`, database not rebuilt for this
  run (it carried the residue of earlier automated runs: about 345 scratch programs in Sample
  Accrediting Body A).
- **Driven by:** an agent with a browser tool; forms were filled and buttons pressed in MJExplorer,
  with one isolated browser context per persona; every write was checked with `sqlcmd`.

**First pass (at `2f4bb63`)**

| Section | Cases | Result |
|---|---|---|
| A. Access and navigation | A1–A12 | Pass |
| B. Organization setup | B1–B8 | Pass |
| C. Program list and wizard | C1–C8 | Pass. C4 was rewritten: the wizard keeps `Create program` disabled for a blank label, so the server sentence cannot be reached from the screen. |
| D. Sections and standards | D1–D19 | Pass |
| D. Blank text | D20 | **Fail**: a standard was saved with an empty statement (no message shown) and with a statement of four spaces. |
| E. Document requirements | E1–E6 | Pass |
| F. Version settings | F1–F5 | Pass |
| F. Out-of-range settings | F6 (now F6–F8) | **Fail**: `0` for the passive approval window or minimum observations showed the whole SQL Server error and statement on screen; a cleared integer showed the platform text `Peer Reviewer Count cannot be null`. |
| G. Version lifecycle | G1–G19 | Pass |
| H. Address bar and deep links | H1–H7 | Pass |
| H. Malformed id | H8 (added in this run) | **Fail**: `?programId=not-a-uuid` showed `The program could not load Error executing SQL Error: Conversion failed…`. |
| I. Isolation | I1–I6 | Pass |
| J. Two people editing | J1, J2, J3, J4 | Pass (nothing was lost or changed wrongly) |
| J. Same-field conflict wording | J1b | **Fail**: refused, but with the platform's text naming the raw entity (`Concurrent modification conflict on MJ_BizApps_Credentialing: Standards…`). |
| J. Page after a stale refusal | J5 | **Fail**: the page kept showing `Draft` and the Draft buttons after the refusal. |
| F. Activate with unsaved settings | F9 (added in this run) | **Fail**: with a settings edit pending, a refused activation reported the settings field. |
| K. Placeholder program | K1–K4 | Pass (12 sections, 36 standards, 5 requirements; 3 data calls in all) |
| L. Look and accessibility | L2, L4, L5 (apart from the failures above), L6 | Pass. L1: light theme seen in this run, dark not switched on. L3 (keyboard-only walk) not run. |
| M. Generated forms | M1–M3 | Pass |

**Fixes made after the first pass**

1. Required text is refused on the server and beside the field: standard code and statement,
   section number and name, document name, program name, prefix and subject noun. Text is stored
   trimmed.
2. Version settings have range rules with sentences that use the on-screen labels, the number
   controls carry the right minimum, and a cleared value is refused with
   `Enter a value for {label}.`
3. An id in the URL that is not a UUID is treated like one that does not exist; no query is sent.
4. The platform's concurrency message is shown as
   `This record was changed by someone else. Reload it and try again.`
5. Every message the studio and the setup form show passes through one filter: database or
   platform output is replaced with a plain sentence and logged.
6. `Activate` and `Retire` save the status only, on a freshly loaded version.
7. A Retired version's settings say `A retired version cannot be changed.`
8. After a refusal caused by a stale view, the message stays and the page reloads the stored state.

**Second pass (same tree with the fixes), cases re-run in the browser**

| Case | Result |
|---|---|
| D20, D21, D22, E7 | Pass: each blank or spaces-only value is refused with its sentence beside the field; a statement typed with surrounding spaces is stored trimmed. |
| F7 | Pass: the three controls do not go below 1 (a typed `0` becomes `1`). |
| F8 | Pass: `Enter a value for Peer reviewers per application.` beside the field. |
| F9 | Pass: activation succeeded and the pending setting was not saved (stored value unchanged). |
| G17 | Pass: `A retired version cannot be changed.` |
| H8 | Pass: `Program not found`. |
| J1b | Pass: the product sentence; the editor reloaded the stored record. |
| J2, J5 | Pass: the tree-edit sentence stays visible and the page shows `Active` with the Active buttons. |

**Automated suites on the fixed tree** (section N): `build:packages` 7 of 7; `pnpm test` all
packages passing (219 tests); `CRD-00` 1, `CRD-01` 1, `CRD-02` 12, `CRD-03` 12, `CRD-04` 15,
`CRD-05` 9, `CRD-06` 2, all passing with 0 failed; `test:integration` 8 passed, 0 failed;
`probe:isolation` 16 of 16.

**Not run, or left open**

- L1 dark theme and L3 keyboard-only walk were not done in this run.
- The second pass re-ran the failed cases and their neighbours, not the whole suite.
- The refusal for a frozen setting still names the column (`PeerReviewerCount can only be changed
  on a Draft version…`) rather than its on-screen label.
- The program list has no paging; with several hundred programs it is long to scroll, though
  `Find a program` narrows it at once.
- The shell logs its own permission warnings at error level for accounts without the `UI` role.
  They are not raised by this app.
- Accounts created by a magic link are shown as `Guest <email>`.

### Run 2 — 2026-11-17, B2 verification (sections O–V)

- **Build under test:** `feature/b2-applications` from `e80ee13`; the fixes below were committed
  during the run, and every case listed as Pass was seen on the code that includes them.
- **Instance:** the database rebuilt from nothing for this run (`docs/dev-instance.md`, "Rebuild from
  nothing"), then the automated suites, then this pass. Program `Sample Field Inspector` 2027
  (Person; the shape of section O) and `Sample Organization Review` 2027 (Organization) were authored
  in the browser for it; subjects `Sample Applicant Three` and `Sample Member Organization`.
- **Driven by:** an agent with a scripted headless Chrome (Puppeteer), one isolated browser context
  per persona; every write was checked with `sqlcmd`. Reading and recognition ran live on Gemini 3.8
  Flash. Record: [`verification/b2-2026-11.md`](verification/b2-2026-11.md).

| Section | Cases | Result |
|---|---|---|
| O. Invitations and Pipeline | O1, O3, O7 | Pass |
| O | O8 | **Fail, fixed**: a Pipeline opened from the nav said `Record not found.`; it read Explorer's own `applicationId` (the MJ app) from the tab configuration as an application ID. |
| O | O9 | **Fail, fixed**: the invite wizard did not list a version activated after the Pipeline tab had loaded. Fixed with a refresh when Explorer shows the cached tab again; covered by a unit test, not re-run by tab switch in the browser. |
| O | O2, O4, O5, O6 | Not run in this pass (O4–O6 are covered by `CRD-09` and `cred-invite-wire`) |
| O | O7 wording | **Fail, fixed**: the notification said `<subject> submitted its …` for a person; now `submitted the …`. |
| P. Applicant area | P1, P4 | Pass (P4 after the fix below) |
| P | P4 first try | **Fail, fixed**: after confirming in Standards, My Applications still said `1 of 6 confirmed`; the same staleness showed Standards `Not started` after a document was read. |
| P | P2, P3, P5 | Not run in this pass |
| Q. Standards Runner | Q1–Q4, Q6 | Pass |
| Q | Q5 | Not run in this pass (covered by `CRD-10`) |
| R. Documents | R1, R2, R4, R6, R7 | Pass |
| R | R3, R5 | Not run in the browser (R3 is covered by `cred-evidence` over HTTP) |
| S. Reading | S1 | Pass (3 extractions on Gemini 3.8 Flash; scan recognized) |
| S | S2, S3 | Not run in this pass (covered by `CRD-12`) |
| T. Prefill | T1, T2, T4 | Pass |
| T | T3 | Edit kept (`AuthorType = Human`); `Refresh prefills` not pressed in this pass (covered by `CRD-13`) |
| U. Review and submit | U2–U6 | Pass |
| U | U1 | Pass: `11 items still need attention before you can submit.` seen for `applicant-b`'s draft, linked to the button. The one-gap form read `1 items …` in the code (found while writing this suite, not on screen) and was fixed. |
| U | U3 date | **Fail, fixed**: an evening submission (US time) was shown as `submitted on Nov 18` beside `Nov 17` everywhere else; the sentence now says `(UTC)`. |
| V. Applicant isolation | V1–V6 | Pass after the fixes below |
| V | V1 first try | **Fail, fixed**: staff-b's Pipeline silently ignored another organization's `applicationId`; now `Record not found.` as for a random ID. |
| V | V3 first try | **Fail, fixed**: a foreign `subjectId` in the URL gave a blank page; now `This area is not available to your account.` |
| Look and accessibility (the four applicant screens) | dark theme, 768 px, keyboard-only, dialogs, disabled reasons, 44 px targets, console | Pass after the fixes below; console: only MemberJunction's own cache warnings |
| Look and accessibility, first try | | **Fail, fixed**: buttons of 34–36 px (MJ's small button size, runner filters, application picker, citation chips, self-assessment choices); disabled `Read and confirm`, `Save draft` and `Submit application` not linked to their visible reason (`aria-describedby`); `Edit answer` left keyboard focus on the page body. |

**Fixes made during the run** (each with tests; commits on `feature/b2-applications`):

1. `dev:storage` reuses the evidence root recorded in `mj/.env` (`344c916`).
2. Applicant screens and the Pipeline reload when Explorer shows their cached tab again
   (`49af10d`, `af3df57`).
3. The submitted-and-locked sentence names the time zone (`9ca3da5`).
4. The submission notification reads correctly for people and organizations (`c6fca79`).
5. Pipeline: `Record not found.` for an application staff cannot see; Explorer's app ID is no longer
   read as an application ID (`9bd30ce`, `af3df57`).
6. A deep link to another applicant's subject shows the not-available sentence (`1d32fc1`).
7. 44 px targets, disabled reasons linked to their buttons, focus kept on edit (`41b283b`).
8. `1 item still needs attention`, not `1 items` (`54c685d`).

**Automated suites on the final tree:** `build` 7/7; `pnpm test` 681 passed, 0 failed (Core 210,
CoreEntitiesServer 94, Angular 312, Server 50, IntegrationTests 15); the sixteen `CRD-*` rows 133
checks, 0 failed, 0 skipped (`CRD-10`, `CRD-14`, `CRD-15` re-run after the last fixes);
`test:integration` 23/0; `seed:dev` 2/0; `probe:isolation` 34/34.
