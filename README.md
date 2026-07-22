# Axiom Decision Review Demo

A dependency-free browser demo of AI-assisted decision-table authoring, deterministic validation, human review, and side-effect-free customer dry runs.

## Run locally

Serve the directory with any static server, for example:

```bash
npx serve .
```

No package installation or build step is required. The generated model response and all customer evidence are fixture-backed and synthetic; the demo does not call an LLM or transmit customer data.

## Trust model

The workflow deliberately separates responsibilities:

1. A human describes the policy.
2. A simulated LLM response proposes constrained decision-table JSON.
3. `decision-engine.js` validates facts, operators, outputs, priorities, and obvious table defects.
4. A human marks the visualized table as reviewed for the current session.
5. The same deterministic FIRST-hit evaluator runs six synthetic customer scenarios.

The model never evaluates customers or activates policy. Every result reports `sideEffects.performed: false`, and the UI states that nothing was saved or submitted.

## Decision contract

The table uses four normalized inputs:

- Evidence state: `complete`, `conflicting`, or `missing`
- Average Days to Pay: integer calendar days, with an inclusive 30-day maximum
- Exception status: `valid`, `invalid`, or `absent`
- Risk level: `low`, `medium`, or `high`

Rows execute in priority order under the `FIRST` hit policy. Exactly 30 days passes the standard threshold; 31 days fails unless a higher-priority exception or escalation row applies.

The six fixtures cover standard approval, approved exception, no exception, conflicting evidence, missing ADP, and high risk. Results show normalized facts, synthetic provenance, the selected row, higher-priority failures, lower rows not evaluated after the first match, grouped findings, final disposition, and next action.

## Tests

Run the pure engine suite and syntax checks with:

```bash
node --test decision-engine.test.js
node --check decision-engine.js
node --check app.js
```

## From demo to production

The browser demo intentionally uses a bounded validator and evaluator. It demonstrates the trust model without implying that the session-only review acknowledgement activates a production policy.

The production direction separates three responsibilities:

| Demo capability | Production technology | Why |
| --- | --- | --- |
| JavaScript fact definitions and contract checks | **Apache Jena + SHACL** | Represent larger domain taxonomies and validate semantic relationships using a W3C standard. |
| Bounded JSON table and FIRST evaluator | **DMN + Kogito/Drools** | Publish approved policies as versioned, interoperable decision tables with managed deployment and rollback. |
| Priority and bounded overlap checks | **Z3 constraint solver** | Prove overlap and satisfiability for richer conditions and produce concrete conflict witnesses. |

These technologies are **not used by the current static runtime**. They are an incremental path for scaling the same architecture:

1. **Productionize the bounded service:** add a versioned policy API, durable approvals, audit records, regression cases, and shadow execution.
2. **Standardize execution:** deploy approved decisions as DMN through Kogito/Drools with testing and rollback.
3. **Formalize the ontology:** introduce Jena and SHACL as domain taxonomies and semantic relationships grow beyond the current flat schema.
4. **Expand conflict analysis:** use Z3 for nested conditions, exceptions, effective dates, multiple dimensions, and conflict witnesses.

Jena and SHACL validate semantic meaning, DMN executes approved decisions, and Z3 proves constraint conflicts. Business precedence and policy activation remain explicit governance decisions rather than engine or LLM judgments.
