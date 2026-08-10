# Policy Reasoning for a Standalone Customer Review Spring Boot Service

## 1. Executive Summary

### 1.1 Audience and intended outcome

This document is the production plan for a **new standalone Spring Boot customer review service** that realizes the designs demonstrated by the illustrative POC in this repository. It is self-contained: no knowledge of the exploratory prototype that informed it is required.

The service lets policy owners author, validate, compare, approve, publish, and execute customer-review policies with traceable results. Because the service is standalone, it must also own the concerns an established host service would otherwise have provided: the review workflow and its states, the customer-facts integration (CIS APIs in production), persistence, audit records, and operational conventions. Where this guide describes "current behavior" to protect, read it as the behavior of this service once each phase ships; the POC's deterministic semantics and fixtures are the initial behavioral baseline.

The central trust boundary is:

> An LLM may propose a policy. Deterministic systems validate, analyze, and execute it. Authorized people decide whether the policy becomes active.

An LLM must never validate its own output, resolve policy conflicts, approve a policy, publish a release, or make a final customer-review decision. The review service remains the system of record and workflow authority.

### 1.2 Reference policy examples

The examples below provide a concrete bounded credit-policy domain for the behavior referenced throughout this guide:

- Global policy: average days to pay (`adp_days`) must be **less than 30 days**.
- Global policy: `past_due_amount` must be no more than **10% of `ar_balance`**.
- Candidate: for `NET_30` customers, allow only 5% past due. This is a compatible refinement because it is stricter than the global 10% maximum.
- Candidate: for `NET_30` customers, allow 15% past due. This conflicts with the global 10% maximum.
- Candidate: for unrestricted customers with balance above USD 100,000, allow up to 45 days to pay. This conflicts with the global exclusive 30-day maximum; a customer with 35 days to pay is a concrete conflict witness.

The production service does not need to use these field names. Map the authoritative customer facts supplied by CIS APIs and the business's policy concepts to the canonical policy model described below. Start only with facts already governed and available at review time.

### 1.3 Proposed production capabilities

| Concern | Proposed capability | Runtime role |
| --- | --- | --- |
| Policy vocabulary | Versioned RDF/OWL vocabulary | Defines supported customer facts and policy concepts |
| Structural/domain validation | Apache Jena with SHACL | Validates properties, types, enums, units, and allowed relationships before approval |
| Shared policy representation | Canonical typed Java policy model | Prevents Jena, DMN, and Z3 from interpreting separate translations |
| Executable decisions | Versioned DMN with a Drools/KIE or compatible Kogito runtime | Evaluates approved policy releases during customer review |
| Conflict analysis | Z3 satisfiability solver | Compares candidate policies with the active set before publication |
| Assisted authoring | Governed LLM gateway | Creates drafts only; it is not on the review execution path |
| Governance | Policy lifecycle enforcement with recorded (unauthenticated) actors | Provides review, approval, publication, rollback, and auditability; identity verification is out of scope for this app (Section 9) |
| Release qualification | Versioned regression corpus and baseline/candidate batch harness | Measures complete-release impact with the same evaluator and blocks errors, indeterminate results, or approved threshold breaches |
| Recommendation synthesis | Separately versioned decision model and advisory calculators | Combines rule findings only after evaluation; the review application layer retains final workflow and mutation authority |

This is not a proposal to build a general-purpose reasoner or allow arbitrary natural language to become executable.

**Recommended default:** build one standalone Spring Boot application with a hard internal seam between the control plane (authoring, validation, conflict analysis, governance, publication) and the decision runtime (review workflow, customer-facts adapter, `PolicyDecisionPort`, release pinning, embedded DMN runtime). Model rule evaluation, recommendation synthesis, and advisory calculations as separate typed decisions within the same pinned release so findings remain independently traceable. Keep Jena/SHACL, Z3, candidate batch qualification, and the optional LLM on the authoring path; extract the control plane into a companion Spring Boot deployment later only if its dependencies, ownership, scaling, or security profile no longer belong in the customer-review runtime. Adopt each capability through disabled, shadow, advisory, and bounded-enforcement modes.

### 1.4 Terms used in this guide

| Term | Meaning in this design |
| --- | --- |
| **Canonical policy model / IR** | The versioned, typed representation from which validation, DMN, and solver artifacts are generated. IR means intermediate representation. |
| **Ontology** | A versioned vocabulary describing customer facts and policy concepts, including datatypes, units, and allowed values. |
| **SHACL** | W3C rules used by Jena to validate RDF data against the ontology's expected shape. |
| **DMN** | Decision Model and Notation; the standardized executable decision artifact loaded by the review-time runtime. |
| **SMT / Z3** | Satisfiability Modulo Theories and the Z3 solver used to determine whether policy constraints can overlap or contradict one another. |
| **Control plane** | Policy authoring, validation, conflict analysis, approval, publication, and rollback. It is not the customer transaction path. |
| **Decision runtime** | The low-latency component that evaluates customer facts using an approved, pinned policy release. |
| **Policy release** | An immutable, checksummed bundle containing exact policy revisions, generated artifacts, versions, and approval metadata. |

### 1.5 Confirmed platform decisions (maintainer, August 2026)

These decisions are settled and supersede any conflicting default elsewhere in this guide:

| Decision | Confirmed choice |
| --- | --- |
| Application shape | New standalone Spring Boot application; not an integration into an existing service |
| Database | MySQL 8 (InnoDB, `utf8mb4`) |
| Persistence access | JPA/Hibernate |
| Schema management | No DDL migration tool (no Flyway/Liquibase); see Section 8.1 |
| Security | No Spring Security and no other in-app authentication or authorization; see Section 9 |
| Language/runtime | Java 21 LTS, current Spring Boot 3.x, pinned via dependency locking |
| DMN runtime | Embedded KIE/Drools behind a `DecisionRuntime` interface (Kogito only if a spike proves it fits better) |
| Z3 placement | Isolated internal worker process/container behind the `ConflictSolver` port |
| LLM usage | Provider-neutral `ProposalTranslator` port; strict structured drafts and explanations only |

## 2. Define the Service Baseline First

### 2.1 Baseline discovery checklist

The service is new, so discovery targets the business process and data sources it will automate, plus the POC that specifies its intended behavior. Before selecting dependencies or writing code, answer these questions with the business owners, CIS integration owners, and the POC maintainer:

1. **Review entry points:** Which API calls, jobs, or UI actions should create and update a customer review in the new service?
2. **Authoritative facts:** Which CIS API fields are available at decision time, who owns them, how fresh are they, and how are missing values handled?
3. **Current decision logic:** Which policies are applied today (manually or in other systems), and what do the POC's deterministic rules ([src/core/runtime.js](src/core/runtime.js), [src/domains/credit/pack.js](src/domains/credit/pack.js)) specify as the intended semantics?
4. **Decision authority:** Should automation approve/reject a review, produce findings for a human, or both? Which behavior is regulated or contractually fixed?
5. **Workflow:** What review states, transition rules, escalation paths, and retry/idempotency behavior must the new service implement?
6. **Data contracts:** Which consumers will depend on the new service's APIs, events, and reason codes, and what compatibility promise do they get?
7. **Operating environment:** Where does the service run, who can reach it, and what network boundary compensates for the absence of in-app security (Section 9)?
8. **Persistence and messaging:** What MySQL instance, backup, retention, and (if any) broker/outbox infrastructure will the service use?
9. **Runtime constraints:** Which latency/throughput objectives and availability targets apply to the review path?
10. **Operations:** How will releases, feature flags, observability, rollback, backup/restore, and incident response be handled?

The expected output is a one-page context diagram, a customer-fact dictionary, current policy examples, an API/event inventory, and a list of constraints. Use those artifacts to replace the illustrative names and choices in this guide.

### 2.2 Components the standalone service must own

An established host service would have supplied these concerns; the standalone service must provide them itself:

| Concern | What the standalone service provides |
| --- | --- |
| Customer/review domain entities | A review aggregate owned by this service, with an anti-corruption mapper to a small `PolicyEvaluationContext`; do not expose JPA entities to policy engines. |
| Customer facts | A CIS-facing facts adapter that materializes the fact dictionary (Tier-1 Review Context) at review time. |
| Review application service | The orchestration layer that invokes `PolicyDecisionPort` at its decision point and owns all review-state transitions. |
| Review statuses and transitions | Explicit review workflow states defined in Phase 0; policy findings map into them only after business approval. |
| Database schema | Additive JPA-mapped tables in MySQL 8 under this service's ownership (Section 8.1). |
| Audit records | An append-only policy/review audit store built into the service (Section 8.3). |
| Actor identity | Recorded actor identifiers on governance actions, supplied by callers and stored unverified; no in-app authentication (Section 9). |
| Events/outbox | In-process application events by default; add an outbox and broker only when a distributed consumer exists. |
| API conventions | URL, error, pagination, concurrency, and idempotency conventions defined once in Phase 1 and followed thereafter. |
| Deployment and feature flags | Server-controlled configuration that ships policy evaluation disabled, then shadow, then advisory, then enforced, with an immediate rollback path. |

The POC's module boundaries (`src/core`, `src/domains/credit`, `server/`) are the design evidence for these seams; its fixtures and reference scenarios seed the behavioral baseline.

### 2.3 Choose the deployment topology deliberately

| Topology | Use when | Trade-off |
| --- | --- | --- |
| **One standalone Spring Boot application containing both planes** (confirmed starting point) | One team owns authoring and review; release cadence, scaling, and data boundaries are shared | Simplest transactions and operations; native solver dependencies still require isolation |
| **Policy control-plane companion service; DMN runtime embedded in the review service** | Authoring/governance scales or releases independently, while review evaluation needs low latency and high availability | Requires reliable release distribution |
| **Separate control plane and decision service** | Organizational ownership, security boundaries, or independent runtime scaling require separate deployables | Adds network failure modes, version coordination, and operational overhead |

Start with the single application and keep Java interfaces and artifact contracts stable so a module can be extracted later. Z3 should normally be isolated because it uses native code and requires strict resource limits; an in-process binding is acceptable only for a time-boxed compatibility spike.

### 2.4 Define the review-time integration contract

The policy subsystem should receive only the facts needed for policy evaluation and return a stable, explainable result. Adapt these names and fields to the service's confirmed fact dictionary:

```java
public record PolicyEvaluationRequest(
    String reviewId,
    String reviewVersion,
    String customerReference,
    String policyDomain,
    Map<String, PolicyValue> facts,
    String releaseId
) {}

public record PolicyEvaluationResult(
    String releaseId,
    String decisionId,
    PolicyOutcome outcome,
    List<PolicyFinding> findings,
    Instant evaluatedAt
) {}

public interface PolicyDecisionPort {
    PolicyEvaluationResult evaluate(PolicyEvaluationRequest request);
}
```

Prefer a typed fact object over a map once the first policy vocabulary is stable. The request must not contain persistence entities, lazy-loaded relationships, credentials, or facts that the policy is not allowed to use.

`PolicyOutcome` should reflect policy evaluation, not silently redefine the review workflow. For example, `REFER`, `POLICY_PASS`, or `POLICY_FAIL` may become a review finding, but only the review application service should perform the corresponding review-state transition. Each saved review outcome must include the policy release and decision identifiers needed for replay.

Resolve the active policy release once for a review evaluation and pass its ID explicitly. An idempotent retry for the same review version must use the same release and facts. Re-evaluation under a newer release should be an explicit command that creates a new result linked to the prior evaluation; it must not rewrite the original result.

### 2.5 Safe adoption sequence inside the review workflow

1. **Disabled:** deploy modules and schema additions without invoking policy evaluation.
2. **Shadow:** evaluate asynchronously or alongside current logic, persist comparisons, and do not affect responses or workflow.
3. **Advisory:** show policy findings to authorized reviewers, but keep the current decision authoritative.
4. **Enforced for a bounded cohort:** allow the policy result to influence approved transitions for selected policy types, tenants, or traffic.
5. **Expanded:** migrate additional policies only after reconciliation and rollback criteria pass.

Feature flags must be server-controlled and audited. Define mismatch thresholds, stop conditions, and rollback ownership before moving between modes.

## 3. Mandatory Protocol for an AI Implementation Agent

This section is intentionally explicit. An implementation agent must treat it as a set of execution constraints, not optional guidance. Complete one approved phase or work unit at a time. Do not turn this roadmap into a single large implementation task.

Because the service is greenfield, read "current behavior" as follows: before Phase 1 exists, the baseline is the approved fact dictionary, the POC's deterministic semantics, and the Phase 0 fixture corpus. From Phase 1 onward, the baseline is the standalone service's own shipped behavior, and every gate below applies to it literally.

### 3.1 Instruction and evidence precedence

When sources disagree, use this order:

1. The maintainer's current, explicit task and approved decisions.
2. Repository guidance files and team standards that govern the files being changed.
3. The approved integration brief, architecture decision records, fact dictionary, and policy fixtures.
4. Existing public API/event contracts, database constraints, characterization tests, and documented production behavior.
5. The defaults in this document.
6. The exploration described in Section 16, which is evidence only and is never a production contract.

Do not silently choose between conflicting sources. Record the conflict with exact file, symbol, test, or decision references and ask the maintainer which source should win.

### 3.2 No-guess rules

The agent must not:

- infer that similarly named fields have the same business meaning; for example, do not map `balance` to `ar_balance` without confirmed semantics, units, and null behavior;
- choose a review decision point merely because a class is named `ReviewService`, `DecisionService`, or `RuleEngine`; trace callers, transactions, side effects, and tests;
- invent mappings from policy outcomes to review statuses, reason codes, API responses, or events;
- choose Java, Spring Boot, Jena, Drools/KIE, Kogito, Z3, database, or LLM versions without checking the existing build and completing the required compatibility decision;
- create a new service, database, schema, message topic, outbox, identity role, public endpoint, or deployment unit when an existing mechanism may serve the need;
- invent fail-open, fail-closed, retry, timeout, tenancy, authorization, retention, or data-redaction behavior;
- send customer records, review payloads, production logs, or personal data to an LLM or Z3;
- copy the illustrative package names, APIs, records, statuses, table names, or pseudocode in this document without adapting them to confirmed repository conventions;
- remove, bypass, or change the current evaluator before shadow comparison and the Phase 6 enforcement gate;
- introduce Jena, Z3, or an LLM call on the customer review transaction path;
- implement the LLM phase before deterministic policy validation, DMN compilation/execution, conflict analysis, and approval controls exist;
- perform unrelated refactoring, dependency upgrades, schema cleanup, or naming changes while adding a policy seam;
- weaken tests, suppress failures, hard-code fixture-specific behavior, or change expected current outcomes merely to make a new adapter pass.

An unknown value is not permission to select a convenient default. Continue read-only discovery where useful, mark the item `UNRESOLVED`, and use the stop conditions in Section 3.9.

### 3.3 Required implementation input sheet

Before production code is changed, the agent must populate this sheet with evidence. Evidence means a repository path and symbol/test/configuration name, an approved architecture decision, or a named maintainer decision. A guess such as "probably handled elsewhere" is not evidence.

For each row, record one status: `VERIFIED_FROM_REPOSITORY`, `APPROVED_BY_OWNER`, or `UNRESOLVED`. Include the evidence or owner next to the status. A required row must not be blank, and `UNRESOLVED` rows block the work named in the third column.

| Required input | Evidence to record | Must be resolved before |
| --- | --- | --- |
| Governing repository instructions | Paths to guidance files and relevant rules | Any edit |
| Build and test entry points | Wrapper/build files, module, focused test command, broader check | Any edit |
| Runtime versions | Java, Spring Boot, dependency-management/BOM, container constraints | Dependency spike |
| Review entry points | Controller/listener/job symbols and request/event types | Integration seam |
| Review orchestration owner | Exact application-service method and transaction boundary | Integration seam |
| Current decision implementation | Exact evaluator/rules/manual handoff and its callers | Characterization tests |
| Current side effects | State transitions, writes, events, notifications, downstream calls | Shadow wiring |
| Authoritative customer facts | Source symbol, canonical meaning, type, unit, null behavior, freshness, sensitivity | Fact adapter |
| Existing policy inventory | Policy source, owner, precedence, effective dates, expected outcomes | Canonical migration |
| Review state and outcome semantics | Current statuses, reason codes, transition owner, approval authority | Advisory/enforcement |
| Runtime failure behavior | Approved behavior for timeout, missing release, invalid release, and evaluator failure | Runtime adapter |
| Public contracts | API schemas, event schemas, consumers, compatibility requirements | Any externally visible change |
| Persistence conventions | MySQL schema ownership, DDL review procedure (Section 8.1), IDs, audit fields | Schema change |
| Deployment boundary | Confirmed network/perimeter controls compensating for no in-app security | Administration API |
| Audit and messaging | Current audit store, outbox/event pattern, retention | Publication workflow |
| Feature flags | Existing framework, ownership, default, kill-switch procedure | Shadow deployment |
| Service objectives | Current latency, throughput, availability, timeout, and resource budgets | Runtime selection |
| Integration topology | Embedded modules, companion control plane, or remote runtime, with approved rationale | Engine implementation |
| First migration cohort | Named policy types, tenants/users, traffic boundary, success and stop criteria | Pilot |

The agent may discover technical entries from the repository. Business semantics, policy precedence, enforcement authority, and failure behavior require confirmation from the relevant owner when they are not already documented.

### 3.4 Gate A — read-only discovery before implementation

The first agent task must be read-only unless the maintainer has already supplied an approved, current integration brief containing all items above.

Perform these steps in order:

1. Inspect repository status and note pre-existing changes. Do not revert, reformat, or include unrelated work.
2. Read governing guidance and identify the exact build module containing customer review orchestration.
3. Read the build files and record Java, Spring Boot, dependency-management, test, schema-management, feature-flag, and observability conventions.
4. Trace each review entry point to the application-service method that owns the transaction and state transition.
5. Trace current decision logic and all of its side effects. Identify whether a retry repeats writes or emits duplicate events.
6. Trace every proposed customer fact to its authoritative source and existing tests. Exclude facts with unresolved semantics.
7. Locate current audit, outbox, API error, idempotency, and correlation-ID patterns, and confirm the deployment boundary that stands in for in-app security.
8. Locate characterization, integration, contract, and migration tests that protect current behavior.
9. Fill the implementation input sheet with exact evidence and list all unresolved items.
10. Propose one integration seam and explain why it is safer than the alternatives found.

The Gate A output must use this form:

```text
Review entry point(s): <path + symbol>
Orchestration/transaction owner: <path + symbol>
Current decision logic: <path + symbol>
Current side effects: <writes/events/calls + evidence>
Authoritative fact sources: <fact -> path + symbol + semantics>
Existing extension patterns: <audit/outbox/flags + evidence>
Current tests: <path + test names + commands>
Recommended seam: <path + symbol + reason>
Alternatives rejected: <option + evidence-based reason>
Unresolved items: <question + required owner>
Proposed first code work unit: <smallest behavior-preserving change>
```

Do not proceed past Gate A until the maintainer confirms the review decision point, authoritative fact mapping, current behavior to preserve, and runtime failure behavior.

### 3.5 Gate B — characterize current behavior

Before adding an engine or changing review orchestration:

1. Add or identify tests for the current evaluator's representative pass, fail, refer/manual-review, boundary, missing-data, retry, and error cases.
2. Assert current persisted state, reason codes, response fields, emitted events, and downstream calls—not only a returned enum.
3. Convert approved current policies and sanitized historical cases into engine-neutral fixtures.
4. Label each expected result as `CURRENT_BEHAVIOR`, `APPROVED_CORRECTION`, or `NEW_CAPABILITY`.
5. Run the focused suite and the narrowest module-level suite that can detect side-effect regressions.

If current behavior cannot be characterized, stop after adding non-invasive observations or tests. Do not replace it with behavior inferred from this document.

### 3.6 Gate C — add only a disabled integration seam

The first production-code work unit should normally contain only:

- `PolicyDecisionPort` or the repository's equivalent application boundary;
- a customer-facts adapter containing only confirmed facts;
- a no-op or current-behavior adapter;
- the existing feature-flag integration with default mode `DISABLED`;
- enough telemetry to prove whether the seam was invoked;
- tests proving that disabled mode produces contract-equivalent responses and equivalent persistence/business-event side effects, with exact serialization comparison where the existing contract requires it.

Do not add Jena, a DMN engine, Z3, an LLM SDK, new policy administration APIs, or enforcement in this work unit. If the repository's architecture makes even this seam invasive, stop and propose a smaller seam.

### 3.7 Required mode behavior

Implement these semantics using the service's conventions. Do not copy names literally if the service already has equivalent modes:

```text
DISABLED
  Do not resolve a policy release.
  Do not invoke a policy engine.
  Execute and return current behavior unchanged.

SHADOW
  Execute current behavior as the authority.
  Evaluate the pinned policy release without changing the existing customer-review
  response, state, business events, notifications, or downstream calls.
  Record a comparison and metrics without sensitive facts.
  On policy failure or timeout, record the failure and return current behavior.

ADVISORY
  Keep current behavior authoritative.
  Expose policy findings only through an approved backward-compatible field,
  internal reviewer view, or audit record.
  Do not transition review state from a policy result.

ENFORCED
  Use policy findings only for the approved cohort and explicit outcome mapping.
  Pin the release and preserve it across idempotent retries.
  Apply the documented runtime fallback on engine/release failure.
  Persist decision ID, release ID, reasons, mode, and evaluation timestamp.
```

Never catch broad exceptions and silently continue in advisory or enforced mode. Use the service's error taxonomy, record the failure safely, and apply only the approved fallback. Shadow mode may protect current behavior from policy errors, but those errors must remain observable.

### 3.8 Phase order and prohibited shortcuts

An agent must follow this dependency order:

```text
Phase 0 discovery/semantics
        │
        ▼
Phase 1 disabled + shadow seam
        │
        ▼
Phase 2 Jena/SHACL authoring validation
        │
        ▼
Phase 3 DMN compilation + shadow execution
        │
        ▼
Phase 4 Z3 pre-publication conflict analysis
        │
        ├─────────────▶ Phase 5 optional LLM draft assistance
        │
        ▼
Phase 6 advisory, bounded enforcement, rollout
```

| Phase | Allowed outcome | Must not happen in this phase |
| --- | --- | --- |
| 0 | Evidence, fixtures, decisions, threat model | Production behavior or dependency changes |
| 1 | Disabled/shadow seam and governance skeleton | New engine authority or review-state changes |
| 2 | Authoring-time ontology/SHACL validation | Per-review RDF conversion or SHACL calls |
| 3 | Approved DMN artifacts evaluated in shadow/advisory mode | Enforcement before reconciliation and conflict controls |
| 4 | Bounded conflict classifications and synthetic witnesses before publication | Z3 calls with customer records or on the review path |
| 5 | LLM-created structured drafts | Model approval, validation authority, executable artifacts, or customer data |
| 6 | Approved bounded enforcement and staged expansion | Unflagged all-tenant cutover or removal of rollback |

Phases 0 through 4 and their exit gates are mandatory before policy enforcement. Phase 5 is optional and may be omitted indefinitely. A maintainer may authorize parallel technical spikes, but an agent must not merge later-phase production wiring before earlier gates are approved.

### 3.9 Stop conditions: ask instead of guessing

| Situation | Required agent action |
| --- | --- |
| More than one plausible review decision point | Present the call paths and side effects; ask which is authoritative |
| A fact has unclear meaning, unit, null behavior, freshness, or ownership | Exclude it from the adapter and ask the fact owner |
| Current outcome-to-state mapping is undocumented | Characterize it from tests/code and request business confirmation |
| Runtime fallback is undocumented | Do not implement advisory/enforced mode; ask risk/business owners |
| Required engine conflicts with Java/Spring/BOM/container constraints | Report the exact conflict and spike alternatives; do not upgrade the platform |
| No test protects current behavior | Add characterization tests only; do not change behavior in the same work unit |
| A migration would rename/drop/rewrite existing data | Stop and request a separately reviewed migration/backfill plan |
| A new public field, endpoint, event, reason code, role, or topic appears necessary | Show why existing mechanisms are insufficient and request contract approval |
| The confirmed deployment boundary for the unsecured app is undocumented | Do not expose the administration or decision operation beyond local/dev environments |
| Customer or personal data would reach an LLM, Z3, logs, metrics, or fixtures | Stop and redesign around metadata, structured policy constraints, synthetic witnesses, or redacted fixtures |
| Existing tests fail before the change | Record the baseline failure and do not claim it was caused or fixed by this work without evidence |
| Unrelated worktree changes overlap target files | Preserve them, narrow the edit, and ask only if safe separation is impossible |
| The requested task spans multiple roadmap phases | Split it into phase-scoped work units and request approval for the first one |

### 3.10 Verification required for every work unit

Run the narrowest checks that prove the intended behavior, then the relevant module-level checks. At minimum, add or preserve coverage for the modes or components touched:

- `DISABLED`: policy resolver/engine is not called; current responses, writes, transitions, reason codes, and events remain unchanged;
- `SHADOW`: current behavior remains authoritative even when policy evaluation conflicts, times out, or fails; comparison and safe telemetry are recorded;
- `ADVISORY`: findings are visible only to approved consumers and cannot transition review state;
- `ENFORCED`: cohort filtering, explicit outcome mapping, release pinning, idempotent retry, fallback, kill switch, and rollback are tested;
- fact mapping: units, decimals, enums, nulls, and stale data are tested;
- governance: invalid lifecycle transitions, stale revision approval, missing actor identifiers, and procedural separation-of-duties checks (recorded actors, not authenticated identities) are rejected;
- releases: checksum/signature failure, compile/load failure, atomic activation, last-valid-release retention, and rollback are tested;
- engine adapters: reference fixtures, current-policy fixtures, boundaries, unsupported constructs, timeouts, and deterministic replay are tested;
- persistence/API/events: migrations, optimistic locking, idempotency, compatibility, audit linkage, and sensitive-data handling are tested.

Do not claim a check passed unless it was run. Do not suppress a failing check to obtain a green build. If a broader check cannot run, state the exact reason and the remaining risk.

### 3.11 Required agent handoff format

Every implementation or investigation handoff must contain:

```text
Roadmap phase and work unit:
Intended behavior:
Explicit non-goals:
Evidence used (paths/symbols/tests/decisions):
Approved decisions relied on:
Files changed:
Behavior preserved:
Behavior intentionally changed:
Feature-flag/default-mode impact:
Database/API/event/security impact:
Verification run and result:
Unresolved items and owners:
Rollback or disable procedure:
Next gate; do not start yet:
```

The agent must not commit, push, deploy, enable a feature flag, publish a policy release, migrate production data, or invoke shared infrastructure unless the maintainer explicitly requests that action.

### 3.12 Maintainer task packet for each agent run

Do not ask an agent to "implement this roadmap" or "integrate the policy system." Give it one gate or one work unit. Every agent task should use this packet:

```text
Roadmap phase:
Gate/work unit:
Goal and reason:
Approved integration-brief/ADR references:
Exact existing entry point or symbols, if approved:
Behavior that must remain unchanged:
Behavior allowed to change:
In-scope files/modules:
Explicit non-goals:
Feature-flag mode and required default:
Database/API/event/security constraints:
Focused verification command(s):
Broader verification command(s):
Required handoff format: NEXT_STEPS.md Section 3.11
Stop condition: Do not begin the next gate or phase.
```

If required fields are unknown, assign Gate A read-only discovery instead of a coding task. A safe first task is:

```text
Perform only NEXT_STEPS.md Gate A for the standalone customer review service.
Do not edit files, add dependencies, create design artifacts, or implement code.
Populate the Section 3.3 input sheet from repository evidence.
Return the exact Gate A output from Section 3.4, including unresolved questions.
Stop after recommending the smallest behavior-preserving integration seam.
```

A safe first coding task, after Gate A and Gate B approval, is:

```text
Implement only NEXT_STEPS.md Gate C at the approved review decision point.
Add the service's PolicyDecisionPort, confirmed fact mapping,
a no-op/current-behavior adapter, and a server-side flag defaulted to DISABLED.
Do not add engine dependencies, policy APIs, schema changes, or enforcement.
Prove disabled mode preserves current response, persistence, state, and event behavior.
Use the Section 3.11 handoff and stop; do not start Phase 2.
```

## 4. Target Production Architecture

### 4.1 Recommended architecture of the standalone service

```text
 Customer Review API / Events          CIS APIs (authoritative facts)
            │                                     │
            ▼                                     ▼
╭─────────────────── Standalone Spring Boot service ───────────────────╮
│  ╭────────────────────╮       ╭─────────────────────╮               │
│  │ Review             │──────▶│ Customer facts     │               │
│  │ application service│       │ adapter (CIS)      │               │
│  ╰──────────┬─────────╯       ╰──────────┬──────────╯               │
│             │ review workflow            ▼                          │
│             │                 ╭─────────────────────╮  ╭─────────╮  │
│             │                 │ PolicyDecisionPort  │─▶│DMN      │  │
│             │                 ╰─────────────────────╯  │runtime  │  │
│             ▼                                          ╰─────────╯  │
│  ╭────────────────────╮                                             │
│  │ MySQL 8 review DB  │◀── evaluation result + release identifiers  │
│  ╰────────────────────╯                                             │
│                                                                     │
│  Policy administration: canonical model, Jena/SHACL validation,     │
│  DMN compilation, governance, audit, and release publication         │
╰───────────────────────────────────────┬─────────────────────────────╯
                                        │ authoring-time only
                                        ▼
                              ╭────────────────────╮
                              │ Isolated Z3 solver │
                              ╰────────────────────╯

Optional external systems: LLM provider, artifact storage,
observability platform, and RDF store. No identity provider is
integrated; see Section 9.
```

Policy administration may move to a companion control-plane service without changing the review-time `PolicyDecisionPort`. The transaction-processing path must not call an LLM or Z3. It should evaluate a locally available or highly available approved DMN release and continue operating if authoring, conflict analysis, or the model provider is unavailable.

### 4.2 Control-plane and runtime responsibilities

1. **Control plane** — authors drafts, validates them, compares them with active policies, batch-qualifies complete candidates against a pinned baseline, records approvals, and creates immutable releases.
2. **Decision runtime** — loads only approved releases, evaluates rules, and then executes separately versioned recommendation and advisory-calculation decisions against the resulting findings and normalized facts.
3. **Review application layer** — owns customer facts, orchestration, persisted review state, public contracts, and the final use of policy findings.

Do not share mutable engine state between authoring and runtime. Publication should create an immutable release that runtime instances verify and load atomically.

### 4.3 Policy authoring and publication flow

1. A policy author enters a bounded policy through an administrative UI or supported import format. The app records a caller-supplied actor identifier; it does not authenticate it (Section 9).
2. An optional LLM gateway translates the request into structured draft JSON. The prompt version, model identity, and response provenance are recorded subject to data-retention rules.
3. Spring validates the JSON schema and converts it to the canonical policy model. No executable artifact is accepted directly from the LLM.
4. Jena and SHACL validate property names, datatypes, enum values, units, and domain constraints using a selected ontology release.
5. A deterministic compiler generates DMN and asks the chosen DMN runtime to compile it. Compilation diagnostics and tests are stored.
6. The conflict-analysis adapter translates the candidate and active policies from the same canonical model into Z3 constraints.
7. Analysis returns `NO_CONFLICT`, `COMPATIBLE_REFINEMENT`, `REDUNDANT`, `CONFLICT`, or `INDETERMINATE`, plus a witness when one exists. Timeouts and unsupported constructs are `INDETERMINATE`; they never silently pass.
8. The candidate release and active baseline run through the same evaluator over a versioned regression corpus and approved historical cases. Persist per-case differences, aggregate impact, corpus version, thresholds, errors, and indeterminate results; any incomplete run or breached gate blocks progression.
9. A reviewer sees the source request, canonical policy, ontology report, DMN artifacts, tests, conflict explanation, witness, batch impact, and warnings.
10. A designated approver (a recorded actor; procedurally, not cryptographically, authorized) approves or rejects the exact immutable revision and its current evidence. High-risk policies may require a second recorded approver.
11. Publication creates an immutable, checksummed release using the service's transaction/outbox conventions. Runtime instances atomically load it or retain the previous release.
12. Rollback republishes a previous approved release; it never edits policy or audit history.

### 4.4 Customer review evaluation flow

1. The review application service reaches its policy/decision point.
2. Its adapter builds a `PolicyEvaluationRequest` from authoritative facts available for that review.
3. The DMN runtime evaluates the rule layer of a specific active release. No LLM, Jena validation, Z3 call, or candidate batch occurs on this path.
4. A separately versioned recommendation decision combines all findings and normalized facts into a primary recommendation, supporting recommendations, and any advisory calculation. This layer does not mutate customer or review state.
5. The adapter maps the deterministic result into stable policy findings, reason codes, recommendations, and advisory values.
6. The review application service decides how those outputs affect the review workflow and is the only owner of customer-state mutation.
7. The service persists the release ID, decision ID, outcome, recommendations, and reasons with the review or its audit record.

### 4.5 Keep policy lifecycle separate from review lifecycle

Use explicit policy states and reject attempts to skip them:

```text
DRAFT → TRANSLATED → VALIDATED → ANALYZED → BATCH_PASSED → PENDING_APPROVAL
  │          │            │          │             │               │
  └──────────┴────────────┴──────────┴─────────────┴───────────────▶ REJECTED
                                                                  │
                                                                  ▼
                                                              APPROVED
                                                                  │
                                                                  ▼
                                                              PUBLISHED
                                                                  │
                                                                  ▼
                                                               RETIRED
```

Any material edit creates a new immutable revision and restarts validation. Validation, analysis, batch evidence, or approval of revision 3 must not be reusable for revision 4. Each result must be tied to hashes of the policy revision, ontology version, active-policy release, compiler version, engine version, regression corpus, and gate configuration.

These states govern policy artifacts only. Do not add them to the customer review entity or couple them to review states such as open, pending, approved, rejected, or escalated.

## 5. Canonical Policy Model: The Shared Contract

The most important production addition is a canonical policy intermediate representation (IR). RDF/SHACL, DMN, and SMT encode different concerns; none should be used as the sole authoring model for all three.

A representative Java domain model is:

```java
public record PolicyRevision(
    UUID policyId,
    long revision,
    String policyCode,
    String ontologyVersion,
    Expression scope,
    Effect effect,
    Instant effectiveFrom,
    Instant effectiveTo,
    OverrideDeclaration override,
    SourceMetadata source
) {}
```

`Expression` should be a closed hierarchy such as `And`, `Or`, `Not`, and typed `Comparison`. `Effect` should initially remain bounded to the reference operations: maximum, exclusive maximum, minimum, and ratio maximum. Use exact decimal arithmetic and explicit units; never use binary floating point for money or policy ratios.

The owning team must explicitly define these semantics before migrating a policy:

- inclusive versus exclusive bounds;
- scope intersection and precedence;
- explicit overrides and which policy may be overridden;
- effective and expiration dates;
- timezone rules;
- missing or null customer facts;
- currency and unit conversion policy;
- enum evolution;
- policy priority and tie behavior;
- behavior for unsupported or indeterminate analysis.

Every engine adapter must consume the canonical model. Do not separately translate natural language into RDF, DMN, and SMT, because those translations can disagree while each remains syntactically valid.

For every fact supplied by CIS, record its canonical name, source field, datatype, unit, null behavior, allowed values, freshness, sensitivity classification, and owner. That fact dictionary is the contract between the customer-facts adapter, ontology, DMN compiler, and solver. A source-field rename should require only an adapter change; a semantic change requires a new ontology and policy release.

## 6. Spring Boot Module Design

A suggested structure under the service's base package (for example `com.<org>.creditreview`) is:

```text
<base-package>
├── review                 review aggregate, workflow states, and Dispositions
├── review.facts           CIS-facing customer-facts adapter (Tier-1 context)
├── policy.domain          canonical policy model and lifecycle rules
├── policy.application     use cases and transaction boundaries
├── policy.api             REST DTOs, validation, and error mapping
├── policy.persistence     repositories and additive JPA mappings
├── ontology               Jena model loading, lookup, and SHACL validation
├── decision               DMN generation, compilation, tests, and execution
├── conflict               solver-neutral constraints and result model
├── conflict.z3            Z3 adapter or remote solver client
├── proposal               structured, LLM, and optional DSL input adapters
├── governance             policy review, approval, publication, and rollback
├── integration.review     customer-fact and policy-finding adapters
└── audit                  append-only audit records and outbox integration
```

These may be packages in one build or separate internal modules. Add a build-module boundary only when it enforces useful dependency or deployment constraints. There is no `security` package: the app implements no authentication or authorization (Section 9).

Enforce dependencies inward: engine-specific adapters may depend on domain and application ports, but the domain must not depend on Jena, Drools, Kogito, Z3, an LLM SDK, Spring MVC, JPA entities, or the review entity. The review application layer should depend on `PolicyDecisionPort`, not an engine API.

Useful application ports include:

```java
interface OntologyValidator {
    ValidationReport validate(PolicyRevision policy, OntologyRelease ontology);
}

interface DecisionCompiler {
    CompiledDecision compile(PolicyRevision policy, OntologyRelease ontology);
}

interface ConflictSolver {
    ConflictReport compare(PolicyRevision candidate, PolicySet activePolicies);
}

interface ProposalTranslator {
    TranslationResult translate(ProposalRequest request);
}

interface ReleasePublisher {
    Release publish(ApprovedPolicySet policySet);
}
```

These are architectural seams, not a reason to split into microservices immediately.

## 7. Technology Integration Details

### 7.1 Apache Jena and SHACL

Maintain ontology releases as versioned artifacts, for example:

```text
ontology/
├── 1.0.0/customer.ttl
├── 1.0.0/policy.ttl
├── 1.0.0/shapes.ttl
└── 1.0.0/release.json
```

The initial RDF model should represent only the customer facts and policy concepts required by the first migration cohort, including datatype, allowed values, units, labels, sensitivity, and applicability. The reference examples use customer number, name, AR balance, past-due amount, average days to pay, credit limit, payment terms, restricted status, and discontinued status; retain only fields that have an authoritative CIS equivalent in the fact dictionary.

SHACL should enforce structural and domain rules. The Spring adapter should:

1. load an immutable ontology release at startup or by release ID;
2. verify its checksum and parse the RDF and shapes;
3. cache immutable parsed models by version;
4. convert a canonical policy revision to a temporary RDF data graph;
5. run SHACL validation;
6. map the report to stable application error codes with RDF details attached for auditors;
7. fail closed if the requested ontology release is missing or invalid.

For the first release, store signed ontology artifacts in the source repository or approved object/artifact storage and load them into memory. Add an external RDF store such as Fuseki only when ontology query, collaborative editing, or dataset size requires it. Embedded Jena TDB2 should not be placed behind horizontally scaled Spring instances as a shared mutable store.

SHACL validates ontology conformance during authoring and publication; it does not replace request validation, workflow validation, DMN compilation, or policy conflict analysis. Do not add RDF conversion and SHACL validation to every customer review unless a separately measured requirement justifies it.

### 7.2 DMN with Drools/KIE or Kogito

The bounded canonical policy should compile deterministically into DMN XML. Generated DMN must include traceability metadata: policy ID, revision, ontology version, compiler version, and source hash.

Recommended first topology:

- place a compatible KIE/Drools DMN runtime behind `PolicyDecisionPort`, embedded in the service when dependency and operational constraints allow;
- compile and test candidate DMN during validation;
- store the exact compiled/source artifact and checksums with the release;
- load only approved release artifacts into the runtime;
- map confirmed customer facts to DMN inputs without exposing engine-native types to the review domain;
- keep runtime inputs and outputs behind an engine-neutral `DecisionRuntime` interface;
- keep the previous valid release active if a new release cannot be verified, compiled, or loaded.

Use a Kogito-generated decision service instead if independent scaling, release cadence, or organizational ownership justifies another deployable. Before selecting dependencies, run a compatibility spike against the **confirmed platform** (Section 1.5): Java 21, the chosen Spring Boot 3.x version, dependency-management rules, native-image requirements if any, container base image, and vulnerability policy. Record the chosen KIE/Kogito distribution in an architecture decision record. The application design must not depend on generated framework APIs outside the DMN adapter.

If the service already has automated decision logic, place it behind the same comparison harness and run current and DMN evaluators side by side. Do not remove current logic until representative historical cases reconcile and the business owner accepts every intentional difference.

Do not mutate one large live decision table in place. Build immutable release bundles, run approved baseline and regression cases, then atomically change the active release pointer. The bundle should contain:

- DMN XML;
- canonical policy JSON;
- ontology and SHACL release IDs;
- generated tests and expected results;
- compiler and engine versions;
- content checksums and signature;
- approval and publication metadata.

### 7.3 Z3 conflict analysis

Implement solver-neutral constraint objects before writing Z3 expressions. The adapter should translate the same typed comparisons and effects used by the DMN compiler. It should never accept arbitrary SMT-LIB supplied by a user or an LLM.

For every candidate, ask at least these questions:

1. Is the candidate scope satisfiable?
2. Does its scope overlap each active policy's scope?
3. In an overlapping scope, can both effects hold?
4. Is the candidate stricter, weaker, equivalent, or contradictory?
5. Is there a concrete witness showing the overlap or violation?

Return a structured result rather than solver text:

```json
{
  "classification": "CONFLICT",
  "candidateRevision": 4,
  "activeRelease": "2026-09-15.2",
  "conflictingPolicies": ["GLOBAL_ADP_MAX_30"],
  "witness": {
    "restricted_status": "N",
    "ar_balance": { "value": "125000", "unit": "USD" },
    "adp_days": { "value": 35, "unit": "DAYS" }
  },
  "solverStatus": "SAT",
  "durationMs": 18
}
```

Apply hard deadlines, expression-size limits, cancellation, memory/CPU limits, and metrics. Treat `UNKNOWN`, timeout, translation failure, and unsupported constructs as `INDETERMINATE`, requiring manual resolution or rejection before publication.

Preferred production topology: run Z3 in an isolated worker or internal service and call it through the `ConflictSolver` port. This limits native-library risk and permits independent resource controls. An in-process Java binding is acceptable for the integration spike if packaging is reproducible and the adapter contract is unchanged.

Z3 should generate synthetic witnesses from policy constraints rather than receive production customer records. A witness demonstrates that a conflict is possible; it does not identify an actual customer and should be labelled accordingly.

Z3 does not decide which business policy wins. Overrides and precedence remain explicit, reviewable policy metadata.

### 7.4 LLM proposal gateway

Add a real model only after deterministic validation, analysis, and approval paths work without it. The gateway should:

- accept bounded policy-authoring requests, not customer transaction data;
- use a versioned prompt derived from the selected ontology release;
- require structured output matching a strict JSON schema;
- reject unknown fields, properties, operators, units, and enum values;
- preserve the model provider, model version, prompt version, timestamps, and correlation ID;
- defend against prompt injection in user-supplied policy descriptions;
- apply rate limits, timeouts, retries, and cost limits;
- redact secrets and prohibited personal data;
- expose provider-independent application interfaces;
- create `DRAFT` or `TRANSLATED` revisions only.

If policies are imported from the exploratory DSL, keep its parser as a migration adapter only. If the business has another established policy format, build an importer for that format instead. Neither format should become the persistence or execution model unless it independently satisfies the production requirements.

## 8. Persistence, APIs, and Audit

### 8.1 Additive persistence

The confirmed database is **MySQL 8** accessed through **JPA/Hibernate**, with **no DDL migration tool** (no Flyway or Liquibase). Manage the schema as follows:

- Derive the schema from JPA entity mappings as the single source of truth. Use InnoDB, `utf8mb4`, UTC `DATETIME(6)` timestamps, `DECIMAL` for money and ratios (never `FLOAT`/`DOUBLE`), and MySQL `JSON` columns only for immutable typed payloads such as canonical policy content and release manifests.
- In local development and tests, `spring.jpa.hibernate.ddl-auto=update` (or `create-drop` for tests against Testcontainers MySQL) is acceptable.
- In shared and production environments, run with `ddl-auto=validate`. Produce DDL with Hibernate's schema-export tooling and hand it to the organization's established DDL control procedure, which owns review, application, and change history outside this codebase. Keep every change additive (new tables, new nullable columns, new indexes); a rename, drop, or rewrite goes through that same external procedure with a separately reviewed plan per Section 3.9.
- Enforce optimistic locking with `@Version` on mutable draft entities, and database uniqueness constraints for invariants such as one active release per policy domain.

Define naming, identifier, timestamp, retention, and soft-delete conventions once in Phase 1 and follow them thereafter. Use relational records for workflow and traceability.

The minimum logical model is:

- `policy` — stable identity and business key;
- `policy_revision` — immutable canonical content, source, hash, ontology version, and lifecycle status;
- `validation_run` — SHACL/DMN result tied to exact input and engine versions;
- `analysis_run` — active release hash, solver result, witnesses, limits, and version;
- `approval` — actor, role, decision, comment, timestamp, and approved revision hash;
- `policy_release` — immutable manifest, status, signature, and active interval;
- `release_policy` — exact revisions in a release;
- `artifact` — location, media type, checksum, and provenance for RDF, DMN, reports, and manifests;
- `policy_audit_event` — the service's append-only store for immutable policy business events;
- `policy_outbox_event` — add only when a distributed consumer requires release events and idempotency state.

Use optimistic locking for draft commands and a database uniqueness/locking strategy that prevents two releases from becoming active for the same policy domain at once.

Do not store a second copy of the customer or review aggregate in the policy schema. Runtime evaluation records should reference the service's review/customer identifiers according to the approved data-classification rules.

### 8.2 Illustrative APIs and application commands

Because policy management and the review runtime start in one application, prefer internal application calls for review-time evaluation and expose only the administration resources required by the UI or clients. If the control plane later becomes a companion service, define a versioned release-distribution contract and expose a decision endpoint only when the runtime is also remote.

Adapt the following illustrative API to the resource-naming, versioning, error-format, idempotency, and concurrency conventions defined in Phase 1:

```text
GET  /api/v1/ontologies/{version}
GET  /api/v1/ontologies/{version}/properties

POST /api/v1/policies
GET  /api/v1/policies/{policyId}
POST /api/v1/policies/{policyId}/revisions
POST /api/v1/policies/{policyId}/revisions/{revision}/translate
POST /api/v1/policies/{policyId}/revisions/{revision}/validate
POST /api/v1/policies/{policyId}/revisions/{revision}/analyze
POST /api/v1/policies/{policyId}/revisions/{revision}/submit
POST /api/v1/policies/{policyId}/revisions/{revision}/approve
POST /api/v1/policies/{policyId}/revisions/{revision}/reject

POST /api/v1/releases
POST /api/v1/releases/{releaseId}/publish
POST /api/v1/releases/{releaseId}/rollback
GET  /api/v1/releases/{releaseId}/manifest

GET  /api/v1/audit/events

OPTIONAL — only when decision runtime is a separate service:
POST /internal/v1/policy-evaluations
```

Long-running analysis or translation may return `202 Accepted` with an operation resource. Never hold a database transaction open while calling an LLM or solver.

### 8.3 Audit guarantees

Audit records should answer:

- who proposed, edited, validated, reviewed, approved, published, or rolled back a policy;
- exactly which content and engine versions were used;
- what active policies the candidate was compared against;
- what warnings, conflicts, witnesses, or overrides were visible to the approver;
- which release produced a runtime decision;
- whether an operation was retried, timed out, or failed.

Application logs are not the audit system. The standalone service must provide its own append-only policy audit store meeting these guarantees. Protect records from update or deletion according to the approved retention and legal-hold policy. Note the limit imposed by the no-security decision: audit records identify actors only by the unverified identifiers callers supplied (Section 9).

## 9. Security and Operational Controls

### 9.1 Security posture: no in-app security (confirmed decision)

By maintainer decision (Section 1.5), this application contains **no Spring Security and no other authentication or authorization implementation**. Consequences that must be stated, not hidden:

- Every endpoint, including policy administration, approval, publication, rollback, and the review APIs, is callable by anyone who can reach the service. Access control is entirely the responsibility of the deployment environment (private network, VPN, reverse proxy, or API gateway owned outside this app).
- The role names from the design (`POLICY_AUTHOR`, `POLICY_REVIEWER`, `POLICY_APPROVER`, `POLICY_PUBLISHER`, `POLICY_AUDITOR`, `DECISION_CLIENT`) survive only as **procedural capabilities**: governance endpoints require a caller-supplied actor identifier, and the service records it on approvals, publications, and audit events without verifying it.
- Separation of duties (author is not sole approver; publication by a different actor) is enforced only against those recorded identifiers. It deters mistakes, not malice.
- The Phase 0 threat model must document the confirmed deployment boundary, and the service must not be exposed beyond it while real customer data is present. Adding real authentication later is a deliberate, separately approved change — the ports and recorded-actor fields are designed so it can be added without reshaping the domain model.

### 9.2 Required controls

With in-app security out of scope, these controls still apply to the application itself:

- signed release manifests and verified checksums at load time;
- input-size, request-rate, solver, and LLM cost limits;
- no prohibited customer or personal data in model prompts;
- LLM provider credentials supplied through server-side environment variables or the platform's secret mechanism — never in code, configuration files under version control, or database rows;
- pinned dependencies (Maven/Gradle lockfiles) and software composition analysis;
- allow-listed outbound connectivity from the application and solver worker where the platform supports it;
- backup and restore exercises for the MySQL database and policy artifacts;
- audit retention, legal hold, and redaction rules;
- fail-closed authoring/publication behavior for missing ontology, invalid candidate release, indeterminate analysis, and signature failure, plus the explicitly approved customer-review runtime fallback.

TLS termination and encryption at rest are delegated to the hosting environment and database platform, consistent with the no-in-app-security decision.

### 9.3 Observability and service objectives

Propagate a correlation ID through translation, validation, analysis, approval, publication, and decision execution. Record metrics for:

- validation, DMN compilation, solver, and decision latency;
- solver `SAT`/`UNSAT`/`UNKNOWN`/timeout counts;
- LLM parse and deterministic-validation rejection rates;
- publication and runtime release-load failures;
- active release and ontology versions per instance;
- approval lead time and rollback frequency;
- decision result counts without putting sensitive customer facts in metric labels.

Define separate service objectives for control-plane operations and low-latency decision execution. A model-provider or solver outage must not stop evaluation of the currently active release.

## 10. Delivery Roadmap

Durations below indicate sequencing for one small cross-functional team, not a delivery commitment. Re-estimate after Phase 0 discovery and the technology spikes. Each phase should be independently deployable and reversible.

For AI-agent work, the gates in Section 3 are mandatory. At every phase exit gate, the agent must stop, provide the Section 3.11 handoff, and wait for explicit approval. Completing one phase does not authorize starting the next phase.

### Phase 0 — Discover the domain and freeze semantics (1–2 weeks)

**Deliver**

- Complete the baseline discovery checklist in Section 2 with the business owners, CIS integration owners, and the POC maintainer.
- Inventory current automated and manual policies, their owners, inputs, outcomes, effective dates, and precedence.
- Capture representative historical review cases and current expected outcomes without copying prohibited production data into test fixtures.
- Add the three reference scenarios as engine-neutral fixtures:
  - NET_30 with 5% past due → `COMPATIBLE_REFINEMENT`;
  - NET_30 with 15% past due → `CONFLICT` with the global 10% policy;
  - unrestricted high-balance customer with 45 ADP days → `CONFLICT` with the exclusive 30-day policy, including a witness.
- Add negative fixtures for unknown properties, invalid enum values, unit mismatch, inclusive/exclusive boundaries, nulls, and unsatisfiable scopes.
- Define the customer-fact dictionary, canonical IR v1, lifecycle states, error codes, classification semantics, override behavior, and exact-decimal/unit rules.
- Record architecture decisions for deployment topology, runtime fallback, Java/Spring dependency compatibility, build layout, engine selection criteria, and artifact storage, confirming or amending the Section 1.5 decisions.
- Complete a threat model and data-classification review, including the deployment boundary that compensates for having no in-app security (Section 9.1).

**Exit gate**

Service, business, risk, and engineering owners approve the context map, fact dictionary, policy semantics, and intended decision authority. Current behavior and intentional future changes are distinguishable in the fixture corpus. No production behavior changes in this phase.

### Phase 1 — Build the walking skeleton with policy boundaries (3–5 weeks)

**Deliver**

- Create the standalone Spring Boot application (Java 21, Spring Boot 3.x, MySQL 8, JPA) with the module layout from Section 6, CI, container build, health checks, and telemetry.
- Implement the review aggregate, workflow states, review APIs, and the CIS-facing customer-facts adapter.
- Add `PolicyDecisionPort` with a deterministic Java evaluator that ports the POC's rule semantics as the initial current-behavior implementation.
- Complete agent Gate C conventions before adding any engine dependency or policy authority.
- Implement the canonical IR, deterministic schema/domain validation, and a manual structured-authoring path.
- Create the JPA-mapped schema per Section 8.1, the append-only audit store, and recorded-actor handling per Section 9.1.
- Implement policy lifecycle enforcement, immutable revisions, idempotency, optimistic locking, and API/application tests.
- Add server-controlled `disabled` and `shadow` modes, comparison records, metrics, and an immediate kill switch.

**Exit gate**

The service runs end to end: a review can be created, evaluated by the deterministic evaluator against the fixture corpus, and persisted with release/decision identifiers. Policy evaluation can be deployed disabled with no API, latency, or review-outcome regression, and in shadow mode policy results cannot alter workflow. No client can approve or publish an unvalidated revision, and every policy mutation carries a recorded actor and audit event.

### Phase 2 — Formalize ontology validation with Jena and SHACL (3–4 weeks)

**Deliver**

- Encode the approved first-cohort fact dictionary and policy vocabulary in RDF/OWL.
- Define SHACL shapes for datatypes, enums, units, cardinality, supported operators, and effect/property compatibility.
- Implement versioned ontology loading, checksums, immutable caching, validation-report mapping, and metadata access for authorized administration clients.
- Add ontology compatibility tests and a governed release process for ontology changes.
- Run reference, current-policy, and negative fixtures through the Jena adapter.

**Exit gate**

The fact adapter, Java validator, administration metadata, and any prompt metadata use the same released fact definitions. A missing or incompatible ontology version blocks policy progression without affecting evaluation of the last valid runtime release.

### Phase 3 — Standardize execution with DMN (4–6 weeks)

**Deliver**

- Complete a KIE/Drools versus Kogito compatibility and operations spike, then record the selection.
- Implement deterministic canonical-IR-to-DMN generation and compile-time diagnostics.
- Generate regression tests for each candidate and the complete release bundle.
- Implement immutable release manifests, signing/checksum verification, atomic activation, runtime release pinning, and rollback.
- Implement the `PolicyDecisionPort` adapter and expose a remote decision API only if the chosen topology requires it.
- Run DMN and current behavior side by side in shadow mode using representative historical and live-safe traffic.
- Produce a reconciliation report grouped by expected differences, defects, missing facts, and indeterminate cases.

**Exit gate**

Only an approved, verified release can execute. Reference fixtures pass, current-policy parity meets an agreed threshold, every intentional difference has business approval, performance meets the review-path objective, and rollback to current behavior or the previous policy release is rehearsed.

Keep these releases in shadow or advisory use until conflict analysis and the production-readiness gates are complete.

### Phase 4 — Expand conflict analysis with Z3 (4–6 weeks)

**Deliver**

- Define the solver-neutral constraint model and canonical-to-constraint translator.
- Implement scope satisfiability, overlap, compatibility, refinement, redundancy, and contradiction queries.
- Produce bounded, typed witnesses and application-level explanations.
- Add hard resource limits, deadlines, cancellation, `INDETERMINATE` handling, and solver telemetry.
- Package the selected native binding reproducibly, then isolate it in a worker/service if the spike confirms the expected operational benefit.
- Add differential and property-based tests comparing bounded cases with approved policy semantics.

**Exit gate**

Reference scenarios and service-specific boundary cases are explained correctly. Timeout, unknown, native crash, and malformed-translation tests block publication. A solver outage does not affect existing customer reviews using an already published release.

### Phase 5 — Add governed LLM translation (3–5 weeks)

**Deliver**

- Add provider-independent translation interfaces, strict structured output, prompt versioning, request redaction, rate/cost controls, retries, and telemetry.
- Generate prompt ontology content from the same released ontology API.
- Build an adversarial corpus for prompt injection, invented properties, invalid enum values, malformed numbers, units, and unsupported operators.
- Show authors a semantic diff between their request, the canonical draft, and any later edits.
- Retain a fully manual structured-authoring path when the LLM is unavailable.
- Complete the privacy, legal, security, procurement, and model-provider reviews the organization's governance requires.

**Exit gate**

No model response bypasses schema, ontology, DMN, conflict, or approval gates. Disabling the LLM affects convenience only, not validation, approval, publication, rollback, or execution.

### Phase 6 — Pilot, harden, and roll out (4–8 weeks)

**Deliver**

- Run historical policies and representative customer facts in shadow mode; reconcile semantic differences with the current business process.
- Complete performance, concurrency, failover, backup/restore, and disaster-recovery tests, plus a review of the deployment boundary that stands in for in-app security (Section 9.1).
- Define service objectives, alerts, runbooks, on-call ownership, support procedures, and change-management controls.
- Progress through advisory mode, then pilot enforcement for a limited policy domain and bounded cohort using the service's feature-flag mechanism.
- Train authors, reviewers, publishers, auditors, and support staff.

**Exit gate**

Service, risk, and business owners sign off on shadow/advisory results and controls. Production readiness review passes, rollback is rehearsed, and the first enforced cohort has explicit success, mismatch, and stop criteria.

## 11. Cross-Engine and Existing-Behavior Conformance

The largest technical risk is semantic drift between the canonical IR, RDF/SHACL, DMN, and Z3. Manage it as a first-class compatibility problem:

1. Maintain one versioned fixture corpus with current and proposed policies, facts, expected validation, expected conflicts, witnesses, and expected decisions.
2. Record whether each expected result represents current behavior, an approved correction, or a new policy capability.
3. Run the current evaluator and DMN adapter against the same fixtures during migration and classify every mismatch.
4. Require every adapter to report which canonical constructs it supports.
5. Block publication when a construct is unsupported by any required engine.
6. Run tests at inclusive/exclusive boundaries and one representable value on each side.
7. Use exact decimals and canonical units in every adapter.
8. Compare DMN execution with solver expectations for generated witnesses.
9. Store generated artifacts and engine versions so any release can be replayed.
10. Treat a change in compiler, ontology, shape, DMN engine, or solver version as a release change requiring regression tests.

The reference scenarios explain the design but are not sufficient acceptance coverage. Service-specific policies and historical outcomes are the primary migration baseline.

## 12. Production-Readiness Definition

The system is ready for a controlled production pilot only when all of the following are true:

- The review decision point, authoritative facts, public contracts, and workflow ownership are documented.
- Shadow and advisory comparisons meet agreed mismatch, latency, and error thresholds; every intentional behavior difference has business approval.
- The feature can be disabled without a deployment, and fallback behavior has been tested for release-load and runtime-evaluation failures.
- API/event consumers see no unapproved contract or reason-code changes.
- LLM output can create drafts but cannot approve, publish, or execute anything.
- All required validation and analysis results are tied to exact immutable inputs and engine versions.
- Procedural separation of duties on recorded actors is enforced server-side, and the risk owners have explicitly accepted that actor identities are unverified because the app has no in-app security (Section 9.1).
- The deployment boundary compensating for no in-app security is documented, reviewed, and confirmed operational.
- Approved releases are signed/checksummed, reproducible, and atomically activated.
- Runtime evaluations are pinned to a release and remain available during authoring, LLM, or solver outages.
- Conflict witnesses and human overrides are explainable and auditable.
- `UNKNOWN`, timeout, and unsupported semantics fail closed before publication.
- Approved baseline, boundary, negative, property-based, concurrency, rollback, and disaster-recovery tests pass.
- Logs, metrics, traces, and alerts avoid sensitive policy/customer data while retaining useful identifiers.
- Backup restore, rollback, and incident runbooks have been exercised.

## 13. Decision Record and Remaining Decisions

The maintainer has already settled the platform decisions in Section 1.5 (standalone application, MySQL 8, JPA/Hibernate, no DDL migration tool, no in-app security, Java 21, Spring Boot 3.x). Resolve the remaining rows through short architecture decision records during Phase 0:

| Decision | Status / recommended default | Trigger to choose differently |
| --- | --- | --- |
| Application shape | **Decided:** one standalone Spring Boot application containing control plane and decision runtime | Extract a companion control plane or decision service for verified ownership, security, dependency, release, or scaling constraints |
| Database and access | **Decided:** MySQL 8 with JPA/Hibernate | None without a new maintainer decision |
| Schema management | **Decided:** no DDL migration tool; JPA-derived additive DDL applied through the organization's external DDL control procedure (Section 8.1) | Adopt a migration tool only through a new maintainer decision |
| In-app security | **Decided:** none; recorded unverified actors plus a deployment boundary (Section 9) | Add authentication/authorization only through a separately approved change |
| Review workflow authority | The service's review application layer | Change only through a separately approved workflow migration |
| Customer fact source | CIS APIs through the customer-facts adapter | Add a source only when its ownership, freshness, availability, and data classification are approved |
| Authoritative policy form | Canonical typed IR | None; individual engine formats must remain generated artifacts |
| Prototype policy formats | Input/migration adapters | Remove an adapter after its policies and users have migrated |
| Policy persistence | Additive tables in the service's MySQL database | Separate storage for a companion service or explicit data-boundary requirement |
| Ontology storage | Versioned signed artifacts loaded in memory | Add Fuseki/external RDF store for collaborative editing, large datasets, or richer queries |
| DMN runtime | Embedded KIE/Drools behind an interface | Use Kogito service for independent scaling/release ownership or superior verified compatibility |
| Z3 placement | Isolated internal worker/service | Use in-process only if native packaging and resource isolation meet operational requirements |
| LLM output | Strict structured draft JSON | Never accept executable DMN, RDF, or SMT directly from a model |
| Release model | Immutable bundle with atomic active pointer | None; do not mutate active artifacts in place |
| Activation | Human approval plus publisher action (recorded actors) | Add two-person approval for high-risk scopes |
| Runtime failure behavior | Preserve the last valid release and use the approved fallback | Never infer fail-open/fail-closed behavior without the current business and risk owners |

## 14. Explicit Non-Goals for the First Release

- General natural-language understanding or arbitrary rule syntax.
- General OWL inference as a replacement for explicit business semantics.
- Automatic resolution of business-policy precedence by an LLM or Z3.
- Sending customer portfolios or transaction records to an LLM.
- Calling Z3 during each customer decision.
- Editing active DMN or ontology artifacts in place.
- Starting with independently deployed microservices for every engine.
- In-app authentication, authorization, or identity-provider integration (maintainer decision; see Section 9).
- Multi-tenancy.
- Replicating the customer or review aggregate in policy storage.
- Renaming authoritative CIS customer fields to match the reference examples.
- Selecting library versions before verifying compatibility with the confirmed Java 21 / Spring Boot 3.x platform.
- Supporting multiple currencies or unit conversion until those semantics are explicitly designed.

## 15. Immediate Next Sprint

The first sprint should produce a design brief and executable baseline, not commit to all three engines at once:

1. Walk through the intended customer review flow with the business owners and the POC, and define the decision point, state owner, fallback, and public side effects the new service will implement.
2. Produce the context map, customer-fact dictionary (from CIS), current-policy inventory, and API/event contract list from Section 2.
3. Convert representative current policies and sanitized historical cases, plus the three reference scenarios, into versioned fixtures.
4. Define `PolicyDecisionPort`, the canonical IR v1, structured JSON schema, lifecycle transitions, error codes, conflict classifications, and `INDETERMINATE` behavior.
5. Scaffold the standalone Spring Boot application (Java 21, Spring Boot 3.x, MySQL 8, JPA) with the review skeleton and a deterministic current-behavior adapter behind a disabled feature flag.
6. Build time-boxed compatibility spikes for Jena/SHACL, the candidate DMN runtime, and Z3 against that platform using the same ADP policy and one business-specific policy.
7. Confirm dependency versions from measured compatibility, latency, packaging, and operations results.
8. Draft the threat model (including the deployment boundary for the unsecured app), data classification, release manifest, rollout thresholds, and rollback procedure.
9. Review the brief with service owners, policy owners, risk/compliance, security, data governance, and operations.

The outcome should be a signed-off design brief, adapter contract, and fixture suite. Full engine implementation should begin only after the team can show where each capability fits, which behavior it preserves, how it is disabled or rolled back, and that all three engine adapters can represent the same bounded policy without semantic differences.

## 16. Exploration Provenance

The current illustrative POC includes a portable Hono gateway, shared-password access gate, real GitHub Copilot SDK drafting and explanation calls, bounded fictional evidence tools, deterministic validation/evaluation/impact controls, and browser-tab session state. It does **not** integrate CIS APIs, production customer data, Apache Jena, SHACL, DMN/Kogito/Drools, Z3, durable persistence/audit, user identity or roles, production policy publication, or customer-state mutation. Treat its modules and fictional fixtures as design evidence and executable examples, not production code or an integration contract.

In August 2026 the maintainer reframed this guide from an existing-service integration plan to the standalone-application plan recorded in Section 1.5: a new Spring Boot service on MySQL 8 with JPA, no DDL migration tool, and no in-app security.
