# Customer Review Ontology showcase maintenance

## Ownership boundaries

- `index.html`, `styles.css`, `src/`, and `artifacts/` are the independent Customer Review Ontology browser demo served at `/`.
- `slides/` is the Customer Review Ontology Slidev presentation served at `/slides/`.
- Do not make Slidev import, wrap, or boot the demo. The deck may link to `/` in a new tab.
- `NEXT_STEPS.md` is the detailed production integration reference. Slides should summarize it, not duplicate it wholesale.
- `scripts/build-site.mjs` owns the allowlisted deployment assembly. Do not serve the repository root from Cloudflare.

## Claims and terminology

- Describe the current application as an illustrative POC using fictional data and browser-tab state. AI-enabled Node mode makes real model calls through the GitHub Copilot SDK and Hono gateway; deterministic-only mode makes no model calls.
- Do not imply that CIS APIs, Jena, SHACL, DMN, Drools/Kogito, or Z3 run in the current POC. Do not imply that the model validates, compares, evaluates, resolves, approves, activates, or mutates customer state.
- CIS APIs supply authoritative fact values; Customer Review Ontology defines their shared meaning, types, units, provenance, and permitted policy use.
- AI drafts and explains only. Deterministic systems validate, compare, qualify, calculate, and execute. Authorized people and the CIS workflow retain approval and customer-state authority.
- Do not add timelines, funding requests, compliance claims, or autonomous-decision claims without an explicit maintainer request.

## Verification

- Use Node.js 22 or newer and run `npm test` after changes to the demo, deck, build, or dependencies.
- Run `npm run export:pdf` after slide-content or theme changes.
- Visually inspect representative core and appendix slides, plus `/` and `/slides/`, before declaring presentation changes complete.
- Keep dependencies pinned in `package-lock.json` and generated `dist/` and `build/` output untracked.

## Agent skills

### Issue tracker

Issues and PRDs are tracked in GitHub Issues for `lifanh/ontology-demo`. See `docs/agents/issue-tracker.md`.

### Triage labels

Triage uses the default Matt Pocock skill label vocabulary. See `docs/agents/triage-labels.md`.

### Domain docs

Domain documentation uses the single-context layout. See `docs/agents/domain.md`.
