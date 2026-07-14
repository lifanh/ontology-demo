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
- A 45-day ADP maximum for strategic, high-balance customers conflicts with the global 30-day maximum.
