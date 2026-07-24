# Axiom Policy Reasoner Demo

A dependency-free, interactive demo of ontology-aware policy generation, deterministic DSL validation, and semantic rule comparison.

## Run locally

Serve the directory with any static server, for example:

```bash
npx serve .
```

The demo uses one Customer Ontology as the source for rendering, prompt construction, validation, and reasoning. It includes three review scenarios:

- A 5% maximum for NET 30 customers is a compatible refinement of the global 10% maximum.
- A 15% maximum for NET 30 customers conflicts with the global 10% maximum.
- A 45-day ADP maximum for non-restricted, high-balance customers conflicts with the global 30-day maximum.

The interface uses a responsive single-column policy workshop. Ontology properties, sample customer facts, schema version, and active-policy context are presented in the main review flow rather than repeated in a separate sidebar. At narrow widths, ontology cards, workflow actions, decision evidence, and production artifacts reflow for touch and keyboard use.

## From demo to production

The browser demo intentionally uses a bounded, custom validator and reasoner. It proves the trust model without implying that an LLM is the authority: **the LLM proposes, deterministic systems validate and analyze, and a human approves activation**.

The production direction separates three responsibilities:

| Demo capability | Production technology | Why |
| --- | --- | --- |
| JavaScript ontology and property checks | **Apache Jena + SHACL** | Represent the domain as RDF/OWL and validate types, domains, required properties, and relationships using a W3C standard. |
| Bounded DSL, AST, and rule execution | **DMN + Kogito/Drools** | Publish approved policies as reviewable decision tables with typed expressions, versioned deployment, and deterministic execution. |
| Handwritten scope and interval comparison | **Z3 constraint solver** | Prove overlap and satisfiability for richer conditions and produce concrete examples that demonstrate conflicts. |

These technologies are **not used by the current static runtime**. They are an incremental path for scaling the same architecture:

1. **Productionize the bounded service:** add a versioned policy API, approvals, audit records, regression cases, and shadow execution.
2. **Standardize execution:** deploy approved decisions as DMN through Kogito/Drools with testing and rollback.
3. **Formalize the ontology:** introduce Jena and SHACL as domain taxonomies and semantic relationships grow beyond the current flat schema.
4. **Expand conflict analysis:** use Z3 for nested conditions, exceptions, effective dates, multiple dimensions, and conflict witnesses.

Jena and SHACL validate semantic meaning, DMN executes approved decisions, and Z3 proves constraint conflicts. Business precedence and policy activation remain explicit governance decisions rather than engine or LLM judgments.

## Apache Jena example: model, validate, and query

The production-artifact section now includes a practical Jena walkthrough built from three checked-in, illustrative files:

- [`artifacts/jena/customer-policy.ttl`](artifacts/jena/customer-policy.ttl) models the fictional Acme customer and the approved NET 30 5% ratio policy as RDF resources.
- [`artifacts/jena/customer-policy-shapes.ttl`](artifacts/jena/customer-policy-shapes.ttl) uses SHACL Core constraints to check required cardinalities, RDF datatypes, numeric ranges, and allowed payment terms.
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

The supplied graph is expected to conform. The query is expected to return `customer-1001`, `NET_30_PAST_DUE_MAX_5`, ratio `0.12`, and maximum `0.05`. These files are executable **when run with external Jena tooling**, but the static browser demo only presents excerpts and expected results—it does not bundle or invoke Jena. In a production architecture, SHACL belongs on the ontology/policy authoring and publication path. A successful SHACL report proves graph conformance, not policy compatibility or customer approval. SPARQL can support policy discovery and preflight analysis; the pinned, approved DMN release remains responsible for review-time evaluation and stable reason codes.

## DMN example: transparent customer-review dry run

The expanded DMN artifact shows how a fictional customer ontology object can cross the runtime boundary and be evaluated against four approved checks:

- restricted status routes restricted customers for referral;
- the general past-due ratio may not exceed 10% of AR balance;
- the scoped NET 30 past-due ratio may not exceed 5% of AR balance; and
- unrestricted customers must have Average Days to Pay below 30 days.

The example Acme object has a $15,000 past-due amount and $125,000 AR balance, so its ratio is 12%. The deterministic dry run therefore returns `REVIEW_REQUIRED`, with matched rule IDs and stable reason codes for both the general and NET 30 limits. Restricted-status and ADP checks produce no findings. The trace displays every normalized input, comparison, scope, matched rule, scoped finding, and reason code rather than presenting only a summary.

The table represents an **approved executable release**, not an LLM response. Candidate rules are first parsed and validated, checked for conflicts, reviewed, and published. Only then are deterministic DMN artifacts loaded by the decision runtime. `REVIEW_REQUIRED` is a policy-review result, not a final rejection or approval; the surrounding customer-review service owns workflow state and final disposition.

The demo also renders a clearly labeled **mocked LLM-polished explanation** after deterministic evaluation. It is presentation-only, uses no model or network call, and is grounded exclusively in the displayed facts and rule results. It does not calculate ratios, match rules, produce reason codes, or act as the rule engine.
