# BizApps Credentialing — Functional Requirements Document

| | |
|---|---|
| **Status** | Draft v1.0 |
| **Date** | 2026-09-09 |
| **Product** | BizApps Credentialing (`mj-bizapps-credentialing`), a MemberJunction Open App |
| **Supersedes** | `plans/archive/credentialing-design.md` |
| **Companion** | `new-products/certification-workflow/plan.md` (market thesis and commercial posture) |

---

## 1. Purpose and audience

This document states what BizApps Credentialing must do. It is written for the people deciding whether and how to build it, and for the engineers who will build it. It is a functional specification: it says what the system does, for whom, under which rules, and how it composes with the rest of the MemberJunction platform. It does not schedule the work, price it, or prescribe implementation internals except where an internal property is itself a requirement (for example, that a signature is stamped by the server and never accepted from a client).

Requirements are numbered `FR-n.m` (functional), `BR-n` (business rules and invariants), and `NFR-n` (non-functional). "Shall" statements are requirements. "Should" statements are strong defaults a program may override through configuration. Illustrative program names in this document (a public-entity risk-pool recognition program, a certified risk professional designation, a healthcare facility accreditation, a contractor license) are examples, not commitments.

---

## 2. Product summary

### 2.1 What it is

BizApps Credentialing is the credential lifecycle system for credentialing bodies: professional societies, accrediting organizations, licensing boards, and membership organizations that certify, accredit, recognize, or license people and organizations.

An organization authors a **program** as versioned **standards** grouped in **sections**. A **subject** (a person or an organization) opens an **application** against the program's active version, answers each standard, and grounds the answers in **evidence documents** it already holds. The system drafts answers from those documents and from the organization's own records where the program allows it; only a person confirms an answer. Submission freezes the record. AI agents prepare the review: they extract values from evidence with locators, verify confirmed answers against instance data, and post findings into the same commentary stream human reviewers use. Reviewers react to every AI finding, and those reactions are the evidence base that decides, standard by standard, what may ever be automated. A committee deliberates in a passive window that any member can interrupt. An executive signs. The signature issues a **credential** with a public verification token. Every issued credential carries its **renewal cycle** from birth; renewals open on schedule and start from what the subject confirmed last time. Between cycles, subjects log **continuing activity claims** toward quantity standards, and a program-configured sample of renewals receives a full evidence audit.

The product is a **BizApp**: one MemberJunction Open App (`mj-bizapps-credentialing`) installed into an existing MemberJunction instance with `mj app install`. It brings its own schema, migrations, metadata and packages (entities, actions, core services, server-side entity overrides, a server bootstrap for MJAPI, and an Angular bootstrap for MJExplorer), and it registers **one** application, Credentialing, whose navigation is scoped by role and standing into three audience areas: **Applicant**, **Review**, and **Staff**. Every screen is a routing-free Angular component, so a member portal or another BizApp can host the applicant surfaces outside Explorer. The server package also serves the public verification registry and the API for machine callers. Everything that is not the credentialing domain itself (identity, files, notifications, scheduling, AI runs, search, change tracking, permissions) is the MemberJunction platform, configured rather than rebuilt.

### 2.2 Guiding principles

These principles are requirements in themselves. Every feature below is shaped by them, and a feature that violates one is a defect.

1. **Machine work is drafted; only people confirm.** A drafted answer, a proposed data binding, a proposed standard from a handbook, an AI finding, and an AI-drafted letter are each distinguishable from a human's confirmed work at every point in the record. Nothing counts until a person has read it and confirmed it.
2. **Every conversation declares its audience before anyone types.** Internal discussion, applicant-visible discussion, and private notes are separate lanes, labelled at the composer, enforced on the server.
3. **Automation is earned, never configured.** No standard is reviewed automatically until live reviewer agreement and replay against historical human review both clear the program's own thresholds. Interpretive and jurisdiction-dependent standards are never automatable. Demotion is always one click. Applications always receive a human decision.
4. **The value is depth, not volume.** The product exists to remove friction for subjects already in the process and to make the self-examination the process demands easier and better grounded. It sets no throughput target and forces no automation timeline.
5. **Reviewers keep learning.** Peer review is training in how other subjects operate. Automation is designed so reviewers keep gaining cross-subject perspective rather than rubber-stamping machine output.
6. **Everything is a record that can survive being challenged.** Append-only correspondence, immutable identifiers, server-stamped signatures, frozen submissions, verbatim evidence excerpts, and a provenance chain from every AI finding to the exact model call that produced it.
7. **Behavior is configuration.** Workflow toggles, thresholds, rollout flags, intake friction, and communication mediation are per-program-version settings with an audit trail. Rollout is a configuration change, never a deployment.
8. **Honesty in the interface.** A control does exactly what its label says or is absent. A refusal states its reason in visible text. An empty state names the real cause. A count is a count, never an unread claim the screen cannot back. A revoked credential is stamped, not hidden.

### 2.3 In scope

- Multi-program, multi-organization credentialing within one instance.
- Program authoring: versions, sections, standards, document requirements, workflow and automation settings, handbook import.
- Subject onboarding by invitation and by self-service eligibility pre-check; external applicant identity.
- Document-grounded intake: evidence library, checklist, sensitive-material workaround, prefill and locate from documents and instance records, human confirmation, self-assessment, governing-body attestation, submission gate and freeze.
- Eligibility criteria, fee requirements, and assessment-result requirements as standards.
- Continuing activity claims toward quantity standards; audit sampling of renewals; provider accreditation as a program.
- AI agents for extraction, verification, review preparation, binding drafting, handbook structuring, letter drafting, and conversational assistance; constrained writers; full provenance.
- Human review: assignments, section workspace, findings with reactions, threaded commentary, mentions, anonymized comparable answers.
- Staff-mediated or direct applicant communication; in-app and outbound notifications.
- Committee passive-approval docket, objections, executive sign-off, decision and recommendations, staff-editable letters.
- Credential issuance, certificates, public verification page and registry API, credential exports, credentials recorded from imports or external issuers.
- Renewal cycles, carry-forward, expiry, suspension, revocation.
- Appeals as bounded work items.
- Trust and automation governance: evaluation modes, evidence-gated promotion, replay evaluation, agreement statistics by standard and by section.
- Historical migration of applications and reviewer commentary from a legacy platform.
- Reporting: operational KPIs, executive dashboard, cross-subject queryable data.
- Organization isolation, role and row-level security, API keys, audit and read auditing.

### 2.4 Boundaries

| This product does **not** | Because | It instead |
|---|---|---|
| Deliver learning or track credit earned inside a learning platform | That is the LXP's identity | Accepts activity claims and completion records from the LXP as verified sources |
| Author, deliver, or psychometrically validate exams and oral assessments | That is Caliber's identity, with a psychometrics partner | Records assessment results from an assessment provider against Assessment standards |
| Score engagement or predict lapse | That is Sonar / Predictive Studio | Exposes cycle, claim-progress and application signals for scoring and receives a risk signal per credential |
| Run discipline, complaint, or ethics cases | That is BizApps Ethics | Links a credential to an external case and accepts suspension or revocation instructions from it |
| Build a badging network | Interoperability beats rebuilding | Exports issued credentials in Open Badges / CLR format and publishes a verification registry |
| Process payments | That is BizApps Orders | Treats a fee as a requirement satisfied by a payment record |
| Provide a general workflow engine or dynamic status tables | The pipeline is fixed with toggles, which keeps every screen, report and guard truthful | Exposes lifecycle transitions as events for configured automation |
| Proctor examinations | Partner or integrate | — |

---

## 3. Users and roles

### 3.1 Personas

| Persona | Who | Primary surface |
|---|---|---|
| **Applicant (subject contact)** | A person acting for a subject: the compliance officer of an applying organization, or an individual candidate acting for themselves | Applicant area (in Explorer or embedded in a member portal) |
| **Peer reviewer** | A volunteer or staff reviewer assigned sections of an application, typically from another subject | Review area |
| **Committee member** | A member of the deciding body for a program | Review area (Committee Docket) |
| **Executive** | The named signatory who issues credentials | Review area (Executive sign-off) |
| **Program staff** | The credentialing organization's administrators who run the pipeline, author programs, and mediate communication | Staff area |
| **Organization administrator** | Staff who provision organizations, staff members and programs | Staff area (Organizations screen) |
| **Instance administrator** | The MemberJunction administrator of the install: users, roles, application access, metadata | The platform's own administration, not this product |
| **Public verifier** | Anyone holding a verification link: an insurer, a regulator, a client, an employer | Public registry page and API |
| **Machine callers** | The organization's other systems and the product's own agents | API |

### 3.2 Capability and scope are separate axes

- **Capability** is what a person may do, granted by platform roles: Credentialing Staff, Credentialing Committee, Credentialing Reviewer, Credentialing Admin, Credentialing Registry (machine only), plus the platform's default user role.
- **Scope** is whose programs a person may do it to, granted by membership in an accrediting organization with a membership role (Staff, Committee). A person may hold several memberships (staff at one body, committee at another).
- **Standing is data-derived where it should be.** A person is an applicant because a subject contact row names them; a reviewer because an assignment names them. Neither requires a role grant, so onboarding an applicant never touches platform roles.
- A capability role without any organization membership is a dead account: it sees nothing and every write is refused. The system shall surface this state to administrators rather than let it appear as an empty screen.

### 3.3 One application, three audience areas, and the registry

The BizApp registers a single Credentialing application. Its navigation is grouped into audience areas, and a person sees only the areas their roles and standing entitle them to.

| Area | Audience | Navigation |
|---|---|---|
| **Applicant** | Subject contacts | My Applications · Standards · Documents · Activity · My Credentials |
| **Review** | Peer reviewers and committee members (one audience, one area) | Assignments · Workspace · Committee Docket |
| **Staff** | Program staff | Pipeline · Program Studio · Data Bindings · Decisions · Trust · Organizations (Credentialing Admin only) |
| **Public registry** | Anyone | Branded verification page and JSON API, no sign-in; served by the app's server package |

The area a person is working in *is* their role for that session; there is no in-screen role switcher. A nav item is a screen is a tab; record parameters (application, section, subject) travel on the URL so any screen can link to any other carrying the right record, within an area or across areas. Every screen is an embeddable, routing-free component: Explorer is one host, and a member portal or another BizApp may host the Applicant area's screens under its own navigation.

---

## 4. Domain model

This section defines the concepts the requirements use. It is conceptual; column-level detail belongs to the data dictionary generated from the schema.

### 4.1 Organizations and tenancy

- **Instance.** One MemberJunction install. Multi-tenancy is the hosting control plane's concern; there is no tenant entity in the product.
- **Accrediting Organization.** The body that owns programs and issues credentials under them. Every program has exactly one owning organization, and that single reference is what makes the whole chain (version → section → standard → application → credential → extraction) resolvable to an owner with one join. An instance may hold several organizations (a society with several boards, a federation, a services provider running programs for clients).
- **Organization Membership.** User × organization × role (Staff, Committee), unique on the triple. Membership is scope, not identity. A typical install holds one organization, created at first run; several are supported for federations and service providers.

### 4.2 Programs and standards

- **Program.** Name, description, **type** (Certification, Recognition, Accreditation, License), **subject type** (Person, Organization), subject noun for display ("pool", "facility", "professional"), credential prefix, status (Active, Retired), owning organization, and an optional **host entity** naming the instance's own party record type for prefill.
- **Program Version.** A standards vintage ("2027"). Status Draft, Active, Retired. Carries the workflow toggles, promotion thresholds, rollout flags, communication settings and audit settings listed in FR-2.
- **Section.** A numbered grouping within a version. First-class because agreement telemetry, automation decisions and reporting aggregate by section.
- **Standard.** One requirement statement with code, text, guidance, **response type**, **intake mode**, **evaluation mode**, interpretive flag, eligibility flag, new-for-version flag, evidence hint, and a **lineage key** that identifies the same requirement across versions.
- **Document Requirement.** The version's upload checklist: name, required flag, sensitivity policy (Normal; RestrictedAllowed, meaning an attestation may stand in for the file).

### 4.3 Subjects and identity

- **Subject.** The party being credentialed: subject type, display name, primary email, status (Active; Inactive for records that exist only as historical ground truth), a **party reference** to a record in the instance (by default a BizApps Common Person or Organization; optionally any entity the deployment names), and a profile snapshot captured at application time.
- **Subject Contact.** User × subject with role (Primary, Staff). A subject contact row is what makes a signed-in user an applicant for that subject.

### 4.4 Applications and responses

- **Application.** Subject × program version, optionally bound to a renewal cycle. Carries the lifecycle status, submission and decision timestamps, the current stage window, clock-pause state, governing-body attestation, and audit-sample flag. One live application per subject, version and cycle; closed-out history accumulates beneath.
- **Standard Response.** One per application × standard: response text, scalar response value, self-assessment (Met, Partially met, Not met), status (Empty, Drafted, Prefilled, Located, Confirmed, Flagged), author type (Human, Agent), confirmer and time, and **provenance** (source type, source reference, retrieval time, raw value, staleness).
- **Response Citation.** A pointer from a response to evidence: document, source label, page reference, locator.

### 4.5 Evidence, extractions, and activity claims

- **Evidence Document.** Owned by the **subject**, not by one application, so a library is built once and refreshed each cycle. File, extracted text, content hash, status (Current, ConfirmCurrent, Restricted, Superseded), supersession chain, sensitivity level, optional document requirement.
- **Application Document.** The freeze join: which documents were in scope when the application was submitted, and when.
- **Extraction.** One AI reading of one document for one standard: value, locator (page, character span, heading path, verbatim excerpt), consensus record, confidence, status (Proposed, Accepted, Rejected), supersession.
- **Activity Claim.** A subject-owned claim of a completed activity toward a quantity standard: provider, title, date, units, category, evidence document, verification status (Claimed, Verified, Rejected), verification source (Accredited provider, Learning platform, Reviewer, Audit).

### 4.6 Review

- **Review Assignment.** Reviewer × application × role (Peer, Committee, Executive) × section scope, with due date and status.
- **Review Observation.** The unified commentary stream. Author type (Human, Agent, Applicant), type (Finding, Discrepancy, Comment, Flag, Recommendation), severity, confidence (agent rows only), text, visibility lane (Internal, WithApplicant), status (Open, Resolved), thread parent, mentions, agent run reference, automated-result flag, imported flag, supersession, evaluation-run reference.
- **Observation Reaction.** Reviewer × observation: Agree, Disagree (rationale required), Agree with changes. One per reviewer per observation. This is the calibration telemetry.
- **Review Message.** Conversation rows per application and optionally per standard: author, author type, visibility lane, channel (Everyone, Staff, Reviewers, Committee), for-committee flag, release state (for mediated programs).
- **Agreement Statistic.** Per standard lineage: agree rate, observation count, reviewer count, replay floor, computed per period with an all-time row.

### 4.7 Decision

- **Committee Objection.** Raised by a committee member during the passive window; status Open, Scheduled, Resolved.
- **Decision.** One per application: outcome (Approved, Deferred, Denied), conditions, effective date, letter text, letter file, status (Draft, WithExecutive, Signed), signer and time.
- **Recommendation.** A letter line item tracing to a finding, a staff note, or an optional suggestion; included flag.
- **Appeal.** A bounded work item linked to a signed decision with outcome Upheld or Overturned.

### 4.8 Credentials

- **Credential.** Subject × program, optionally the issuing application, credential number (unique, immutable), status (Active, Expired, Suspended, Revoked), issue and expiry dates, verification token, issuing source (Application, Import, ExternalIssuer), external issuer and reference where applicable.
- **Cycle.** Credential × renewal window (open, close) with status Pending, Open, Closed. Created at issuance.
- **Verification Token.** The opaque token behind a public verification link; re-minted on each signature.

### 4.9 Automation configuration and evaluation

- **Response Source (binding).** Standard × ranked source: type (HostQuery, PriorResponse, DocumentExtraction, ActivityClaims, AssessmentResult, PaymentRecord), query or definition, transform, mode (PrefillOnly, VerifyOnly, Both), status (Proposed, Active, Retired), proposing agent run, last dry-run result.
- **Evaluation Run / Evaluation Match.** A replay of the review agent against historical human commentary under a pinned configuration; per-pair judge verdicts (SameIssue, RelatedIssue, NoMatch) and metrics.

---

## 5. Functional requirements

### FR-1 Organizations and administration

- **FR-1.1** The system shall support multiple accrediting organizations in one instance, each owning its own programs, and shall isolate each organization's programs, applications, subjects-through-applications, credentials, evidence and commentary from every other organization on reads and on writes.
- **FR-1.2** An **Organizations** screen in the Staff area, available to the Credentialing Admin role, shall list every organization with program and application counts, manage each organization's members and their membership roles, and offer **New organization**, a wizard that creates the organization, its first staff member (existing or new user), the staff membership, the platform staff role, and access to the Credentialing application's Staff area, idempotently. On an install with no organization yet, the Staff area shall open on this wizard as first-run setup.
- **FR-1.3** A staff user holding memberships in more than one organization shall choose the organization they are working in from an **organization picker** in the Staff area; the picker is hidden for a user with one membership. The choice narrows what staff screens show and which organization new programs and invitations belong to; it never widens what the user may read or write.
- **FR-1.4** Removing an organization shall remove its memberships and its program tree and shall reconcile platform role grants it made, so that no dead accounts are left behind. It shall never delete user accounts or subjects, which are identity facts rather than organization data.
- **FR-1.5** Staff creation and onboarding shall validate email addresses before any user account is minted and shall report partial failures truthfully.

### FR-2 Program authoring (Program Studio)

- **FR-2.1** Staff shall create a program through a wizard (name, type, subject type, subject noun, credential prefix, description); creation produces the program and its first Draft version with default settings.
- **FR-2.2** Sections and standards shall be authored, edited, reordered and deleted only on a **Draft** version. An Active version's tree is read-only; **Edit in draft** clones it into a new Draft version. Authoring controls are absent, not disabled, on an Active version.
- **FR-2.3** Standards shall carry: code, text, guidance, response type (Attestation, Narrative, Evidence, Composite, Quantity, Assessment, Fee), intake mode (Manual, Locate, Prefill), interpretive flag, eligibility flag, new-for-version flag, evidence hint, and lineage key. **Evaluation mode is never editable in the studio**; it changes only through the Trust screen (FR-15).
- **FR-2.4** Quantity standards shall additionally define units, target quantity, period rule (per cycle, rolling months), category constraints and category minimums. Assessment standards shall define the assessment provider, instrument and passing threshold. Fee standards shall define the fee product and when it gates (submission or issuance).
- **FR-2.5** Staff shall be able to create and activate a new version **at any time**, on the organization's own timing rather than an annual cycle. Activation retires nothing automatically; a prior Active version may remain Active while applications on it finish.
- **FR-2.6** Version settings shall be organized in three tiers with different edit rules:
  - **Workflow toggles** (Draft-only): peer reviewer count; passive approval window days; requires screening; requires executive approval; **requires governing-body attestation** at submission; **applicant communication mode** (StaffMediated, Direct); **renewal review mode** (Full: every renewal follows the full review path; StaffScreened: renewals not selected for audit are screened by staff and decided without peer review); audit sample rate and audit selection rule for renewals; appeal window days.
  - **Promotion thresholds** (Draft-only): minimum agree rate, minimum observations, minimum reviewers, minimum replay floor.
  - **Rollout flags** (editable on Active): agent observations visible to reviewers; promotion enabled; auto carry-forward on renewal.
  - Draft-only settings redefine what a review means and would retroactively change applications in flight; rollout flags change only what happens next. The screen shall say so.
- **FR-2.7** Document requirements shall be authored per version with name, required flag, and sensitivity policy.
- **FR-2.8** **Handbook import**: staff upload a standards handbook (PDF, DOCX, XLSX, text, Markdown); the system proposes a section and standard tree with codes, response types, intake modes, text, guidance and evidence hints, and lists what it could not use. Staff select rows and **Apply**; the proposal writes nothing until then, writes only to a Draft version, skips existing codes, and sets every imported standard to human-only evaluation.
- **FR-2.9** Every standard shall show what applicants have actually cited against it and its lineage across versions (how many observations carry).
- **FR-2.10** Change history on standards, decisions, applications and credentials shall be viewable by staff and committee from the record.

### FR-3 Subjects, identity and onboarding

- **FR-3.1** Staff shall invite an applicant through a wizard: program and Active version; subject (existing or new: type, display name, email); contact (existing or new user); review. Invitation creates the subject, the contact link, the user account where needed, access to the Applicant area, and a Draft application.
- **FR-3.2** The system shall support **external applicant identity**: invited contacts receive a magic-link invitation and may sign in without a pre-existing platform account; a program may additionally allow **self-service eligibility pre-check**, an anonymous intake that creates a subject and a Draft application when the eligibility answers pass. Exposure of external identity is conditional on **NFR-1.3** (complete row-level isolation on every applicant-data entity).
- **FR-3.3** A subject's party reference shall default to a BizApps Common Person or Organization; a deployment may point subjects at any entity in its own schema. No credentialing table shall hold a foreign key into deployment-specific data; the reference is polymorphic by entity name and record id.
- **FR-3.4** A user holding contact rows on more than one subject shall land on a subject picker; a user with one subject never sees it. The chosen subject carries across every Applicant area screen and survives reload and deep links.
- **FR-3.5** The product shall not implement its own impersonation. Should the platform provide support impersonation, every screen shall treat it as a lens: it scopes what is shown, never who writes, and write-capability controls check the real signed-in user's own roles.
- **FR-3.6** Access to the Credentialing application shall be granted explicitly (by the wizards or by staff), never self-provisioned. Within it, the Review and Staff areas shall be offered only to users holding their roles, and the Applicant area only to users holding a subject contact row.

### FR-4 Applications and intake

**Lifecycle**

- **FR-4.1** An application shall walk `Draft → Submitted → [Screening] → InReview ⇄ InfoRequested → Committee → [ExecSignOff] → Decided → Closed`, with `Withdrawn` reachable from any state before `Decided`. Bracketed stages are per-version toggles. The server shall enforce the whitelist of transitions and who may perform each.
- **FR-4.2** `InfoRequested` shall pause the review clock, record the reason, open an applicant-visible conversation, and resume on staff action. Age and cycle-time metrics shall count running-clock time only, and shall show the pauses.
- **FR-4.3** A denied or withdrawn subject shall be able to re-apply; a second live application for the same subject, version and cycle shall be refused with a sentence.
- **FR-4.4** Withdrawal shall require a reason, recorded with the application and shown to the applicant; staff may withdraw before `Decided`, an applicant before `Committee`. Closing is staff-only.

**Answering standards (Standards Runner)**

- **FR-4.5** The applicant shall see sections in a rail with confirmed-of-total counts and NEW markers, a per-section progress bar, and filters (Needs your review, Confirmed, All).
- **FR-4.6** Each standard card shall show code, text, guidance, its state, its intake mode, and the actions the state allows: **Edit answer** (never a click-to-edit region), **Save draft**, **Read and confirm**, **Cancel**, and a self-assessment (Met, Partially met, Not met). Confirming is a deliberate second act, not a side effect of saving.
- **FR-4.7** A machine-drafted answer shall display its provenance line ("Drafted from {source} · {date}"), its source chips, a staleness marker where applicable, and an expandable explanation (**What** it concluded, **Why**, **How**) ending with the sentence that the applicant is responsible for the answer once confirmed. Clicking a source chip opens the evidence with the cited passage highlighted.
- **FR-4.8** On a **Locate** standard the assistant points at passages and citations but writes no text; the card says so. On a **Manual** standard nothing is drafted and the card says why. On a program with no prefill capability the portal explains the posture rather than showing nothing.
- **FR-4.9** A confirmed answer shall be frozen except by staff-initiated supersede or a reviewer flag for correction; the refusal reason renders as visible text. A stale prefill shall be marked but never silently replaced.
- **FR-4.10** **Refresh prefills** re-runs resolution for the application; it shall never overwrite a confirmed or human-drafted answer, so applicants may trigger it themselves. It is hidden on programs where nothing could ever be prefilled.
- **FR-4.11** Eligibility standards shall be presented first and shall gate submission: an application cannot be submitted until every eligibility standard is confirmed and, where bound to a verification source, verified.
- **FR-4.12** Quantity standards shall show progress from the subject's verified activity claims against the target, by category where constrained, and shall let the applicant apply claims from the Activity screen (FR-6).
- **FR-4.13** Assessment standards shall show the recorded assessment result, its source and date, and whether it clears the threshold; they are satisfied only by a result recorded from an assessment provider or entered by staff with its source recorded, never by the applicant.
- **FR-4.14** Fee standards shall show the fee, its payment state and a link to pay; they are satisfied only by a payment record.
- **FR-4.15** Each standard card shall carry a collapsed conversation about that standard (FR-10).

**Submission**

- **FR-4.16** **Review and submit** shall present a gate list: every section with its confirmed count and a pass mark, every required document with a pass mark, every eligibility, assessment and fee standard with its state, the governing-body attestation where required, and a gap list in which every gap links to the screen that resolves it. Submit stays disabled with its reason until every gate passes.
- **FR-4.17** Where the version requires it, submission shall capture a **governing-body attestation**: the name and role of the attesting officer or the date of the governing body's approval, and a signed statement, recorded with who and when.
- **FR-4.18** Submission shall be re-validated on the server against fresh reads, shall stamp the submission time, shall **freeze** the in-scope document set and the confirmed answers, shall trigger the verifier and reviewer agents, and shall notify staff. A freeze note on the gate screen explains what submitting locks.

### FR-5 Evidence and documents

- **FR-5.1** The **Document Library** belongs to the subject and is reused every cycle. It shows one ledger per program the subject holds applications on: requirement, document on file, uploaded date, status, what the assistant has read from it (citation counts), and actions (Upload, Upload new, Still current, Versions, Download original). A **General uploads** section holds evidence not tied to a requirement.
- **FR-5.2** Upload shall accept drag-and-drop and a picker, from the library, from a requirement row, or from a standard card. Nothing is submitted by uploading, and the dropzone says so.
- **FR-5.3** Restricted material (for example claims or underwriting manuals) shall have two dignified paths defined by the requirement's sensitivity policy: an **attestation in lieu of upload** recorded on the requirement, or a **view-only session** in which a reviewer inspects the material without the file entering the system. A restricted row says so instead of showing a broken link.
- **FR-5.4** The system shall extract text from PDF (text layer or OCR for scans), DOCX, XLSX, plain text and Markdown; a format it cannot read shall fail in a structured way that names the formats that would have worked. OCR shall be bounded by page count and pixel budget, shall carry low-confidence text rather than discard it, and shall distinguish "toolchain unavailable" from "document unreadable".
- **FR-5.5** Every stored file shall carry a SHA-256 content hash computed on store and on supersede. Version history shall walk the supersession chain and show date, uploader, hash and download per version, stating when ordering is inferred from dates rather than recorded supersession.
- **FR-5.6** A document whose currency must be re-affirmed for a new cycle shall offer **Still current** alongside **Upload new**.
- **FR-5.7** Extracted text shall be written before the document record exists, so extraction triggered on create never races an empty row. Evidence extraction shall run automatically on every upload; nobody clicks "Analyse".
- **FR-5.8** A **document viewer** shall open from any citation: an Original tab rendering the real document (multi-page PDF, images inline, other types download-only) and an Extracted text tab with the cited span highlighted and honest notes when a highlight cannot be found or is ambiguous. It shall be a native modal with focus trap and Escape.
- **FR-5.9** File bytes shall be served only to a caller authorized on the document's subject, with existence not disclosed before authorization; a conflict-free assigned reviewer may read bytes but never upload into an applicant's record.

### FR-6 Continuing activity claims and audit sampling

- **FR-6.1** The **Activity** screen shall let a subject log activity claims (provider, title, date, units, category, evidence document), see verified totals per quantity standard and per category, and see which claims are applied to which application.
- **FR-6.2** Claims shall be **verified automatically** when the provider holds an active provider-accreditation credential in this instance, or when the claim arrives from a connected learning platform as a completion record. All other claims remain Claimed until a reviewer or an audit verifies them.
- **FR-6.3** Provider accreditation is a **program** (type Accreditation, organization subjects) and needs no separate feature; an accredited provider's credential is what turns its claims into verified claims, and its expiry or revocation stops that automatically.
- **FR-6.4** A quantity standard shall be satisfied when applied verified units meet the target and every category minimum, within the period rule. Claimed-but-unverified units shall count toward a provisional total shown distinctly.
- **FR-6.5** On submission of a renewal, the version's **audit sample rate and selection rule** shall decide whether the application is audit-selected. An audit-selected application shall require evidence for every applied claim, shall route those claims through evidence extraction and verification, and shall follow the full review path; a non-selected renewal follows the version's renewal review mode (FR-2.6). Selection shall be recorded with the rule and the random seed used, so it can be shown to be fair.
- **FR-6.6** Staff shall be able to select an application for audit manually with a recorded reason, in addition to the sample.

### FR-7 Data bindings: prefill and verification

- **FR-7.1** A **Response Source** binds a standard to a ranked source of type HostQuery (a stored query over the instance's own records, parameterized by the subject's party record), PriorResponse (the subject's last confirmed answer on the same lineage), DocumentExtraction (an accepted or proposed extraction for the subject's current document), ActivityClaims (verified claim totals), AssessmentResult, or PaymentRecord, with a mode (PrefillOnly, VerifyOnly, Both).
- **FR-7.2** **Resolution** shall be deterministic: for each standard, evaluate active prefill-capable sources in rank order and take the lowest rank with a non-empty value; ties break by declaration order. Intake mode gates presentation, not resolution: Prefill writes text with provenance; Locate writes a citation only; Manual writes nothing. Resolution shall never overwrite a Confirmed or human-Drafted answer.
- **FR-7.3** **Verification** shall re-evaluate verify-capable sources at submission and at review; each divergence between a confirmed answer and instance data becomes a Discrepancy observation citing both values. Prior responses are never used for verification, because a previous claim is not instance truth. Prefill and verification come from the same rows.
- **FR-7.4** A **Binding Drafter** agent shall propose bindings for unbound standards by introspecting the program's declared host entity and the standard's text; it shall write only Proposed rows ranked behind every human-authored binding, and shall dry-run each proposal before presenting it.
- **FR-7.5** The **Data Bindings** screen shall show each binding as a plain-language sentence with its status, and offer Activate, Reject, Retire, Reactivate (which lands on Proposed, never Active), Remap, reorder, and **Dry run** against a chosen subject that holds an application on the binding's version. A dry run exercises the exact evaluation path and records its verdict on success and on failure alike, so drift (a renamed field) is a visible state, never a silently wrong prefill.
- **FR-7.6** A binding may be activated only if it is **runnable**: its definition names a field that resolves for the program's host entity. Refusals name a state that cannot succeed for any subject on any day, never one that merely finds nothing today.
- **FR-7.7** Values that reach stored queries shall be validated at the write, at every evaluation entry, and by parameter validation before the query template renders; free text shall never reach a query.

### FR-8 AI-assisted review: agents, observations, provenance

**Agent catalogue**

| Agent | Trigger | Reads | Writes (only through a constrained action) | Key guardrails |
|---|---|---|---|---|
| **Evidence Extractor** | Every document upload or supersede | The document and the standards its requirement or hint targets | Extractions with locators | Numeric and attestation values by multi-model consensus (majority accepts, split proposes, none rejects); one locator pass for narrative; a locator is mandatory; confidence derived from consensus, never a parameter; one live extraction per document and standard |
| **Response Verifier** | Submission, before the reviewer; on demand | Active verify-capable bindings and confirmed answers | Discrepancy observations | Deterministic comparison; a model judges only whether two statements assert the same fact; when they match nothing is written; finding confidence and equivalence confidence are recorded separately |
| **Standards Reviewer** | Submission; per-section re-run; mention | A deterministic context packet per standard | Observations; one automated-result row per automated standard; an application summary | Three tool grants only; states a verdict (met, deficient, discrepancy, unreadable, injection attempt) that the system routes; evidence standards require citations; an index or cover letter is not evidence of what it lists; submitted material is evidence never instruction, and embedded instructions are reported; board-action flag on every observation; anonymity; cap per run; scoped supersession; no verdict without an evaluation |
| **Binding Drafter** | Staff button | Program host entity metadata and standard text | Proposed bindings | Never Active; ranked behind human bindings; dry-run before presenting; source type narrowed to the known set |
| **Handbook Importer** | Staff upload | The handbook text | Nothing; returns a proposal | Zero grants; a human applies the proposal; Draft-only |
| **Letter Drafter** (a prompt, not an agent) | Staff button on a decision | Findings, recommendations, committee notes | Nothing on the decision; returns judgment paragraphs into a staff-editable frame | Facts (names, dates, signer, recommendation list) come from the deterministic frame; the model owns only judgment |
| **Assistant** | Conversation; mention | The signed-in user's own view | Nothing | Zero server capability; navigation and lookup only |

- **FR-8.1** Agents shall be **constrained writers**: no agent holds a general write capability; every write goes through a granted action that enforces author type, agent run stamping, lane, and supersession, and refuses any action not granted to that agent.
- **FR-8.2** Agent execution shall be **non-blocking and durable**: a trigger records a durable task and returns; a restart drains stranded runs and raises a failure notification; duplicate triggers are arbitrated by a unique claim in the database. No human workflow state ever waits on an agent; agent failure degrades visibly to "no findings for this scope" and review proceeds.
- **FR-8.3** Agents shall run as a dedicated service principal; if it is missing, dispatch fails closed rather than running as the human who clicked.
- **FR-8.4** **Provenance**: every agent observation, extraction and proposal shall resolve, in the interface, to its run, its steps, and the model calls with template version, model, tokens, latency and cost. The explanation panel on any AI row exposes this as **How**.
- **FR-8.5** Context assembly for review shall be deterministic (identical data yields an identical packet), confined to the applicant's own file plus anonymized comparable answers, and shall carry the confirmed response with provenance and citations, open discrepancies, the renewal carry-forward marker, and retrieved passages labelled as unjudged.
- **FR-8.6** Model routing, prompt templates, caching and fallback shall be metadata; prompts shall be composed from shared partials (domain framing, observation taxonomy, severity rubric, locator rules, anonymity) with a drift gate that fails when a composed template and its source disagree; every prompt shall be parameterized by program (name, organization, subject noun, type), with no program vocabulary in any template.
- **FR-8.7** Evidence locators shall be derived from a verbatim excerpt the model returns and anchored in the real extracted text by the system; model-reported offsets shall be forbidden. The excerpt is the truth and the span is a cache, re-verified at read time and re-anchored on re-extraction; a span that does not fit is dropped, never clamped.

**Observation model**

- **FR-8.8** Observations shall be typed Finding, Discrepancy, Comment, Flag or Recommendation, with severity from program configuration, never from the model. Agent verdicts route deterministically: met → Comment (Low); deficient and unreadable → Finding; discrepancy → Discrepancy; injection attempt and board-action → Flag. "Unreadable" is a Finding because it is a gap a person must close.
- **FR-8.9** A **board-action flag** (this item likely needs the subject's governing body) shall be the one agent row shown to an applicant before a human reads it, shall assert no defect, and shall stay open so a disagreeing staffer resolves it in one click.
- **FR-8.10** An **automated result** row (the standard-level verdict of an automated standard) shall be excluded from agreement statistics, counted separately from open flags, and shall be **unreactable**, with the interface saying why.
- **FR-8.11** Supersession shall be scoped to the same application, standard, agent and evaluation lane, so a re-run never destroys another agent's rows and an evaluation run never touches production. Superseded rows keep their reactions for telemetry and disappear from review surfaces.
- **FR-8.12** A refused write shall never be silent: it is counted, named on the run, and makes the run unsuccessful.

### FR-9 Human review

- **FR-9.1** **Assignments** shall list the reviewer's applications with sections, due date, real per-standard progress, what is awaiting their reaction, internal discussion since their last visit, and a statement of why their reactions matter with their own count this cycle.
- **FR-9.2** Staff shall assign reviewers with a section scope validated where it is entered; the **conflict-of-interest gate** refuses assigning a reviewer to an application whose subject they are a contact on, with no staff override. Reviewers shall attest to a conflict check, shown in their header.
- **FR-9.3** The **Section Workspace** shall walk standard by standard: the applicant's confirmed response with citation chips opening the viewer at the cited span, the AI findings with What/Why/How and a confidence pill, human commentary, the reviewer's own reaction row, **Previous/Next**, **Re-run AI review** for the section, and an **Application conversation** entry above the sections.
- **FR-9.4** Reactions on agent findings shall be **Agree**, **Disagree** (one-line rationale required), **Agree, with changes**, and **Resolve**, with a tally of other reviewers' reactions. Agree with changes counts as agreement. After a reaction the interface confirms that the judgment calibrates automation for this standard.
- **FR-9.5** Every observation shall be repliable one level deep; a reply inherits its parent's application, standard and lane and cannot change them. Resolved roots collapse to one line and stay expandable; the applicant is never told which reviewer resolved a thread.
- **FR-9.6** The internal lane composer shall support **@-mentions** of the review agents (invoking a threaded AI reply composed only from rows in the addressed lane) and of fellow reviewers on the application (an in-app notification deep-linking to the thread). The roster excludes the author, service principals and conflicted reviewers. Mentions are internal-only.
- **FR-9.7** **Comparable answers**: up to three anonymized, confirmed answers to the same standard lineage from other subjects, ranked by relevance and post-filtered for eligibility. When retrieval is degraded and finds nothing, the strip says so rather than showing an arbitrary list. This strip remains available on automated standards so reviewers keep cross-subject perspective.
- **FR-9.8** A reviewer whose assignment is complete may not post further; a reviewer with no standing on a screen sees an empty state with a way back, never an error.
- **FR-9.9** Reviewer identities shall never reach an applicant: no path from applicant surfaces to assignments, reviewer names, or internal rows; applicant-facing author labels are role-neutral.

### FR-10 Communication

- **FR-10.1** Every application shall carry one shared conversation per standard and one application-level conversation. Lanes are **Internal** (reviewers, staff, agents), **WithApplicant** (the one lane an applicant can read and write), and **Private** (author and assistant only). Lane is enforced at write time.
- **FR-10.2** A message's **channel** (Everyone, Staff, Reviewers, Committee) narrows who is **notified** and which badge the row wears; it never hides the row from anyone who could already read the lane, and the composer says so. The **Committee** option exists only while the application is at the committee or sign-off stage, and a **Place this before the committee** flag surfaces the message in the docket's summary.
- **FR-10.3** **Communication mode** is a version setting:
  - **StaffMediated** (default): applicants may address staff and the assistant only; the **Place this before the committee** flag remains available during the committee stages and staff see the note before the committee does; a reviewer's message intended for the applicant is held in a **release queue** where staff release it as written, rewrite it, or decline it, and the released message is attributed to staff. Reviewers never contact applicants directly.
  - **Direct**: reviewers may post to the applicant-visible lane under a role label ("Peer Reviewer 2"); applicants may address reviewers as a channel, never by name.
- **FR-10.4** Applicants may **@-mention the assistants** (Standards Reviewer, Response Verifier, Evidence Extractor) and never a person; the reply is composed only from applicant-visible context.
- **FR-10.5** Messages shall be **append-only**: no update and no delete by any role. Terminal applications still accept messages (an applicant may ask what a decision means).
- **FR-10.6** Only a contact on the application's own subject may write as Applicant, and such a contact may write as nothing else; committee members get exactly one write, an applicant-visible reply, and only during the committee stages; the author id is stamped and refused when it names anyone else.
- **FR-10.7** **Notifications** shall be raised for: information requested; decision issued; cycle opened; renewal created; audit selected; review assigned; reviewer mentioned; applicant message posted; message for applicant; message awaiting release; agent run completed; agent run failed; credential expiring (configurable lead times); credential status changed; appeal filed and decided. Recipients are derived (subject contacts, organization staff, assigned reviewers, committee only during its stage), the author is never notified, applicant-facing bodies never name a person, every notification deep-links to the right application and screen, and delivery failure never blocks the write that caused it.
- **FR-10.8** Notifications shall be deliverable in-app and, when a communication provider is enabled, by email and SMS through the platform's communication engine, using staff-editable templates.

### FR-11 Committee and decision

- **FR-11.1** The **Committee Docket** shall show every application at the committee stage with its window ("No action = advances when the window closes"), a **Read summary** panel (recommendations, unresolved flags, concurring reviewers, notes the applicant placed before the committee with a **Quote this note** action, and the applicant conversation), and **Raise objection**, which requires a note.
- **FR-11.2** An application shall advance from Committee automatically when its window closes with no open objection and a drafted decision. An objection halts advancement; the escalated discussion may be scheduled as an agenda item on the committee's meeting (see §8) and the objection resolves with a recorded outcome.
- **FR-11.3** **Decisions** shall let staff pick the outcome in the program's own vocabulary (Approved, Deferred, Denied, rendered as Recognized/Certified/Accredited/Licensed per program type), record conditions and an effective date, assemble **recommendations** from review findings (each tracing to its finding and run) and staff notes, and route: **Send to executive** where the version requires it, otherwise **Record decision**; **Return to committee**.
- **FR-11.4** The **letter** shall be a hybrid: a staff-editable deterministic frame (salutation, outcome sentence, recommendation list, date, sign-off) plus model-drafted judgment paragraphs on request. Drafting never writes to the decision's letter text; a human accepts it. The same frame renders whether or not AI drafting was used.
- **FR-11.5** **Executive sign-off** shall sit with the docket: **Sign and issue — as {name}** or **Return to staff**. Signing is one transaction: the decision becomes Signed with a server-stamped signer and time, the application becomes Decided, the credential is issued or updated, the letter PDF is generated once and stored, the verification token is re-minted, and notifications go out. A signed decision is frozen entirely; a decision with the executive is frozen as to content; history stays readable.
- **FR-11.6** A decision may leave Draft only once the application has reached the committee stage. Its application reference is immutable.

### FR-12 Credential issuance, registry and verification

- **FR-12.1** A credential shall carry a unique, immutable number formed from the program's prefix, the version label and a sequence; uniqueness is enforced structurally so a numbering race fails loudly rather than issuing duplicates.
- **FR-12.2** Credential status shall be Active, Expired, Suspended or Revoked; Revoked is terminal; status changes are staff or service actions and every change is recorded with reason, actor and time. Suspension and revocation may also be instructed by a linked ethics case.
- **FR-12.3** A credential may be recorded **without an application**: imported from a legacy platform (issuing source Import) or recorded as issued by an external body (issuing source ExternalIssuer, with issuer and reference). Such credentials carry the same lifecycle, cycles and verification.
- **FR-12.4** **My Credentials** (Applicant area) shall list every credential the subject holds with status, dates, cycle windows, claim progress toward the next renewal, the decision letter and recommendations, **Download certificate**, **Share verification link**, and an explanation of what the public registry discloses. A revoked, suspended or expired credential is stamped across its certificate, not hidden.
- **FR-12.5** The **certificate** shall be generated on demand from live credential state and never stored; the **decision letter** shall be generated once at signature and never overwritten.
- **FR-12.6** The **public verification page** shall require no sign-in, shall be branded per organization, and shall show exactly: validity, credential number, subject name, program, certificate title, status, issue and expiry dates, and version label. It shows a revoked credential as revoked rather than as unknown. It exposes no application content, ever.
- **FR-12.7** A **registry API** shall serve the same whitelisted fields by token, and a bulk export by program and status for regulators and boards, under a registry API key; rate limiting shall be enforced at the gateway in production.
- **FR-12.8** Issued credentials shall be exportable in Open Badges / CLR format for interoperability with badging networks.

### FR-13 Renewal cycles and expiry

- **FR-13.1** Every issued credential shall receive a Pending cycle at issuance with a window opening a configurable lead time before expiry and closing at expiry.
- **FR-13.2** An unattended scheduled sweep shall, idempotently: open cycles whose window has arrived; spawn one renewal application per open cycle bound to the program's **current Active** version; carry forward the subject's confirmed answers on matching lineages as Prefilled with prior-response provenance (authoring the prior-response bindings the version lacks when auto carry-forward is on); mark stale where the standard text changed or a cited document was superseded; expire credentials past expiry and close their applications; and never overwrite Suspended or Revoked.
- **FR-13.3** A renewal application shall be marked as such throughout, with a banner explaining what was carried forward and that everything carried must be reviewed before confirming.
- **FR-13.4** Cycles shall close when the renewal reaches a terminal state. A cycle opens exactly once; an open cycle with no application is repaired on the next pass, not stranded.
- **FR-13.5** Expiry reminders shall be sent at configurable lead times, and staff shall see upcoming expirations and unopened renewals in the pipeline.

### FR-14 Appeals

- **FR-14.1** Within the version's appeal window after a Denied decision, an applicant may file an appeal with grounds and evidence. Filing creates an appeal linked to the signed decision and a work item for staff; it does not reopen the application.
- **FR-14.2** Staff shall route the appeal to reviewers or the committee as the program defines; the appeal resolves Upheld or Overturned with a recorded rationale. Overturned supersedes the decision with a new signed decision through the normal sign-off path; the original stays in the record.
- **FR-14.3** Appeal state and outcome shall be visible to the applicant and shall notify them.

### FR-15 Trust and automation governance

- **FR-15.1** Every standard shall hold an **evaluation mode**: HumanOnly, AIAssisted (findings shown to reviewers, humans decide everything), AIAutomated (the standard-level result is written automatically; the application-level decision remains human).
- **FR-15.2** Raising a mode shall be gated, in order, so the refusal names the first problem: the standard is not interpretive; the version is Active; HumanOnly → AIAssisted needs nothing more; → AIAutomated additionally requires coming from AIAssisted, the version's promotion flag on, and all four thresholds clear on the all-time statistics: agree rate, observation count, reviewer count, and replay floor. A missing statistic is a shortfall, never a vacuous pass. Thresholds come from the version, never a constant.
- **FR-15.3** **Lowering is always allowed**, by any staff member, with no threshold. Promotion is a named human action and is recorded with the evidence attached.
- **FR-15.4** The **Trust & Automation** screen shall show, per program version: KPIs (AI observations reviewed by people, overall agreement, standards automated, human-always count); a ledger per standard (mode, agreement, observations, reviewers, replay floor, action); a promotion panel stating the thresholds and the sentence that applications still receive a human decision and demotion is one click; monthly agreement trends; where reviewers disagree most **by section**; and the evaluation panel.
- **FR-15.5** **Agreement statistics** shall be computed on a schedule per standard lineage over non-superseded, production, agent-authored observations with at least one reaction, as an all-time row and a monthly series, excluding automated results. Statistics shall also be presented aggregated **by section**.
- **FR-15.6** **Replay evaluation** shall re-run the review agent, under a pinned configuration and in an isolated lane, against applications carrying historical human commentary, join agent and human observations by lineage, judge each pair with a differently-routed model, and write per-lineage replay floors. A lineage the corpus never covered gets no floor: not measured is not zero. The harness reports agreement, never accuracy.
- **FR-15.7** A **regression gate** shall compare a new evaluation run to a baseline stored per prompt-and-model version hash, overall and per lineage, and shall refuse when there is nothing to compare against. A change to any review prompt invalidates the baseline.
- **FR-15.8** Adversarial fixtures (contradicted citations, index-as-proof, boundary values, image-only scans, embedded instructions, garbage answers) shall be part of the release evaluation, with fabricated citations, injection compliance and cross-subject leakage as release blockers.
- **FR-15.9** Reviewers on automated standards shall retain access to the evidence, the automated result's explanation, and comparable answers, and a periodic digest of cross-subject patterns shall go to reviewers, so automation does not remove the learning the process provides.

### FR-16 Reporting and the queryable data environment

- **FR-16.1** All recognition data (programs, standards, applications, responses, citations, documents, commentary, reactions, decisions, credentials) shall be first-class entities queryable through the platform's stored queries and reporting, so staff can ask across all subjects: which subjects answer a given standard strongly, the most common gaps by section, agreement trends, cycle times.
- **FR-16.2** An **executive dashboard** shall show pipeline by stage, decisions per month, reviewer agreement trend, AI cost per application, credentials by status and program, renewals due and completed, and audit outcomes. Unpriced AI runs render as unpriced, never as zero.
- **FR-16.3** The **Staff Pipeline** shall show KPIs (active, in committee window, clocks paused, median cycle with the prior-year figure, expiring credentials), one persistent search plus one filter popover, and a ledger with one primary action per row by stage and an overflow of secondary actions, with every row-scoped form in a slide panel and every withdraw a two-step act.
- **FR-16.4** Cross-subject queries shall exclude subjects marked Inactive (historical corpus) at the query layer.

### FR-17 Assistant

- **FR-17.1** A conversational assistant shall be available in every area, and in any host that embeds the components, with **zero server-side capability**: it can find a record by name or number through the signed-in user's own permissions, open an application, standard or subject on the screen the user's persona is entitled to, and explain what is on screen. It never states a decision, never says whether a standard is met, never names a reviewer, committee member or subject in cross-subject discussion, and never claims to have changed data.
- **FR-17.2** Landing rules shall be persona-aware: staff and committee land on the decision, an assigned reviewer on the workspace, an applicant on their own standards; anything else is a truthful refusal. On ambiguity the assistant asks, listing candidates, and never chooses.

### FR-18 Historical migration

- **FR-18.1** The system shall import historical applications, responses, documents and reviewer commentary from a legacy platform, to the extent the export allows, mapping legacy standards onto lineage keys.
- **FR-18.2** Imported commentary shall be flagged as historical, human-authored ground truth, immutable after import, and excluded from live surfaces by marking its subjects Inactive, so it can be used for replay evaluation from the first day without polluting the live pipeline.
- **FR-18.3** Imported credentials shall be recorded with issuing source Import and receive cycles like any other credential.

### FR-19 Integration and API

- **FR-19.1** All ordinary reads and writes shall go through the platform's API. Extension routes shall carry only what it cannot: document upload, agent dispatch, dry run, letter draft, retrieval, handbook import and apply, public verification, certificate download.
- **FR-19.2** Machine callers shall authenticate with platform API keys bound to a service principal and a scope list; an ungranted scope is denied by default and every allow or deny is logged.
- **FR-19.3** Every lifecycle transition (application, decision, credential, cycle, claim, appeal) shall be raised as an event that configured platform automation (notifications, tasks, agents, webhooks) can act on.
- **FR-19.4** The system shall accept completion records from a connected learning platform as verified activity claims, assessment results from an assessment provider (Caliber or a testing vendor) against Assessment standards, payment records from the commerce substrate against Fee standards, and suspension or revocation instructions from an ethics case, and shall expose credential, cycle and claim-progress signals to engagement scoring.
- **FR-19.5** Subjects linked to a Person or Organization record shall carry that link so credential data joins the rest of the member graph without ETL.
- **FR-19.6** The BizApp shall install, upgrade, disable and remove through the platform's app manager from its manifest, declaring its schema, migrations, metadata, packages and its dependencies on other BizApps; it shall never alter a dependency's schema.
- **FR-19.7** Every screen shall ship as an embeddable Angular component with no routing dependency, emitting navigation intents that the host resolves, so Explorer, a member portal, or another BizApp can host any area under its own navigation.

---

## 6. Business rules and invariants

These hold on every write path, including raw API calls, regardless of the interface.

- **BR-1** Only a human confirms an answer, activates a binding, applies a proposed standard, promotes a mode, or signs a decision.
- **BR-2** Standards are created and edited only under a Draft version; a standard's section is immutable; evaluation mode is never edited directly.
- **BR-3** Workflow toggles and promotion thresholds cannot change on an Active version; only rollout flags can.
- **BR-4** One live application per subject, version and cycle; re-application after denial or withdrawal is permitted.
- **BR-5** Submission freezes the document set and confirmed answers; a confirmed answer changes only by supersede.
- **BR-6** Every application transition follows the whitelist, judged against stored state, with terminal-write authority as specified.
- **BR-7** Conversations are append-only; a reply inherits its parent's lane; applicants write only as Applicant and only in the shared lane; committee members write only during the committee stages; the author id is stamped, never accepted.
- **BR-8** A reviewer may not be assigned to a subject they are a contact on; the reviewer read arm excludes such conflicts everywhere.
- **BR-9** A decision leaves Draft only after the application reaches committee; signer and signature time are stamped by the server; a signed decision is immutable; a decision's application is immutable.
- **BR-10** A credential number is immutable and unique; Revoked is terminal; program ownership of a program is immutable.
- **BR-11** Agents write only through granted actions; an agent never writes an Active binding, a standard, a decision, or a confirmed answer; an automated result is unreactable; no verdict is written without an evaluation.
- **BR-12** A refused write is never silent and an unreadable permission or audience context fails closed.
- **BR-13** Cross-organization reads return nothing and cross-organization writes are refused with a message identical to "not found", so records cannot be enumerated.
- **BR-14** The public registry returns only the whitelisted fields; the registry principal reads nothing else.
- **BR-15** Verification excerpts are the source of truth; spans are derived and re-verified; an extraction without a locator is invalid.
- **BR-16** Imported historical commentary is immutable and excluded from live surfaces and from every cross-subject read.

---

## 7. Non-functional requirements

**NFR-1 Security**
- 1.1 Defence in depth: role permissions, row-level read filters and server-side write guards are independent controls; none may be the sole control for any applicant-data entity.
- 1.2 Least privilege: the registry principal reads five entities; reviewers write three; the assistant holds no server capability; new users receive the default role only; no platform-wide developer role exists on production accounts.
- 1.3 **Every entity carrying applicant data shall be row-filtered** (applications, responses, documents, extractions, observations, reactions, messages, decisions, recommendations, objections, cycles, citations, claims, appeals, contacts) before external applicant identity is exposed.
- 1.4 Refusals are ambiguous between "not yours" and "not there"; file bytes are authorized before existence is disclosed.
- 1.5 Secrets are hashed and unrecoverable; API-key scopes are deny-by-default and audited; uploads are validated before any database call and parsed with maintained libraries.
- 1.6 Injection defence on every free-text value that reaches a query, in depth; submitted material is treated as evidence, never as instruction, by every prompt.

**NFR-2 Privacy**
- 2.1 Reviewer anonymity to applicants is structural: no path, no roster, role-neutral labels, read auditing on identity-bearing entities.
- 2.2 Change history is offered only for a frozen allowlist of entities (applications, decisions, standards, credentials) because a raw diff routes around row filters.
- 2.3 Comparable answers are anonymized before use and drawn only from confirmed answers of other subjects.
- 2.4 Restricted material can stay outside the system entirely.

**NFR-3 Defensibility and auditability**
- 3.1 Field-level change history on every credentialing entity; read auditing on reviewer-identity entities.
- 3.2 A complete provenance chain from any AI row to its model call; run records for every dispatch with caller, principal and entry point.
- 3.3 Every mode change, activation, signature and status change recorded with who, when and on what evidence.
- 3.4 Content hashes on every stored file; frozen submissions; append-only correspondence; immutable identifiers.

**NFR-4 Reliability**
- 4.1 Durable agent dispatch with boot-time drain; database-arbitrated deduplication; idempotent sweeps and wizards.
- 4.2 Notification fan-out is best-effort and never blocks or fails a committed write.
- 4.3 Retrieval never throws; it degrades with a typed reason recorded on the run.
- 4.4 Database and file storage are backed up as one unit.

**NFR-5 Performance and scale**
- 5.1 Sized for organizations holding tens of thousands of credentials, hundreds of concurrent applications, and programs of one hundred fifty or more standards; every independent read is batched, never issued inside a loop.
- 5.2 A full AI review of a one-hundred-twenty-standard application completes within minutes and never blocks any human screen.
- 5.3 Upload latency is bounded by OCR page and pixel caps; extraction beyond the cap reports truncation.

**NFR-6 Cost**
- 6.1 Per-run and per-application AI cost attribution, including cache pricing; unpriced runs reported as unpriced; configurable model routing profiles; caps on work per run read from configuration and surfaced on the run.

**NFR-7 Accessibility and interface quality**
- 7.1 WCAG AA text contrast in light and dark themes; state never encoded by hue alone; native dialogs with focus trap; every disabled control states its reason in visible text; empty states are live regions; touch targets of at least 44 pixels; desktop-first, usable at tablet width.
- 7.2 One design system: the platform's own chrome, components and tokens; no parallel stylesheet; dark theme is a release gate.

**NFR-8 Operability**
- 8.1 All behavior is metadata: agents, prompts, model routing, notification types, queries, scheduled jobs, permissions, filters, application definitions, ship as versioned metadata files and are synced, not hand-inserted.
- 8.2 Scheduled work: an hourly sweep (agreement statistics, committee windows, renewals, expiry) and a retrieval index sync, both skip-on-overlap with failure notifications.
- 8.3 Cloud file storage, outbound email and SMS are configuration changes plus credentials, with no schema or interface change.
- 8.4 Documentation of columns is generated from the schema's own descriptions.

**NFR-9 Testability**
- 9.1 Governance rules are pure ruling functions with unit tests independent of a database; every value set is stated once with a drift check against shipped artifacts; composed prompts have a drift gate; a live regression suite covers every surface, audience, theme and cross-organization negative probe; the evaluation gate is three-valued (clean, regression, could not run) and "could not run" never passes.

---

## 8. Platform composition

The product is composed from the MemberJunction platform and the BizApps family. The positions below are decisions, with the reason each was taken.

| Capability | Position | Reason |
|---|---|---|
| Party records (people, organizations, addresses, contact methods) | **BizApps Common** as the default subject party record; polymorphic subject reference retained | Credential data should join the member graph without ETL; deployments with their own party tables still need prefill from them |
| Work items: appeals, staff follow-ups, release-queue items, escalated objections | **BizApps Tasks**, mirrored into unified work queues | These are ordinary work with assignees and due dates; a reviewer or staff member should see them in one task list |
| Review assignments, observations, reactions, docket, decisions | **Owned by this product** | They carry provenance, calibration telemetry, lane rules and defensibility invariants that a generic task or decision record cannot express; the agreement statistics that govern automation are computed from them |
| Anonymous pre-application intake (eligibility pre-check, inquiry) | **BizApps Forms** with magic links, creating the subject and Draft application on pass | Forms already provides anonymous sessions, captcha, rate limiting and entity binding; the application itself is not a form |
| The application (standards runner) | **Owned by this product** | Per-standard states, provenance, citations, prefill, conversations and freeze semantics are the product |
| Rubric-scored and conversational assessments, oral examinations | **Caliber** as an assessment provider feeding Assessment standards | Assessment authoring, integrity and psychometric defensibility are Caliber's domain; standards review is evidence-grounded commentary, a different kernel |
| Committee rosters, terms, meetings, agenda items for escalated objections | **BizApps Committees** | The deciding body already exists there; the docket's passive window and sign-off stay here |
| Fees and payment records | **BizApps Orders** | Fee standards are satisfied by a payment record; the product never processes payment |
| Learning and in-platform CE | **LXP** as a verified claim source | Settled boundary: LXP owns learning; this product owns the credential |
| Lapse risk | **Sonar / Predictive Studio** | Signals out, risk in |
| Discipline | **BizApps Ethics** | Linked cases; suspension and revocation instructions |
| Identity, magic links, files, notifications, communication, scheduling, AI prompts and agent runs, search (full-text and vector), record changes, API keys, stored queries, dashboards | **MemberJunction core** | Configured, not rebuilt; the product adds only a domain, a local storage driver where none exists, and a deterministic agent orchestration that records runs in the platform's own tables |

---

## Appendix A — State machines

**Application**
```
Draft → Submitted → [Screening] → InReview ⇄ InfoRequested → Committee → [ExecSignOff] → Decided → Closed
Withdrawn ← any state before Decided
```
Bracketed stages are version toggles. Committee advances automatically at window close with no open objection and a drafted decision.

**Program version**: `Draft → Active → Retired`. Draft-only editing of tree and Draft-only settings; rollout flags editable on Active.

**Standard evaluation mode**: `HumanOnly → AIAssisted → AIAutomated` upward by evidence-gated promotion; downward always, one click. Interpretive standards: HumanOnly, locked.

**Standard response**: `Empty → Drafted | Prefilled | Located → Confirmed`, with `Flagged` while a discrepancy is open. Only a human confirms.

**Decision**: `Draft → [WithExecutive] → Signed`. Signing issues the credential.

**Credential**: `Active → Expired`; `Active → Suspended → Active`; `→ Revoked` (terminal).

**Cycle**: `Pending → Open → Closed`. Created at issuance; opened by the sweep exactly once.

**Response source**: `Proposed → Active → Retired → Proposed`. Only a human activates.

**Evidence document**: `Current → ConfirmCurrent | Restricted | Superseded`.

**Extraction / observation**: `Proposed → Accepted | Rejected` and `Open → Resolved`, each orthogonal to supersession.

**Activity claim**: `Claimed → Verified | Rejected`.

**Appeal**: `Filed → Under review → Upheld | Overturned`.

## Appendix B — Glossary

- **Accrediting organization**: the body that owns programs and issues credentials under them.
- **Subject**: the person or organization being credentialed.
- **Standard**: one requirement statement in a program version; programs may call these standards, criteria or requirements.
- **Lineage key**: the identity of a standard across versions.
- **Intake mode**: the friction dial per standard: Manual (the subject writes), Locate (the assistant points, the subject writes), Prefill (the assistant drafts, the subject confirms).
- **Evaluation mode**: the automation ladder per standard: HumanOnly, AIAssisted, AIAutomated.
- **Response source (binding)**: a ranked rule for drafting or verifying a standard's answer from instance data, prior answers, extractions, claims, assessment results or payments.
- **Observation**: one judgement about one standard on one application, by a person, an agent or the applicant.
- **Reaction**: a reviewer's agree, disagree or agree-with-changes on an agent finding; the calibration telemetry.
- **Replay floor**: agreement measured by re-scoring historical human review on the current prompt version.
- **Passive window**: the committee period in which no action means advancement.
- **Cycle**: a credential's renewal window.
- **Activity claim**: a subject's claim of a completed continuing activity toward a quantity standard.
- **Audit sample**: the subset of renewals selected for full evidence review under the version's rule.
- **Lane**: the audience of a message: Internal, WithApplicant, Private.
- **Channel**: who is notified of a message: Everyone, Staff, Reviewers, Committee.

## Appendix C — Notification catalogue

| Type | Trigger | Recipients | Lands on |
|---|---|---|---|
| Info requested | Staff pause pending information | Subject contacts | Applicant › My Applications |
| Decision issued | Decision signed or routed to executive | Subject contacts; staff | My Credentials; Staff › Decisions |
| Cycle opened | Sweep opens a renewal window | Subject contacts | Applicant › My Credentials |
| Renewal created | Sweep spawns a renewal | Staff | Staff › Pipeline |
| Audit selected | Renewal selected for audit | Subject contacts; staff | Standards; Pipeline |
| Review assigned | Assignment created | The reviewer | Review › Workspace |
| Reviewer mentioned | Internal @-mention | Those named | Review › Workspace |
| Applicant message posted | Applicant writes | Internal parties the channel names | Docket, Workspace or Pipeline by role |
| Message for applicant | Staff, reviewer (released) or agent writes to the shared lane | Subject contacts | My Applications |
| Message awaiting release | Reviewer writes for the applicant on a mediated program | Staff | Pipeline conversation |
| Agent run completed / failed | Orchestration ends | Staff | The application |
| Credential expiring | Configurable lead times | Subject contacts | My Credentials |
| Credential status changed | Suspension, revocation, reinstatement | Subject contacts; staff | My Credentials |
| Appeal filed / decided | Appeal lifecycle | Staff; subject contacts | Decisions; My Credentials |

No notification is ever sent to its author. Applicant-facing bodies name roles, never people.
