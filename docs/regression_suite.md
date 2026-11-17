# Credentialing regression suite (MJExplorer UI)

A step-by-step manual regression of everything the Credentialing app does today, driven through
MJExplorer and checked against the database. It covers the first feature set: accrediting
organizations, staff membership, role-scoped navigation, and Program Studio (programs, versions,
sections, standards, document requirements, version settings and the version lifecycle).

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
| `applicant-a` | `applicant.a@example.test` | Credentialing Applicant | magic link |
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
| D13 | Open standard `1.2` and change its statement and guidance. Save. | The new text shows after save. | Stored text matches. |
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
| F2 | Open the committee picker. | It lists only committees of the program's organization (on the test world: `Sample Accrediting Body A Standards Committee`). | — |
| F3 | Change `Peer reviewers` to `3`, the passive approval window to `21`, turn `Requires screening` on. Save. | A saved message; the values persist after a reload. | `PeerReviewerCount 3`, `PassiveApprovalWindowDays 21`, `RequiresScreening 1`. |
| F4 | Change a threshold (minimum observations to `40`). Save. | Saved; persists. | `MinimumObservations 40`. |
| F5 | Change a value, then press `Discard changes`. | The stored value returns; nothing is saved. | Unchanged. |
| F6 | Type `-1` for peer reviewers, and `1.5` for the minimum agree rate. | The control holds each value inside its range (`0`; `1.0000`) as soon as focus leaves the field. | — |
| F7 | Set `Passive approval window` to `0`; save. Repeat for `Minimum observations` and `Minimum reviewers`. | Each is refused with a sentence beside the setting (`Passive approval window must be at least 1 day.`, `Minimum observations must be at least 1.`, `Minimum reviewers must be at least 1.`), or the control does not accept a value below 1. Never database text. | Unchanged. |
| F8 | Clear `Peer reviewers per application` entirely; save. | Refused with `Enter a value for Peer reviewers per application.` | Unchanged. |
| F9 | Change a setting without saving, go to **Sections and standards** and press `Activate` (committee chosen, tree valid). | The version is activated; the unsaved setting is **not** saved. | `Status = Active`; the setting has its stored value. |

---

## G. Version lifecycle

| ID | Steps | Expected | Database check |
|---|---|---|---|
| G1 | New program `Regression Empty <RUN>` (prefix `E<RUN>`, version `2027`). Press `Activate`. | Refusal beside Activate: `This version has no standards. Add at least one standard before activating.` | `Status = Draft`. |
| G2 | In it add section `1 Only` with no standards and section `2 Full` with one standard. Press `Activate`. | Refusal: `Section 1 has no standards. Add a standard or remove the section before activating.` | `Status = Draft`. |
| G3 | Back on `Regression Technician <RUN>` 2027, with no committee chosen, press `Activate`. | Refusal: `Choose the deciding committee before activating this version.` | `Status = Draft`, `ActivatedAt` null. |
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
| `corepack pnpm run build:packages` | 7 of 7 packages build, 0 TypeScript errors |
| `corepack pnpm test` | every package's tests pass, 0 failed |
| `MJ_INTEGRATION_TEST=1 RUN_MUTATION_TESTS=1 corepack pnpm mj test run --name "<row>"` for `CRD-00 - Smoke`, `CRD-01 - Schema`, `CRD-02 - Version rules`, `CRD-03 - Standard rules`, `CRD-04 - Operations`, `CRD-05 - Isolation`, `CRD-06 - World` | every row passes with 0 failed checks |
| `corepack pnpm run test:integration` | 0 failed |
| `corepack pnpm run probe:isolation` | every case `PASS` |

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
