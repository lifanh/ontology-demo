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
