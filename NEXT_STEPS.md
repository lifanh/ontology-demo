# Policy Reasoning for an Existing Customer Review Service

## 1. Executive Summary

### 1.1 Audience and intended outcome

This document is for maintainers of an existing Spring Boot customer review service. It is self-contained: no knowledge of the exploratory prototype that informed it is required.

The proposed capability lets policy owners author, validate, compare, approve, publish, and execute customer-review policies with traceable results. It should be integrated **around the service's existing domain model, review workflow, security, persistence, APIs, events, and operational conventions** rather than introduced as a parallel application that duplicates them.

The central trust boundary is:

> An LLM may propose a policy. Deterministic systems validate, analyze, and execute it. Authorized people decide whether the policy becomes active.

An LLM must never validate its own output, resolve policy conflicts, approve a policy, publish a release, or make a final customer-review decision. The existing customer review service remains the system of record and workflow authority unless the owning team explicitly decides otherwise.

### 1.2 Reference policy examples

The examples below provide a concrete bounded credit-policy domain for the behavior referenced throughout this guide:

- Global policy: average days to pay (`adp_days`) must be **less than 30 days**.
- Global policy: `past_due_amount` must be no more than **10% of `ar_balance`**.
- Candidate: for `NET_30` customers, allow only 5% past due. This is a compatible refinement because it is stricter than the global 10% maximum.
- Candidate: for `NET_30` customers, allow 15% past due. This conflicts with the global 10% maximum.
- Candidate: for unrestricted customers with balance above USD 100,000, allow up to 45 days to pay. This conflicts with the global exclusive 30-day maximum; a customer with 35 days to pay is a concrete conflict witness.

The existing service does not need to use these field names. During integration, map its authoritative customer facts and policy concepts to the canonical policy model described below. Start only with facts already governed and available at review time.

### 1.3 Proposed production capabilities

| Concern | Proposed capability | Runtime role |
| --- | --- | --- |
| Policy vocabulary | Versioned RDF/OWL vocabulary | Defines supported customer facts and policy concepts |
| Structural/domain validation | Apache Jena with SHACL | Validates properties, types, enums, units, and allowed relationships before approval |
| Shared policy representation | Canonical typed Java policy model | Prevents Jena, DMN, and Z3 from interpreting separate translations |
| Executable decisions | Versioned DMN with a Drools/KIE or compatible Kogito runtime | Evaluates approved policy releases during customer review |
| Conflict analysis | Z3 satisfiability solver | Compares candidate policies with the active set before publication |
| Assisted authoring | Governed LLM gateway | Creates drafts only; it is not on the review execution path |
| Governance | Existing identity/workflow conventions plus policy-specific controls | Provides review, approval, publication, rollback, and auditability |

This is not a proposal to build a general-purpose reasoner, replace a proven customer-review workflow wholesale, or allow arbitrary natural language to become executable.

**Recommended default:** add the customer-facts adapter, `PolicyDecisionPort`, release pinning, and embedded DMN runtime at the existing review decision point. Reuse the service's database, security, audit, feature flags, and operational tooling. Keep Jena/SHACL, Z3, and the optional LLM on the authoring path; move that control plane to a companion Spring Boot deployment if its dependencies, ownership, scaling, or security profile do not belong in the customer-review runtime. Adopt the result through disabled, shadow, advisory, and bounded-enforcement modes.

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

## 2. Adapt the Design to the Existing Service First

### 2.1 Baseline discovery checklist

Before selecting dependencies or changing code, document the current service in a short context map. Answer these questions from code, configuration, operational dashboards, and the owning team:

1. **Review entry points:** Which API calls, messages, jobs, or UI actions create and update a customer review?
2. **Authoritative facts:** Which fields are available at decision time, where do they come from, how fresh are they, and how are missing values handled?
3. **Current decision logic:** Is policy logic in Java, database queries, configuration, a rules engine, manual procedures, or another service?
4. **Decision authority:** Does existing automation approve/reject a review, produce findings for a human, or both? Which behavior is regulated or contractually fixed?
5. **Workflow:** What are the current review states, transition rules, escalation paths, and retry/idempotency behavior?
6. **Data contracts:** Which public APIs and events must remain backward compatible? Which downstream systems depend on current reason codes?
7. **Security:** Which identity provider, authorities, tenancy rules, and separation-of-duty controls already exist?
8. **Persistence and messaging:** Which database, migration tool, audit mechanism, outbox, broker, and retention policies are already standard?
9. **Runtime constraints:** Which Java and Spring Boot versions, deployment platform, latency/throughput objectives, and availability targets apply?
10. **Operations:** How are releases, feature flags, observability, rollback, backup/restore, and incident response handled today?

The expected output is a one-page context diagram, a customer-fact dictionary, current policy examples, an API/event inventory, and a list of constraints. Use those artifacts to replace the illustrative names and choices in this guide.

### 2.2 Map existing components rather than duplicating them

| Existing service concern | Integration action |
| --- | --- |
| Customer/review domain entities | Add an anti-corruption mapper to a small `PolicyEvaluationContext`; do not expose JPA entities to policy engines. |
| Review application service | Invoke a `PolicyDecisionPort` at the existing decision point, initially in shadow mode. |
| Review statuses and transitions | Keep them authoritative. Map policy findings into existing commands or reason codes only after business approval. |
| Current rules/configuration | Inventory and import them as fixtures before replacing behavior. Reconcile differences explicitly. |
| Existing database and migrations | Add namespaced, additive policy tables through the existing migration tool. Do not create a second database by default. |
| Existing audit/event framework | Extend it with policy revision, validation, approval, release, and evaluation events. Avoid a parallel audit mechanism. |
| Existing identity and roles | Map policy actions to current authorities. Add roles only when current authorities cannot express the needed separation of duties. |
| Existing outbox/message broker | Reuse it for release publication and cache invalidation. Use direct in-process events if the service has no distributed consumer. |
| Existing API conventions | Follow current URL, error, pagination, concurrency, and idempotency conventions; the endpoints below are examples only. |
| Existing deployment and feature flags | Ship policy evaluation disabled, then shadow, then advisory, then enforced. Preserve an immediate rollback path. |

If the service already uses a standards-based rule engine, ontology store, approval workflow, or artifact repository, evaluate extending it before introducing the corresponding component proposed here.

### 2.3 Choose the integration topology deliberately

| Topology | Use when | Trade-off |
| --- | --- | --- |
| **Modules inside the existing Spring Boot application** | The service can accept the dependencies and shares ownership, release cadence, scaling, and data boundaries with policy management | Simplest transactions and operations; native solver dependencies still require isolation |
| **Policy control-plane companion service; DMN runtime embedded in customer review** | Authoring/governance scales or releases independently, while review evaluation needs low latency and high availability | Recommended split for many mature systems; requires reliable release distribution |
| **Separate control plane and decision service** | Organizational ownership, security boundaries, or independent runtime scaling require separate deployables | Adds network failure modes, version coordination, and operational overhead |

Default to the smallest topology compatible with the existing service. Keep Java interfaces and artifact contracts stable so a module can be extracted later. Z3 should normally be isolated because it uses native code and requires strict resource limits; an in-process binding is acceptable only for a time-boxed compatibility spike.

### 2.4 Define the review-time integration contract

The policy subsystem should receive only the facts needed for policy evaluation and return a stable, explainable result. Adapt these names and fields to the existing service:

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

`PolicyOutcome` should reflect policy evaluation, not silently redefine the review workflow. For example, `REFER`, `POLICY_PASS`, or `POLICY_FAIL` may become an existing review finding, but only the existing application service should perform the corresponding review-state transition. Each saved review outcome must include the policy release and decision identifiers needed for replay.

Resolve the active policy release once for a review evaluation and pass its ID explicitly. An idempotent retry for the same review version must use the same release and facts. Re-evaluation under a newer release should be an explicit command that creates a new result linked to the prior evaluation; it must not rewrite the original result.

### 2.5 Safe adoption sequence inside the existing workflow

1. **Disabled:** deploy modules and migrations without invoking policy evaluation.
2. **Shadow:** evaluate asynchronously or alongside current logic, persist comparisons, and do not affect responses or workflow.
3. **Advisory:** show policy findings to authorized reviewers, but keep the current decision authoritative.
4. **Enforced for a bounded cohort:** allow the policy result to influence approved transitions for selected policy types, tenants, or traffic.
5. **Expanded:** migrate additional policies only after reconciliation and rollback criteria pass.

Feature flags must be server-controlled and audited. Define mismatch thresholds, stop conditions, and rollback ownership before moving between modes.

## 3. Target Production Architecture

### 3.1 Recommended architecture around the existing service

```text
 Customer Review API / Events
            │
            ▼
╭──────────────────── Existing Spring Boot service ────────────────────╮
│  ╭────────────────────╮       ╭─────────────────────╮               │
│  │ Existing review    │──────▶│ Customer facts     │               │
│  │ application service│       │ adapter            │               │
│  ╰──────────┬─────────╯       ╰──────────┬──────────╯               │
│             │ existing workflow          ▼                          │
│             │                 ╭─────────────────────╮  ╭─────────╮  │
│             │                 │ PolicyDecisionPort  │─▶│DMN      │  │
│             │                 ╰─────────────────────╯  │runtime  │  │
│             ▼                                          ╰─────────╯  │
│  ╭────────────────────╮                                             │
│  │ Existing review DB │◀── evaluation result + release identifiers  │
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

Optional external systems: identity provider, LLM provider, artifact
storage, secrets manager, observability platform, and RDF store.
```

Policy administration may move to a companion control-plane service without changing the review-time `PolicyDecisionPort`. The transaction-processing path must not call an LLM or Z3. It should evaluate a locally available or highly available approved DMN release and continue operating if authoring, conflict analysis, or the model provider is unavailable.

### 3.2 Control-plane and runtime responsibilities

1. **Control plane** — authors drafts, validates them, compares them with active policies, records approvals, and creates immutable releases.
2. **Decision runtime** — loads only approved releases and evaluates customer facts against a pinned DMN release.
3. **Existing review service** — owns customer facts, orchestration, persisted review state, public contracts, and the final use of policy findings.

Do not share mutable engine state between authoring and runtime. Publication should create an immutable release that runtime instances verify and load atomically.

### 3.3 Policy authoring and publication flow

1. An authenticated policy author enters a bounded policy through an administrative UI or supported import format.
2. An optional LLM gateway translates the request into structured draft JSON. The prompt version, model identity, and response provenance are recorded subject to data-retention rules.
3. Spring validates the JSON schema and converts it to the canonical policy model. No executable artifact is accepted directly from the LLM.
4. Jena and SHACL validate property names, datatypes, enum values, units, and domain constraints using a selected ontology release.
5. A deterministic compiler generates DMN and asks the chosen DMN runtime to compile it. Compilation diagnostics and tests are stored.
6. The conflict-analysis adapter translates the candidate and active policies from the same canonical model into Z3 constraints.
7. Analysis returns `NO_CONFLICT`, `COMPATIBLE_REFINEMENT`, `REDUNDANT`, `CONFLICT`, or `INDETERMINATE`, plus a witness when one exists. Timeouts and unsupported constructs are `INDETERMINATE`; they never silently pass.
8. A reviewer sees the source request, canonical policy, ontology report, DMN artifact, tests, conflict explanation, witness, and warnings.
9. An authorized approver approves or rejects the exact immutable revision. High-risk policies may require a second approver under existing governance rules.
10. Publication creates an immutable, checksummed release using the service's existing transaction/outbox conventions. Runtime instances atomically load it or retain the previous release.
11. Rollback republishes a previous approved release; it never edits policy or audit history.

### 3.4 Customer review evaluation flow

1. The existing application service reaches its current policy/decision point.
2. Its adapter builds a `PolicyEvaluationRequest` from authoritative facts available for that review.
3. The DMN runtime evaluates a specific active release. No LLM, Jena validation, or Z3 call occurs on this path.
4. The adapter maps engine output into stable policy findings and reason codes.
5. The existing application service decides how those findings affect the review workflow.
6. The service persists the release ID, decision ID, outcome, and reasons with the review or its existing audit record.

### 3.5 Keep policy lifecycle separate from review lifecycle

Use explicit policy states and reject attempts to skip them:

```text
DRAFT → TRANSLATED → VALIDATED → ANALYZED → PENDING_APPROVAL
  │          │            │          │              │
  └──────────┴────────────┴──────────┴──────────────▶ REJECTED
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

Any material edit creates a new immutable revision and restarts validation. Validation, analysis, or approval of revision 3 must not be reusable for revision 4. Each result must be tied to hashes of the policy revision, ontology version, active-policy release, compiler version, and engine version.

These states govern policy artifacts only. Do not add them to the customer review entity or couple them to review states such as open, pending, approved, rejected, or escalated.

## 4. Canonical Policy Model: The Shared Contract

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

For every fact exposed by the existing service, record its canonical name, source field, datatype, unit, null behavior, allowed values, freshness, sensitivity classification, and owner. That fact dictionary is the contract between the customer-facts adapter, ontology, DMN compiler, and solver. A source-field rename should require only an adapter change; a semantic change requires a new ontology and policy release.

## 5. Spring Boot Module Design

A suggested structure under the service's existing base package is:

```text
<existing-base-package>.policy
├── policy.domain          canonical policy model and lifecycle rules
├── policy.application     use cases and transaction boundaries
├── policy.api             REST DTOs, validation, and error mapping
├── policy.persistence     repositories and additive migrations
├── ontology               Jena model loading, lookup, and SHACL validation
├── decision               DMN generation, compilation, tests, and execution
├── conflict               solver-neutral constraints and result model
├── conflict.z3            Z3 adapter or remote solver client
├── proposal               structured, LLM, and optional DSL input adapters
├── governance             policy review, approval, publication, and rollback
├── integration.review     customer-fact and policy-finding adapters
├── security               mappings to existing authorities
└── audit                  integration with existing audit/outbox conventions
```

These may be packages in the existing build or separate internal modules. Do not restructure the whole service merely to match this example. Add a build-module boundary only when it enforces useful dependency or deployment constraints.

Enforce dependencies inward: engine-specific adapters may depend on domain and application ports, but the domain must not depend on Jena, Drools, Kogito, Z3, an LLM SDK, Spring MVC, JPA entities, or the existing review entity. The existing review application layer should depend on `PolicyDecisionPort`, not an engine API.

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

## 6. Technology Integration Details

### 6.1 Apache Jena and SHACL

Maintain ontology releases as versioned artifacts, for example:

```text
ontology/
├── 1.0.0/customer.ttl
├── 1.0.0/policy.ttl
├── 1.0.0/shapes.ttl
└── 1.0.0/release.json
```

The initial RDF model should represent only the customer facts and policy concepts required by the first migration cohort, including datatype, allowed values, units, labels, sensitivity, and applicability. The reference examples use customer number, name, current balance, AR balance, past-due amount, average days to pay, credit limit, payment terms, restricted status, and discontinued status; retain only fields that have an authoritative equivalent in the existing service.

SHACL should enforce structural and domain rules. The Spring adapter should:

1. load an immutable ontology release at startup or by release ID;
2. verify its checksum and parse the RDF and shapes;
3. cache immutable parsed models by version;
4. convert a canonical policy revision to a temporary RDF data graph;
5. run SHACL validation;
6. map the report to stable application error codes with RDF details attached for auditors;
7. fail closed if the requested ontology release is missing or invalid.

For the first release, use the service's existing artifact mechanism where possible: store signed ontology artifacts in the source repository or approved object/artifact storage and load them into memory. Add an external RDF store such as Fuseki only when ontology query, collaborative editing, or dataset size requires it. Embedded Jena TDB2 should not be placed behind horizontally scaled Spring instances as a shared mutable store.

SHACL validates ontology conformance during authoring and publication; it does not replace request validation, workflow validation, DMN compilation, or policy conflict analysis. Do not add RDF conversion and SHACL validation to every customer review unless a separately measured requirement justifies it.

### 6.2 DMN with Drools/KIE or Kogito

The bounded canonical policy should compile deterministically into DMN XML. Generated DMN must include traceability metadata: policy ID, revision, ontology version, compiler version, and source hash.

Recommended first topology:

- place a compatible KIE/Drools DMN runtime behind `PolicyDecisionPort`, embedded in the existing service when dependency and operational constraints allow;
- compile and test candidate DMN during validation;
- store the exact compiled/source artifact and checksums with the release;
- load only approved release artifacts into the runtime;
- map existing customer facts to DMN inputs without exposing engine-native types to the review domain;
- keep runtime inputs and outputs behind an engine-neutral `DecisionRuntime` interface;
- keep the previous valid release active if a new release cannot be verified, compiled, or loaded.

Use a Kogito-generated decision service instead if independent scaling, release cadence, or organizational ownership justifies another deployable. Before selecting dependencies, run a compatibility spike against the **existing service's** Java version, Spring Boot version, dependency-management rules, native-image requirements if any, container base image, and vulnerability policy. Record the chosen KIE/Kogito distribution in an architecture decision record. The application design must not depend on generated framework APIs outside the DMN adapter.

If the service already has automated decision logic, place it behind the same comparison harness and run current and DMN evaluators side by side. Do not remove current logic until representative historical cases reconcile and the business owner accepts every intentional difference.

Do not mutate one large live decision table in place. Build immutable release bundles, run approved baseline and regression cases, then atomically change the active release pointer. The bundle should contain:

- DMN XML;
- canonical policy JSON;
- ontology and SHACL release IDs;
- generated tests and expected results;
- compiler and engine versions;
- content checksums and signature;
- approval and publication metadata.

### 6.3 Z3 conflict analysis

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
    "current_balance": { "value": "125000", "unit": "USD" },
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

### 6.4 LLM proposal gateway

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

If policies are imported from the exploratory DSL, keep its parser as a migration adapter only. If the existing service has another policy format, build an importer for that format instead. Neither format should become the persistence or execution model unless it independently satisfies the production requirements.

## 7. Persistence, APIs, and Audit

### 7.1 Additive persistence

Use the existing service's supported relational database and migration tool. PostgreSQL is suitable but not required. Keep changes additive and follow existing naming, identifier, tenancy, timestamp, encryption, retention, and soft-delete conventions. Use relational records for workflow and traceability, with JSON only for immutable typed payloads where appropriate.

The minimum logical model is:

- `policy` — stable identity and business key;
- `policy_revision` — immutable canonical content, source, hash, ontology version, and lifecycle status;
- `validation_run` — SHACL/DMN result tied to exact input and engine versions;
- `analysis_run` — active release hash, solver result, witnesses, limits, and version;
- `approval` — actor, role, decision, comment, timestamp, and approved revision hash;
- `policy_release` — immutable manifest, status, signature, and active interval;
- `release_policy` — exact revisions in a release;
- `artifact` — location, media type, checksum, and provenance for RDF, DMN, reports, and manifests;
- `policy_audit_event` — use only if the existing audit framework cannot carry the required immutable business events;
- `policy_outbox_event` — use only if the existing outbox cannot carry release events and idempotency state.

Use optimistic locking for draft commands and a database uniqueness/locking strategy that prevents two releases from becoming active for the same policy domain at once.

Do not store a second copy of the customer or review aggregate in the policy schema. Runtime evaluation records should reference the service's existing review/customer identifiers according to current data-classification rules.

### 7.2 Illustrative APIs and application commands

If policy management is part of the existing service, prefer internal application calls for review-time evaluation and expose only the administration resources required by its UI or clients. If it is a companion service, define a versioned release-distribution contract and expose a decision endpoint only when the runtime is also remote.

Adapt the following illustrative API to the service's established resource names, versioning, error format, idempotency, concurrency, and tenancy conventions:

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

### 7.3 Audit guarantees

Audit records should answer:

- who proposed, edited, validated, reviewed, approved, published, or rolled back a policy;
- exactly which content and engine versions were used;
- what active policies the candidate was compared against;
- what warnings, conflicts, witnesses, or overrides were visible to the approver;
- which release produced a runtime decision;
- whether an operation was retried, timed out, or failed.

Application logs are not the audit system. Extend the service's existing business audit trail where it meets these guarantees; otherwise add an append-only policy audit store. Protect records from update or deletion according to existing retention and legal-hold policy.

## 8. Security and Operational Controls

### 8.1 Authorization

Use the service's current Spring Security and identity-provider integration. The following are capabilities that must be authorized, not a requirement to create these exact role names:

- `POLICY_AUTHOR` — creates drafts and requests translation;
- `POLICY_REVIEWER` — validates, analyzes, comments, and submits;
- `POLICY_APPROVER` — approves an exact revision;
- `POLICY_PUBLISHER` — publishes or rolls back an approved release;
- `POLICY_AUDITOR` — read-only access to history and evidence;
- `DECISION_CLIENT` — invokes only the runtime decision API.

Map these capabilities to existing authorities and tenancy rules. Enforce separation of duties for high-risk policies: an author cannot be the sole approver, and publication may require a different actor. Service accounts should have narrower permissions than human operators. If the runtime is embedded, ordinary customer-review callers should not receive policy-administration authorities.

### 8.2 Required controls

- TLS in transit and managed encryption at rest;
- secrets manager rather than configuration files or database rows for credentials;
- signed release manifests and verified checksums at load time;
- software composition analysis and pinned container/native dependencies;
- input-size, request-rate, solver, and LLM cost limits;
- no prohibited customer or personal data in model prompts;
- allow-listed outbound connectivity from the application and solver;
- backup and restore exercises for the service's database and policy artifacts;
- audit retention, legal hold, and redaction rules;
- explicit fail-closed behavior for missing ontology, invalid release, indeterminate analysis, and signature failure.

### 8.3 Observability and service objectives

Propagate a correlation ID through translation, validation, analysis, approval, publication, and decision execution. Record metrics for:

- validation, DMN compilation, solver, and decision latency;
- solver `SAT`/`UNSAT`/`UNKNOWN`/timeout counts;
- LLM parse and deterministic-validation rejection rates;
- publication and runtime release-load failures;
- active release and ontology versions per instance;
- approval lead time and rollback frequency;
- decision result counts without putting sensitive customer facts in metric labels.

Define separate service objectives for control-plane operations and low-latency decision execution. A model-provider or solver outage must not stop evaluation of the currently active release.

## 9. Delivery Roadmap

Durations below indicate sequencing for one small cross-functional team, not a delivery commitment. Re-estimate after the existing-service assessment and technology spikes. Each phase should be independently deployable and reversible.

### Phase 0 — Discover the service and freeze semantics (1–2 weeks)

**Deliver**

- Complete the baseline discovery checklist in Section 2 with the customer review service maintainers.
- Inventory current automated and manual policies, their owners, inputs, outcomes, effective dates, and precedence.
- Capture representative historical review cases and current expected outcomes without copying prohibited production data into test fixtures.
- Add the three reference scenarios as engine-neutral fixtures:
  - NET_30 with 5% past due → `COMPATIBLE_REFINEMENT`;
  - NET_30 with 15% past due → `CONFLICT` with the global 10% policy;
  - unrestricted high-balance customer with 45 ADP days → `CONFLICT` with the exclusive 30-day policy, including a witness.
- Add negative fixtures for unknown properties, invalid enum values, unit mismatch, inclusive/exclusive boundaries, nulls, and unsatisfiable scopes.
- Define the customer-fact dictionary, canonical IR v1, lifecycle states, error codes, classification semantics, override behavior, and exact-decimal/unit rules.
- Record architecture decisions for integration topology, current-runtime fallback, Java/Spring compatibility, build layout, engine selection criteria, and artifact storage.
- Complete a threat model and data-classification review.

**Exit gate**

Service, business, risk, and engineering owners approve the context map, fact dictionary, policy semantics, and intended decision authority. Current behavior and intentional future changes are distinguishable in the fixture corpus. No production behavior changes in this phase.

### Phase 1 — Add policy boundaries without changing review behavior (3–5 weeks)

**Deliver**

- Add policy domain/application packages or modules within the existing repository without reorganizing unrelated code.
- Add `PolicyDecisionPort`, the customer-facts adapter, and an adapter for the current decision behavior or a no-op implementation.
- Implement the canonical IR, deterministic schema/domain validation, and a manual structured-authoring path.
- Add namespaced database migrations, mappings to existing authorities, audit integration, and outbox integration only where needed.
- Implement policy lifecycle enforcement, immutable revisions, idempotency, optimistic locking, and API/application tests.
- Add server-controlled `disabled` and `shadow` modes, comparison records, metrics, and an immediate kill switch.
- Reuse the existing CI, container, health, telemetry, and dependency-scanning conventions.

**Exit gate**

The feature can be deployed disabled with no public API, event, database-query, latency, or review-outcome regression. In shadow mode, policy results cannot alter workflow. No client can approve or publish an unvalidated revision, and every policy mutation is authorized and audited.

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
- Complete privacy, legal, security, procurement, and model-provider reviews required by the existing service's governance.

**Exit gate**

No model response bypasses schema, ontology, DMN, conflict, or approval gates. Disabling the LLM affects convenience only, not validation, approval, publication, rollback, or execution.

### Phase 6 — Pilot, harden, and roll out (4–8 weeks)

**Deliver**

- Run historical policies and representative customer facts in shadow mode; reconcile semantic differences with the existing process.
- Complete performance, concurrency, failover, backup/restore, disaster recovery, penetration, and access-review tests.
- Define service objectives, alerts, runbooks, on-call ownership, support procedures, and change-management controls.
- Progress through advisory mode, then pilot enforcement for a limited policy domain and bounded cohort using the existing feature-flag mechanism.
- Train authors, reviewers, publishers, auditors, and support staff.

**Exit gate**

Customer review service owners, risk, and business owners sign off on shadow/advisory results and controls. Production readiness review passes, rollback is rehearsed, and the first enforced cohort has explicit success, mismatch, and stop criteria.

## 10. Cross-Engine and Existing-Behavior Conformance

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

## 11. Production-Readiness Definition

The system is ready for a controlled production pilot only when all of the following are true:

- The existing review decision point, authoritative facts, public contracts, and workflow ownership are documented.
- Shadow and advisory comparisons meet agreed mismatch, latency, and error thresholds; every intentional behavior difference has business approval.
- The feature can be disabled without a deployment, and fallback behavior has been tested for release-load and runtime-evaluation failures.
- Existing API/event consumers see no unapproved contract or reason-code changes.
- LLM output can create drafts but cannot approve, publish, or execute anything.
- All required validation and analysis results are tied to exact immutable inputs and engine versions.
- Separation of duties and least-privilege roles are enforced server-side.
- Approved releases are signed/checksummed, reproducible, and atomically activated.
- Runtime evaluations are pinned to a release and remain available during authoring, LLM, or solver outages.
- Conflict witnesses and human overrides are explainable and auditable.
- `UNKNOWN`, timeout, and unsupported semantics fail closed before publication.
- Approved baseline, boundary, negative, property-based, concurrency, rollback, and disaster-recovery tests pass.
- Logs, metrics, traces, and alerts avoid sensitive policy/customer data while retaining useful identifiers.
- Backup restore, rollback, key rotation, access review, and incident runbooks have been exercised.

## 12. Decisions Required Before Implementation

Resolve these through short architecture decision records during Phase 0:

| Decision | Recommended default | Trigger to choose differently |
| --- | --- | --- |
| Application shape | Policy modules in the existing Spring Boot service | Use a companion control plane or decision service for verified ownership, security, dependency, release, or scaling constraints |
| Review workflow authority | Existing review application service | Change only through a separately approved workflow migration |
| Customer fact source | Existing authoritative service fields through an adapter | Add a source only when its ownership, freshness, availability, and data classification are approved |
| Authoritative policy form | Canonical typed IR | None; individual engine formats must remain generated artifacts |
| Existing/prototype policy formats | Input/migration adapters | Remove an adapter after its policies and users have migrated |
| Policy persistence | Additive tables in the existing database | Separate storage for a companion service or explicit data-boundary requirement |
| Ontology storage | Versioned signed artifacts loaded in memory | Add Fuseki/external RDF store for collaborative editing, large datasets, or richer queries |
| DMN runtime | Embedded KIE/Drools behind an interface | Use Kogito service for independent scaling/release ownership or superior verified compatibility |
| Z3 placement | Isolated internal worker/service | Use in-process only if native packaging and resource isolation meet operational requirements |
| LLM output | Strict structured draft JSON | Never accept executable DMN, RDF, or SMT directly from a model |
| Release model | Immutable bundle with atomic active pointer | None; do not mutate active artifacts in place |
| Activation | Human approval plus publisher action | Add two-person approval for high-risk scopes |
| Runtime failure behavior | Preserve the last valid release and use the service's approved fallback | Never infer fail-open/fail-closed behavior without the current business and risk owners |

## 13. Explicit Non-Goals for the First Release

- General natural-language understanding or arbitrary rule syntax.
- General OWL inference as a replacement for explicit business semantics.
- Automatic resolution of business-policy precedence by an LLM or Z3.
- Sending customer portfolios or transaction records to an LLM.
- Calling Z3 during each customer decision.
- Editing active DMN or ontology artifacts in place.
- Starting with independently deployed microservices for every engine.
- Replacing existing review states, public contracts, identity integration, audit infrastructure, or operational tooling without a separate need.
- Replicating the customer or review aggregate in policy storage.
- Renaming existing customer fields to match the reference examples.
- Selecting library versions before verifying compatibility with the maintained Spring Boot application.
- Supporting multiple currencies or unit conversion until those semantics are explicitly designed.

## 14. Immediate Next Sprint

The first sprint should produce an integration brief and executable baseline, not commit to all three engines at once:

1. Walk through the current customer review flow with its maintainer and identify the exact decision point, state owner, fallback, and public side effects.
2. Produce the context map, customer-fact dictionary, current-policy inventory, and API/event compatibility list from Section 2.
3. Convert representative current policies and sanitized historical cases, plus the three reference scenarios, into versioned fixtures.
4. Define `PolicyDecisionPort`, the canonical IR v1, structured JSON schema, lifecycle transitions, error codes, conflict classifications, and `INDETERMINATE` behavior.
5. Add a no-op or current-behavior adapter behind a disabled feature flag to prove the integration seam without changing review outcomes.
6. Build time-boxed compatibility spikes for Jena/SHACL, the candidate DMN runtime, and Z3 using the same ADP policy and one service-specific policy.
7. Decide integration topology and dependency versions from measured compatibility, latency, packaging, and operations results.
8. Draft the threat model, role-to-authority mapping, data classification, release manifest, rollout thresholds, and rollback procedure.
9. Review the brief with service owners, policy owners, risk/compliance, security, data governance, and operations.

The outcome should be a signed-off integration brief, adapter contract, and fixture suite. Full implementation should begin only after the team can show where the capability fits, which current behavior it preserves, how it is disabled or rolled back, and that all three engine adapters can represent the same bounded policy without semantic differences.

## 15. Exploration Provenance

This direction was informed by the [Axiom Policy Reasoner exploration](https://ampcode.com/threads/T-019f5ef7-3be2-7009-9cb6-8b19ac6ff953). That prototype demonstrated a browser-only bounded DSL, ontology-aware validation, and deterministic conflict examples. It did **not** integrate Apache Jena, SHACL, DMN/Kogito/Drools, Z3, a backend, an LLM provider, persistence, authentication, or a production approval workflow. Treat its examples as seed fixtures and design evidence, not production code or an integration contract.
