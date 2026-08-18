# Aligning the demo with the SE Customer Review prototype

Comparison of `docs/prototypes/customer_review_prototype.html` (SE vision, 2026-08) with the
current demo (`index.html`, `src/ui/app.js`), and the alignment work it suggests.

## What the prototype shows

**Worklist screen**
- Region scope toggle: *Current Region · US* worklist vs a read-only *Global* cross-region view.
- Filter bar: company #, review date range, customer #/name, status, credit analyst, analyst
  manager, director, current reviewer.
- KPI strip: needs manual review · past due > $50k · AI-assisted awaiting confirm · full-auto
  cleared · due this cycle.
- Worklist tabs with counts: My worklist / All due / Full-auto / Completed.
- Row columns: customer (+ MASTER/SUB/SINGLE relationship tag, territory, terms), credit limit,
  past due (with > $50k / $25–50k bands), risk band + numeric score, review-mode pill
  (Manual / AI-assisted / Full-auto, with AI confidence), next review date, Review button.
  Priority is a colored left border.

**Detail page**
- Banner: cust # — name, status badge, Export Review; five meta fields: review trigger,
  recommended limit (vs current), recommended terms, AI recommendation (+ risk band),
  current reviewer (+ next review date).
- Anchor subnav: AI Review · History · Risk · External · Rules · ADP/DBT · Relationship ·
  AR Aging · Financials · Files.
- Left column: Customer Review Snapshot (metric grid; every figure jumps to its detail section),
  Exposure & Purchases (with a "limit-sizing anchor: monthly purchases × terms days" callout),
  Credit & Financial Profile, Attachments (upload + drag-drop).
- Right column: **AI Review & Recommendation** panel — conclusion with tone, driver chips (▲/▼),
  sectioned evidence (payment behavior, financials, external signals, relationship & exposure),
  narrative, recommendation cards (new limit / terms / next review), then an
  **AI pre-filled, analyst-editable decision form** (new limit, terms, next review date, score
  override, commentary) and actions: Confirm & update CIS · Adjust & update CIS · Request
  Financial Statements · Forward To Reviewer (CIS task) · Decline. Header shows AI confidence and
  a "Re-run AI Review" button.
- Full-width sections: Review History & Notes, Risk Score breakdown (factor bars → weighted
  band), External Data (NACM · D&B), Review Rules detail (R1–R6 PASS/FAIL table), ADP/DBT detail,
  Financial Relationship Roll-up (region + currency toggles), AR Aging, Financial Statement
  viewer (view only; BS/IS/CF/ratio tabs).

## Language that must be reframed, not copied

The prototype's framing ("AI decides every account", "AI recommendation", "full-auto cleared",
"Confirm & update CIS") conflicts with this repository's claims boundaries (see `AGENTS.md`):
AI drafts and explains only; deterministic rules and calculators validate, compare, qualify, and
calculate; people and the CIS workflow keep approval and customer-state authority; the POC
mutates browser-tab state only.

The mapping that preserves both the prototype's shape and our boundaries:

| Prototype concept | Demo concept |
| --- | --- |
| "AI recommendation" per account | Deterministic recommendation (action resolution), already implemented |
| "AI confidence" | Not applicable to deterministic outcomes; can label AI *explanation* availability instead |
| Review mode pill: Full-auto / AI-assisted / Manual | Derived from the deterministic action: `AUTO_REVIEW_PASS` → auto-cleared (view only); findings needing a person → manual; AI explanation available → assisted |
| "AI pre-filled — edit before you confirm" decision form | AI *drafts* the decision fields; the analyst edits; deterministic validation and the human decision remain authoritative. This matches the existing draft/Disposition flow |
| "Confirm & update CIS" | "Complete review" with the existing browser-tab-state disclaimer; production CIS write-back stays a `NEXT_STEPS.md` topic |
| "Re-run AI Review" | Re-run AI explanation (AI-enabled mode) |

## Gap analysis vs the current demo

Already aligned: worklist-first layout, priority/status/owner queue, deterministic
recommendation as the case headline, rule-detail table (our Policy evaluation traces are richer
than the prototype's R1–R6 table), advisory credit-limit calculation, accept/replace decision
with reason, assignee/forward, request-information and escalate, session activity.

Missing or different, grouped by effort:

### Phase 1 — worklist alignment (small, high visual impact)

1. **KPI strip** above the queue, derived from deterministic results + workflow state:
   needs manual review · request financial statements · auto review pass · open cases.
   Data already exists in `renderReviewQueue` (`src/ui/app.js`).
2. **Queue columns**: add credit limit, past due amount + ratio band, and next-review date to the
   queue table; render priority as a colored left border like the prototype.
3. **Review-mode pill** per row (Auto-cleared / Needs analyst / Assist available) derived from
   the deterministic action, replacing nothing — it complements the recommendation column.
4. **Worklist tabs with counts** (My worklist / All / Completed) instead of, or in front of, the
   `View` dropdown.

### Phase 2 — case detail alignment (medium)

5. **Banner meta row**: review trigger (finding reason codes), recommended limit vs current
   (advisory calculator already computes this), terms, deterministic recommendation, next review.
6. **Customer Review Snapshot** grid as the Overview lead: AR balance, past due amount/ratio,
   terms, ADP, credit limit, utilization, statement status — each figure linking to its fact
   definition and evaluation trace. This is where the ontology story (shared meaning, types,
   units, provenance) becomes visible, and it is *stronger* than the prototype's plain grid.
7. **Limit-sizing anchor callout** in the calculation section: the calculator already computes
   `termExposure = monthly run rate × term days / 30`; surface it the way the prototype does.
8. **AI-drafted decision form**: in AI-enabled mode, let the AI draft the override commentary /
   reason field ("AI drafted — edit before completing"), mirroring the prototype's pre-filled
   form while keeping the draft/edit/human-complete flow. The draft endpoint pattern already
   exists for policy candidates.
9. **Driver chips** on the explanation panel: compact ▲/▼ chips from findings (fact, observed
   value vs threshold) above the narrative. Derivable from evaluation traces today.
10. **Review history**: render the existing illustrative Disposition history + session events as
    the prototype's history table.
11. **Risk/financial factor bars**: visualize the calculator's `contributions`
    (current ratio, debt/equity, EBITDA margin, OCF margin, net margin → strong/acceptable/
    watch/weak) as the prototype's scored factor bars with the overall grade.

### Phase 3 — new fictional data surface (large; maintainer decision)

12. **External data (NACM · D&B), relationship roll-up, AR aging, financial statement viewer**:
    all need new fictional facts. Natural fit: model as Tier-2 Evidence (context the AI may cite
    but that cannot change deterministic findings) plus new ontology facts where rules should see
    them. Substantial data-modeling work; propose only with explicit maintainer buy-in.
13. **Region/global scope + currency toggles**: requires multi-region fictional data; currently
    out of scope for the single-region narrative set.
14. **Attachments / file upload**: workflow surface without deterministic meaning in the POC;
    if added, browser-tab state only.

Not planned: "Configure rules" in the prototype is a button stub; our Review Policy workbench
already exceeds it. Export Review, email flows, and CIS task hand-off remain production topics in
`NEXT_STEPS.md`.

## Verification expectations

Any implemented phase follows `AGENTS.md`: `npm test` (unit, check, build, site, browser),
visual inspection of `/` in both deterministic and AI-enabled modes, and no new claims language
outside the approved framing.
