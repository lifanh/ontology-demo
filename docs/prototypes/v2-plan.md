# Demo v2 plan — SE prototype as the source of truth

Goal: a second demo whose structure and visual style come from
`docs/prototypes/customer_review_prototype.html`, powered by the same deterministic engine and AI
gateway as the current demo, and including the policy-change workbench. The current demo becomes
**v1 and stays byte-for-byte unchanged**.

## Decisions (each vetoable)

1. **URLs**: v1 stays at `/`; v2 is served at `/v2/`. Swapping v2 onto `/` would contradict
   "v1 keeps unchanged" (URL churn, slides link to `/`).
2. **Repo layout**: new top-level `v2/` directory, same no-build convention as v1:

   ```
   v2/
   ├── index.html        # DOM structure lifted from the prototype
   ├── styles.css        # prototype's inline <style>, extracted verbatim
   └── src/
       ├── access.js     # session gate (same /api/session contract as v1)
       ├── app.js        # worklist + detail wiring
       ├── policy.js     # policy-change workbench (v2-styled)
       └── data.js       # v2-only fictional display data (Tier-2-style sections)
   ```

   `v2/src/*` imports the shared engine read-only via relative paths
   (`../../src/core/runtime.js`, `../../src/domains/credit/pack.js`). The repo and `dist/`
   layouts are identical, so the same import paths work in both. **No v1 file is edited.**
3. **v1 is frozen**: engine changes needed by v2 (if any) must be additive new modules, not edits
   to `src/` files v1 uses. Accepted consequence: some UI glue is duplicated between v1 and v2;
   that is deliberate (a little duplication beats coupling a frozen demo to a moving one).
4. **Fictional names**: the prototype's customer names (Xerox etc.) are real companies. v2 uses
   the existing Narrative Customers plus new fictional records; the prototype's row *shape*
   (relationship tag, territory, terms, risk band, next review) is kept.
5. **Claims reframing** (structure and style stay; copy changes). Agreed framing:
   **AI proposes the review result of every account; credit analysts decide.** Deterministic
   rules and calculations remain authoritative for validation and qualification.
   - "AI decides every account" → AI proposes; credit analysts decide.
   - "AI recommendation" → "AI proposal"; "AI conf." → "proposal conf." (the model's confidence
     in its own proposal, never an authority claim).
   - Review-mode pill mapping: `AUTO_REVIEW_PASS` → "Auto-cleared (rules pass) · view only";
     proposal pending an analyst → "AI proposal"; no proposal available → "Manual".
   - "Confirm & update CIS" / "Adjust & update CIS" → "Complete review" / "Replace with allowed
     action", with the existing browser-tab-state disclaimer. CIS write-back stays in
     `NEXT_STEPS.md`.
   - "UAT" env chip → "Illustrative POC · Fictional data" chip + active policy version.
6. **Data strategy per prototype section**:
   - **Live from the engine**: worklist rows, KPI strip, review-mode pill, banner meta
     (trigger = finding reason codes, recommended limit vs current from the advisory calculator,
     deterministic recommendation), Customer Review Snapshot (ontology facts, each linking to its
     definition and trace), Review Rules detail (evaluation traces), limit-sizing anchor
     (calculator's term-exposure), decision zone (Disposition store, sessionStorage), risk/financial
     factor bars (calculator grade contributions), session history.
   - **Static fictional display data** (`v2/src/data.js`), labeled illustrative, framed as
     Tier-2-style context that cannot change deterministic findings: NACM/D&B panels, ADP/DBT
     extras, relationship roll-up, AR aging, financial-statement viewer, review history table,
     attachments (upload affordances inert or tab-state only).
   - The Global (cross-region) view and currency toggles ship as static reference tables or are
     deferred; no multi-region facts exist.
7. **Policy change in v2**: the prototype's "Configure rules" button becomes the entry to a
   v2-styled policy workbench with the same capabilities as v1's studio (example intents, AI
   draft / example candidate, structured diff, validation, compatibility, review impact), reusing
   `src/core/authoring.js`, `src/core/governance.js`, and the credit pack scenarios. Tie-in the
   prototype makes possible: when a candidate is impact-assessed, the worklist can badge rows
   whose outcome would change (Newly Required Review), directly in the queue.
8. **Server**: `/api/*` endpoints are shared and unchanged. One small addition: redirect `/v2`
   (no trailing slash) to `/v2/`, since the current SPA fallback would otherwise serve v1's
   index. This does not alter any v1 behavior.
9. **Build & deploy**: add `v2` to the allowlist in `scripts/build-site.mjs` (`demoDirectories`).
   Cloudflare/wrangler serve `dist/` as-is — no config change.
10. **Tests**: extend `tests/site.test.mjs` byte-for-byte coverage to `v2/`; add
    `tests/browser-v2.test.mjs` (worklist renders from the engine, decision flow persists and
    resets, policy-change flow, claims copy absent of forbidden implications); keep all v1 tests
    untouched and green.
11. **Docs**: update `AGENTS.md` ownership boundaries (add `v2/` to the demo ownership list, note
    v1 frozen) and `README.md`. Slides unchanged for now; the deck may later link to `/v2/`.

## Phases (each ends demoable)

Status: Phases 0–2 are complete. Phase 1 kept the shared narrative customers (2001–2004)
instead of adding a v2-only dataset — the existing four already read as a queue, so no dataset
change was needed and `src/domains/credit/pack.js` stayed untouched. Prototype-only Tier-2
context (territories, reviewers, history, attachments, NACM/D&B-style data) lives in
`v2/src/context.js`, clearly labeled fictional. Phase 2 assesses the fixed Policy Impact Cohort
for governed evidence, then separately evaluates the same candidate against Narrative Customers
2001–2004 to drive worklist-preview badges without projecting cohort results onto queue accounts.
Tests: `tests/browser-v2.test.mjs`.

**Phase 0 — scaffold and static parity (small)** — done
Extract the prototype into `v2/index.html` + `v2/styles.css` + minimal JS, replace real-company
names and non-compliant copy, serve at `/v2/`, extend build allowlist and site test. Result: the
prototype look-and-feel, claims-safe, deployed next to v1.

**Phase 1 — engine wiring (medium)** — done
Worklist (rows, KPIs, tabs, filters that have backing data) and detail page (banner meta,
snapshot grid with fact/trace links, rules detail from traces, limit-sizing anchor, factor bars)
driven by `createEvaluator` + the credit pack over Narrative Customers; decision zone wired to
the Disposition store with the same session-storage guarantees v1 tests establish. The existing
four Narrative Customers supply the queue; no shared credit-pack data was changed.

**Phase 2 — policy change (medium)** — done
`v2` policy workbench styled in the prototype's visual language, reusing authoring/governance;
active policy version chip in the topbar; candidate impact badges on the worklist. Policy Change
state and reconstructed deterministic evidence remain isolated under the v2 browser-tab storage
prefix. Evidence complete is terminal: the POC does not approve, publish, or activate candidates.

**Phase 3 — AI integration (small/medium)**
Explanation panel wired to the existing explain endpoints with "Re-run explanation"; driver
chips derived from findings; AI-drafted analyst commentary prefill in AI-enabled mode
("AI drafted — edit before completing"); deterministic-only mode shows the same layout without
model calls.

**Phase 4 — optional depth (larger, needs buy-in)**
Promote selected static sections (aging, relationship, external data) to real ontology facts and
rules if the story needs them; otherwise they stay labeled illustrative context.

## Risks and mitigations

- **Prototype is one 90 KB inline file** → split into HTML/CSS/JS once in Phase 0; after that,
  v2 files are the working source and the prototype stays a frozen reference in `docs/prototypes/`.
- **Copy drift back into forbidden claims** → a v2 browser test asserts the reframed wording on
  key surfaces (pill labels, decision buttons, disclaimer present).
- **Engine/glue duplication between v1 and v2** → accepted while v1 is frozen; if v1 is ever
  retired, v2 becomes the only consumer.
- **KPI numbers look small with few customers** → the worklist is explicitly the four-record
  Narrative Customer set, never presented as a portfolio (CONTEXT.md: Narrative Customer, Policy
  Impact Cohort boundaries).

## Verification

Per `AGENTS.md`: `npm test` after each phase (unit, check, build, site, browser incl. new v2
tests); visual inspection of `/`, `/v2/`, and `/slides/`; v1 byte-for-byte assertion is the
regression guard that v1 stayed unchanged.
