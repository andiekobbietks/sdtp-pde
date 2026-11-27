# SDTP curriculum packages in the Cognitive Engineering Platform

The Cognitive Engineering Platform (PDE) is a presentation and authoring runtime for SDTP curriculum packages. It must not become the source of truth for individual curricula.

The first reference package is WJEC GCE A level Digital Technology Unit 4: Digital Solutions. The canonical package and validator live in [lampforge-sdtp-scaffold](https://github.com/andiekobbietks/lampforge-sdtp-scaffold/tree/feat/wjec-unit4-curriculum-package/curricula/wjec-gce-digital-technology/unit-4-digital-solutions/1.0.0).

## Runtime/editor contract

- Monaco/Code-OSS edits the package source; it does not define the grammar semantics.
- Monarch provides syntax colouring only.
- A shared SDTP package parser/validator is authoritative for structural diagnostics, references, policy and dependency cycles.
- The parsed package is the single model for editor text, the React Flow/DAG view, learning sequence and provisioning plan.
- Provider planning is preview-only until a teacher/operator explicitly approves apply.
- Provider results, verifier outputs and evidence metadata are displayed as read-only runtime state.

## Integration stages

1. Load package metadata and schema version.
2. Parse YAML and validate against the SDTP package contract.
3. Publish diagnostics to Monaco markers with source ranges.
4. Build the sequence DAG from declared step IDs and dependencies.
5. Render outcome, activity, evidence and environment panels from that same parsed object.
6. Request a deterministic plan from the SDTP kernel/provider adapter.
7. Require explicit approval before provisioning.
8. Show verifier results and export an evidence index containing package digest and artifact hashes.

## Required editor behaviour

The PDE must preserve unknown extension fields when round-tripping a package, reject unsupported major API versions, and never silently drop a policy constraint. A syntax highlighter must not be presented as validation. A local client-side schema check may improve responsiveness, but the kernel remains authoritative before planning or apply.

## Assessment boundary

The PDE supports teaching, practice, environment provision and process evidence. It must not generate candidate NEA submissions, award marks, predict grades or replace teacher authentication, WJEC moderation or current JCQ requirements. Teach reusable patterns on generic examples; learners independently apply them to their own approved project.

## Current implementation status

This document specifies the integration contract. The existing PDE Monaco wrapper and Code-OSS bridge are editing surfaces; this document does not claim that the shared SDTP parser, Monaco diagnostics, plan/apply bridge or evidence export have already been implemented in the PDE. Those require a separate code integration and end-to-end tests.
