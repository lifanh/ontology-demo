# Customer Credit Review ontology reference

Two reference documents for the target Customer Credit Review ontology. Neither file is executed by
the demo, imported by `src/`, or copied into a deployed site — `scripts/build-site.mjs` assembles
only `src/`, `artifacts/`, `v2/`, and `slides/`, so `docs/` never reaches a host.

## Files

| File | What it is |
| --- | --- |
| `customer_review_ontology.yaml` | The target ontology, version 1.0, derived from the SE vision prototype: 18 entities, 188 attributes, 18 relationships, rules R1–R6, 7 derived metrics, and the 10 UI sections each entity backs. |
| `customer_review_ontology_mapping.md` | Instantiation of those properties against database objects, replayable SQL, and APIs identified during a source review — with an explicit Found / Partial / Not found / External status per property. |

## Source-readiness at the time of the mapping review

57 ontology properties were traced against real sources:

| Status | Count | Meaning |
| --- | --- | --- |
| Found | 22 | A definite object, field, or API is available |
| Partial | 16 | The concept or interface exists, but grain, field contract, or business definition still needs verification |
| Not found | 15 | No confirmable object or API was found in the sources reviewed |
| External | 4 | Requires an external provider or feed |

The mapping document is a **draft**. Every "Found" row still needs runtime verification of structure,
permissions, freshness, and business definition before it can be relied on. It reads no customer
business data; it is a mapping and query plan, not a review result.

## Relationship to this POC

The demo implements a deliberately small, working subset of this ontology: 18 input facts, 10 derived
facts, and 6 illustrative rules in `src/domains/credit/pack.js`, over fictional Narrative Customers.
The subset is what makes the deterministic engine, the fact-definition dialog, and Review impact real
and inspectable end to end. The YAML above is the wider target, and the mapping is the honest account
of which parts of that target have a confirmed source today.

The demo's rule identifiers are its own illustrative policies and do not correspond one-to-one with
the ontology's R1–R6.

## Boundary

These documents name internal systems, tables, and API routes. They are internal references only.
Do not deploy them, and do not treat any table, field, or route named here as verified until it has
been checked at runtime against the current environment.
