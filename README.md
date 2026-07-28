# Axiom Policy Reasoner Demo

A dependency-free static-browser demonstration of ontology-backed credit policy authoring, deterministic evaluation, governance, and portfolio impact analysis. It preserves the original Axiom workshop and checked-in Jena/SHACL, DMN, and Z3 production-artifact explanations while adding a complete in-memory flow.

## Capabilities

- A versioned credit ontology with 18 source properties and 10 registered derived facts, including a fictional FY2025 USD financial snapshot.
- Stable logical rule IDs, immutable validated revisions, evidence invalidation, semantic conflict analysis, batch gates, and one-session approval/publication.
- One evaluator shared by single-customer and 13-customer batch evaluation.
- Deterministic primary-action resolution, supporting evidence, explicit restriction handling, and statement requirements at the exact $50,000 boundary.
- A clearly advisory illustrative credit-limit calculator with demand/financial/payment traces, guardrails, ranges, and non-mutating human controls.
- Mocked LLM presentation only: it never validates, calculates, resolves actions, approves, or publishes.

Everything resets on refresh. There is no backend, persistence, user model, external model call, or automatic mutation of customer state or credit limits.

## Run

Serve the repository so native ES modules have an HTTP origin:

```sh
python3 -m http.server 8000
```

Then open the served `index.html`. No install or build is required.

## Test

Requires Node.js 22 or newer. The repository pins the expected version in `.node-version`:

```sh
npm ci
npm test
```

The test command runs the domain suite, checks the JavaScript entry points, assembles the combined site, verifies that deployed demo files are byte-for-byte copies of their sources, and checks the Slidev output and asset boundary.

## TDS-Credit Slidev presentation

The executive presentation is a separate Slidev application under `slides/`. It introduces the current illustrative demo, provides speaker notes for the 5% compatible-refinement and 15% conflict paths, and presents a possible production direction around CIS. The deck uses repository-bundled fonts and opens the independent demo in a new tab; it does not import or control the demo runtime.

```sh
npm run slides:dev
```

The production build preserves the demo at `/` and compiles the deck for `/slides/`:

```sh
npm run build
npm run preview
```

`npm run preview` uses Wrangler so local behavior matches Cloudflare Workers static assets. Slidev uses hash-based slide routes under `/slides/`, allowing direct links and refreshes without server-side rewrites. Export the complete core deck and appendix to `build/tds-credit-ontology.pdf` with:

```sh
npm run export:pdf
```

Generated site and PDF output are intentionally not committed. Deploy the assembled `dist/` directory to the configured Cloudflare Worker with `npm run deploy`. Pull requests run the complete validation, retain the PDF as a workflow artifact, and publish a `pr-<number>` Worker preview when Cloudflare credentials are configured.

## Reusable skeleton boundary

`src/core/` is domain-neutral: typed fact registration/contracts, deterministic evaluation and batch comparison, plus revision governance. It intentionally knows no credit property IDs, reason codes, currencies, formulas, or action policy. `src/domains/credit/pack.js` owns the complete credit domain pack: ontology, derivations, rules/releases, resolver, calculator coefficients, scenarios, and fixtures. `src/ui/app.js` composes that pack into the browser experience. This is a deliberately coarse, explicit boundary—not a dynamic plugin framework.

The demo uses one Customer Ontology as the source for rendering, prompt construction, validation, and reasoning. It includes three review scenarios:

- A 5% maximum for NET 30 customers is a compatible refinement of the global 10% maximum.
- A 15% maximum for NET 30 customers conflicts with the global 10% maximum.
- A 45-day ADP maximum for non-restricted, high-balance customers conflicts with the global 30-day maximum.

The interface uses a responsive single-column policy workshop. Ontology properties, sample customer facts, schema version, and active-policy context are presented in the main review flow rather than repeated in a separate sidebar. At narrow widths, ontology cards, workflow actions, decision evidence, and production artifacts reflow for touch and keyboard use.

## From demo to production

The browser demo intentionally uses a bounded, custom validator and reasoner. It proves the trust model without implying that an LLM is the authority: **the LLM proposes, deterministic systems validate and analyze, and a human approves activation**.

The production direction preserves the demo's module boundaries while replacing in-memory evidence and handwritten engines with durable, independently versioned production components:

| Demo capability | Production technology | Why |
| --- | --- | --- |
| JavaScript ontology and property checks | **Apache Jena + SHACL** | Represent the domain as RDF/OWL and validate types, domains, required properties, and relationships using a W3C standard. |
| Bounded DSL, AST, and rule execution | **Canonical typed policy model + DMN/Kogito/Drools** | Generate every executable artifact from one reviewed representation, then publish approved policies as typed, deterministic decision tables. |
| Handwritten scope and interval comparison | **Z3 constraint solver** | Prove overlap and satisfiability for richer conditions and produce concrete examples that demonstrate conflicts. |
| In-memory revisions, evidence, batch gate, and release activation | **Existing identity/workflow/audit services + immutable artifact registry** | Authorize transitions, retain evidence for the exact revision and baseline, qualify a candidate against regression fixtures, and atomically activate or roll back a complete release. |
| Action resolver and advisory calculator | **Separately versioned decision models behind the review-service boundary** | Collect rule findings first, synthesize recommended actions and advisory values deterministically, and leave final disposition and customer mutation to the system of record. |

These production technologies and durable services are **not used by the current static runtime**. They are an incremental path for scaling the same architecture:

1. **Establish shared contracts:** map authoritative source data into a versioned fact dictionary and canonical typed policy model; preserve types, units, null behavior, freshness, and provenance.
2. **Durably govern releases:** persist immutable revisions, authorization, approval and audit evidence, release manifests, atomic activation, and rollback.
3. **Qualify every candidate:** compare the active baseline and candidate with the same evaluator over versioned regression fixtures and approved historical cases; block errors, indeterminate results, and breached impact thresholds.
4. **Standardize execution and synthesis:** deploy approved rule, action-policy, and advisory-calculation decisions through DMN/Kogito/Drools with pinned versions and traceable intermediate findings.
5. **Formalize the ontology:** introduce Jena and SHACL as domain taxonomies and semantic relationships grow beyond the current flat schema.
6. **Expand conflict analysis:** use Z3 for nested conditions, exceptions, effective dates, multiple dimensions, and synthetic conflict witnesses.
7. **Adopt safely:** run disabled, shadow, and advisory modes before any bounded enforcement; keep customer state changes in the existing review workflow.

Jena and SHACL validate semantic meaning, DMN executes approved decisions, and Z3 proves constraint conflicts. The batch harness qualifies a complete candidate release but does not approve it. Recommendation precedence remains explicit, versioned decision logic, while policy activation, final review disposition, and customer mutation remain authorized workflow decisions rather than engine or LLM judgments.

## Apache Jena example: model, validate, and query

The production-artifact section now includes a practical Jena walkthrough built from three checked-in, illustrative files:

- [`artifacts/jena/customer-policy.ttl`](artifacts/jena/customer-policy.ttl) models the fictional Acme customer and the candidate NET 30 5% ratio policy as RDF resources.
- [`artifacts/jena/customer-policy-shapes.ttl`](artifacts/jena/customer-policy-shapes.ttl) uses SHACL Core constraints to check required cardinalities, RDF datatypes, numeric ranges, and the same allowed payment-term enum for customer facts and policy scopes.
- [`artifacts/jena/breached-ratio-policies.rq`](artifacts/jena/breached-ratio-policies.rq) joins customers to ratio policies by payment terms, calculates `pastDueAmount / arBalance`, and returns breached applicable policies.

With Apache Jena command-line tools installed, run the examples from the repository root:

```bash
shacl validate \
  --data artifacts/jena/customer-policy.ttl \
  --shapes artifacts/jena/customer-policy-shapes.ttl

arq \
  --data artifacts/jena/customer-policy.ttl \
  --query artifacts/jena/breached-ratio-policies.rq
```

The supplied graph is expected to conform. A policy scoped to an unsupported term such as `ax:NET_90` fails publication validation even if that resource is asserted to be an `ax:PaymentTerms`; `sh:class` verifies its type while `sh:in` enforces the supported enum. The query is expected to return `customer-1001`, `NET_30_PAST_DUE_MAX_5`, ratio `0.12`, and maximum `0.05`. These files are executable **when run with external Jena tooling**, but the static browser demo only presents excerpts and expected results—it does not bundle or invoke Jena. In a production architecture, SHACL belongs on the ontology/policy authoring and publication path. A successful SHACL report proves graph conformance, not policy compatibility or customer approval. SPARQL can support policy discovery and preflight analysis; the pinned, approved DMN release remains responsible for review-time evaluation and stable reason codes.

## DMN example: transparent customer-review dry run

The expanded runtime artifact shows how a fictional customer ontology object can cross the runtime boundary and be evaluated against six versioned checks:

- the general past-due ratio may not exceed 10% of AR balance;
- the active scoped NET 30 past-due ratio may not exceed 8% of AR balance;
- unrestricted customers must have Average Days to Pay below 30 days;
- high-balance unrestricted customers have a scoped 25-day ADP maximum;
- customers above the $50,000 credit-limit boundary require current financial statements; and
- an explicit combined-risk rule may recommend restricting a currently unrestricted customer.

The example Acme object has a $15,000 past-due amount and $125,000 AR balance, so its ratio is 12%. The deterministic resolver therefore returns `NEED_CREDIT_MANAGER_REVIEW`, with matched rule IDs and stable reason codes for both the general and NET 30 limits. ADP and critical-restriction checks produce no findings. The trace displays the normalized facts, findings, supporting actions, financial/payment grades, and advisory limit calculation rather than presenting only a summary.

The table represents an **approved executable release**, not an LLM response. Candidate rules are first parsed and validated, checked for conflicts, batch evaluated, approved, and published. Only then are deterministic artifacts loaded by the decision runtime. A recommended action or credit limit remains advisory; the surrounding customer-review service owns workflow state and final disposition.

The demo also renders a clearly labeled **mocked LLM-polished explanation** after deterministic evaluation. It is presentation-only, uses no model or network call, and is grounded exclusively in the displayed facts and rule results. It does not calculate ratios, match rules, produce reason codes, or act as the rule engine.
