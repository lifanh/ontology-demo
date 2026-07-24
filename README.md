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

## DMN example: from an approved rule to a decision result

The expanded DMN artifact in the demo shows how the active global ADP rule can cross the runtime boundary. It is intentionally more explicit than a policy spreadsheet:

- **Typed inputs:** the customer-facts adapter supplies `restricted_status` as a string and converts ontology-backed `adp_days` from DAYS into a DMN number.
- **Complete `UNIQUE` table:** mutually exclusive rows cover restricted customers, unrestricted customers below 30 days, and unrestricted customers at or above 30 days. Exactly one rule should match every valid request.
- **Stable typed outputs:** the decision returns an ADP-specific result (`REFER`, `ADP_REQUIREMENT_MET`, or `ADP_REQUIREMENT_NOT_MET`) and a machine-readable reason code instead of mixing numeric limits and workflow instructions in one output column.
- **Evaluation trace:** for the sample customer (`restricted_status = "N"`, `adp_days = 28`), rule 2 matches and returns `ADP_REQUIREMENT_MET / ADP_WITHIN_LIMIT`. The demo shows both successful input comparisons and explains the result in business language; a production audit record would also retain the release ID and decision ID.

The table represents an **approved executable release**, not an LLM response. Candidate rules are first parsed and validated, checked for conflicts, reviewed, and published. Only then are deterministic DMN artifacts loaded by the decision runtime. This result is deliberately scoped: meeting the ADP requirement does not mean that the customer passed other decisions or that the review was approved. DMN reports policy findings; the surrounding customer-review service remains responsible for combining findings and changing workflow state.
