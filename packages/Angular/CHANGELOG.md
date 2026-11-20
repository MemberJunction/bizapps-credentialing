# @mj-biz-apps/credentialing-ng

## 1.0.0

### Major Changes

- c0071fa: Adopt OpenApp LTS release lines and cut the 6.2 release line (`lts/6.2`, MJ 6.2.1), moving bizapps-credentialing out of `0.x` to `1.0.0`.

### Minor Changes

- ba9e16a: Target MemberJunction 6.2; add BizApps Committees as a dependency; application access is granted explicitly.
- dc773af: Add AccreditingOrganization, OrganizationMembership, Program, ProgramVersion, Section, Standard, and DocumentRequirement schema, generated entities, resolvers, forms, and entity-name constants.
- da1cc5d: Grant the credentialing roles access to the Credentialing application, isolate staff to the accrediting organizations they are a member of with row-level security filters on every program entity and on BizApps Committees committees, give the administrator unfiltered organization and membership management, and give all five roles a filtered Explorer shell baseline so none of them needs the UI role.
- 0e80979: Add the five credentialing roles (Credentialing Admin, Staff, Committee, Reviewer and Applicant) and
  four server-side operations that each write several records as one unit of work: create a program with
  its first draft version, copy an active or retired version into a new draft, reorder a version's
  sections and standards, and set up an accrediting organization with its first staff member. A version
  label that is blank once trimmed is now refused.
- e4c6eb3: Isolate applicant data by subject: contacts read only their own subject's records and staff only their organization's subjects'. Applicant records are changed only through the application's own actions; direct saves are refused. Response sources are edited by staff on draft versions only.
- acc425c: Add Subject, SubjectContact, Application, StandardResponse, ResponseCitation, EvidenceDocument, DocumentAttestation, ApplicationDocument, Extraction, and ResponseSource schema, generated entities, resolvers, forms, and entity-name constants.

### Patch Changes

- e79b471: MemberJunction and other BizApps packages are peer dependencies with caret ranges (nothing in `dependencies`), so a host keeps one copy of each. `credentialing-core`'s `common-entities` and `tasks-entities` moved from `dependencies` to `peerDependencies`; every such peer has an exact `devDependencies` anchor for local builds. Adds `check-dependency-model` to CI.
- Updated dependencies [ba9e16a]
- Updated dependencies [dc773af]
- Updated dependencies [da1cc5d]
- Updated dependencies [0e80979]
- Updated dependencies [e4c6eb3]
- Updated dependencies [acc425c]
- Updated dependencies [e79b471]
- Updated dependencies [c0071fa]
  - @mj-biz-apps/credentialing-core@1.0.0
  - @mj-biz-apps/credentialing-entities@1.0.0
