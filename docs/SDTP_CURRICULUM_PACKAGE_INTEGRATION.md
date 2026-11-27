# SDTP curriculum packages in the Cognitive Engineering Platform

The Cognitive Engineering Platform (PDE) is a presentation and authoring runtime for SDTP curriculum packages. It must not become the source of truth for individual curricula.

The first reference package is WJEC GCE A level Digital Technology Unit 4: Digital Solutions. The canonical package lives in [lampforge-sdtp-scaffold](https://github.com/andiekobbietks/lampforge-sdtp-scaffold/tree/feat/wjec-unit4-curriculum-package/curricula/wjec-gce-digital-technology/unit-4-digital-solutions/1.0.0). The compiler implementation is being established separately in [lampforge-core-compiler PR #1](https://github.com/andiekobbietks/lampforge-core-compiler/pull/1).

## Runtime/editor contract

- Monaco/Code-OSS edits package source; it does not define grammar semantics.
- Monarch provides syntax colouring only.
- The SDTP compiler owns parsing, structural validation, reference resolution, policy checks and dependency ordering.
- The compiled `sdtp.plan/v1` is the single source for the React Flow DAG, learning sequence, provider plan and verification state.
- Provider planning is preview-only until a teacher/operator explicitly approves apply.
- Provider results, verifier outputs and evidence metadata are displayed as read-only runtime state.
- The existing `ForgeBlueprintSchema` remains an application architecture model. It must not be treated as the curriculum-package schema.

## Compiler contract

The compiler PR introduces:
1. `parseCurriculumPackage(source)` for YAML parsing and validation of `sdtp.dev/v1`.
2. Cross-reference validation for outcome, pattern and dependency identifiers.
3. Stable topological ordering with cycle rejection.
4. `compileCurriculum(source)` to produce a deterministic `sdtp.plan/v1`, including SHA-256 package and plan digests.
5. `applyPlan(plan, provider, approved)`, which rejects apply unless explicit approval is true.
6. `verifyApplied(plan, artifacts)` to validate provider output and digest continuity.

## Provider parity

The package is provider-neutral. The current adapter implementation targets:
- `docker_compose`: generates the PHP/Apache and MySQL development runtime.
- `github_codespaces`: emits a Dev Container configuration which selects the same generated Compose `web` service and shares the same Dockerfile and Compose definition.

Both adapters retain the exact same `packageDigest` and `planDigest`. The Codespaces adapter prepares a repository for opening in Codespaces; it does not itself create a hosted Codespace through GitHub's API. Credentials remain external environment secrets and are never placed in curriculum YAML or evidence.

## PDE integration stages

1. Load the versioned package source and preserve its original text.
2. Call the shared compiler; map parser/schema errors to Monaco markers with source ranges.
3. Keep the parsed package and compiled plan in one shared state store.
4. Derive React Flow nodes and edges from `plan.steps` and `dependsOn`; never maintain a separately editable DAG.
5. Render outcome, activity, evidence and environment panels from that same plan.
6. Display deterministic provider plan and generated artifact preview.
7. Require explicit approval before apply.
8. Display verification results and export evidence with package digest, plan digest and artifact hashes.

## Required editor behaviour

The PDE must preserve unknown extension fields when round-tripping a package, reject unsupported major API versions and never silently drop policy constraints. A syntax highlighter must not be presented as validation. Monaco markers should use parser source ranges. The DAG must be a projection of the compiled plan; edits to YAML trigger recompilation and replace the projection atomically.

## Assessment boundary

The PDE supports teaching, practice, environment provision and process evidence. It must not generate candidate NEA submissions, award marks, predict grades or replace teacher authentication, WJEC moderation or current JCQ requirements. Teach reusable patterns on generic examples; learners independently apply them to their own approved project.

## Current implementation status

- [x] Versioned WJEC Unit 4 curriculum manifest and Python structural validator in the scaffold repository.
- [x] First TypeScript compiler implementation, deterministic plan, approval-gated artifact apply, verifier and Docker Compose/Codespaces adapters proposed in compiler PR #1.
- [ ] Merge and CI-validate the compiler PR.
- [ ] Wire the compiler into the PDE through a versioned package or authenticated compiler service.
- [ ] Add source-range diagnostics to Monaco.
- [ ] Synchronise React Flow nodes/edges from the same compiled plan.
- [ ] Connect provider apply/verify and evidence export to PDE state.
- [ ] Run end-to-end parity tests proving both providers preserve the exact package digest.

The PDE's current Monaco wrapper and Code-OSS bridge are editing surfaces only. They do not yet execute the compiler or share a curriculum DAG.
