# Deck v2 plan — reframing the slides around business value

Goal: rebuild `slides/slides.md` so the story is **what AI changes for a credit analyst's day**,
told through the v2 demo (`/v2/`, SE prototype direction), with policy creation entering from the
prototype's **Configure rules** button instead of standing as a second, separate product.
Governance stops being the headline and becomes the reason the value is safe to accept.

## Framing

**Spine (one sentence):** every account arrives already triaged, assembled, and explained — the
analyst decides, and when the rule itself is wrong, changes it and sees exactly who is affected.

**Running value spine** (used as a five-chip progress marker across the core deck):

| Chip | Analyst value | Where it lives in the product |
| --- | --- | --- |
| **Triage** | The queue is ordered before anyone opens it | Worklist KPI strip, review-mode pill, auto-cleared tab |
| **Assemble** | The case is built, not gathered | Snapshot, exposure, aging, external, financials, history, files |
| **Justify** | The "why" is checkable in one click | Rules table (value vs threshold), fact definition dialog, drivers |
| **Decide** | Judgment stays with the analyst, and is recorded | Confirm / replace with reason / reopen / history |
| **Adjust** | A wrong threshold is a change you can make and measure | Configure rules → candidate → validation → Review impact |

**Audience:** management plus the credit-review function. The proof is the demo, not the architecture.

## Inherited constraints (do not break)

- Claims boundary (`AGENTS.md`): AI drafts, proposes, and explains. Deterministic code validates,
  compares, evaluates, resolves, calculates. People and the CIS workflow retain approval and
  customer-state authority. The POC mutates browser-tab state only.
- v2 framing: *AI proposes the review result of every account; credit analysts decide.*
- **No quantified value claims.** Nothing in this POC measures hours, cost, loss, or workload, so
  every value slide describes *what changes in the work*, never *how much is saved*. The one number
  the deck may show is the deterministic Review-impact count over the fixed 12-record cohort, with
  its no-extrapolation warning intact.
- Illustrative POC · fictional data label stays on every demo reference.

## Core deck (13 slides)

| # | Kicker · Headline | Message | Visual / source |
| --- | --- | --- | --- |
| 1 | *Customer Review* · **Every account gets a proposed result. Analysts decide.** | Set the frame in one line: this is about the analyst's day, not the model. | Title + one worklist row rendered as the hero (proposal pill + proposed action), from `/v2/` |
| 2 | *The work today* · **The decision is quick. Everything before it is not.** | Where the day actually goes: facts spread across systems, ratios re-derived by hand, rationale rewritten each time, thresholds applied from memory, and a $50,000 capacity line that leaves the rest unreviewed. | Five friction cards; keep the existing capacity funnel from current slide 1 as the fifth card, demoted from hero to evidence |
| 3 | *What changes* · **The account arrives with a conclusion and its evidence** | Before/after of one account's arrival state: blank case vs proposed result + drivers + assembled sections. This is the whole value claim in one picture. | Split panel; right side is a real Ironclad Manufacturing / Cascade Freight proposal from the engine |
| 4 | *The value spine* · **Triage · Assemble · Justify · Decide · Adjust** | The five things the analyst gets, each pointing at a region of the screen. Recurs as a progress marker on slides 5–10. | Five chips over a dimmed screenshot of the v2 detail page with regions highlighted |
| 5 | *Triage* · **The queue sorts itself before anyone opens it** | Auto-cleared accounts stop consuming attention; escalations surface first; every account is covered, not only those over $50,000. | KPI strip + tabs + review-mode pill, live values from `renderKpis` |
| 6 | *Assemble · Justify* · **One screen, and every number can be opened** | The case is assembled (snapshot, exposure with limit-sizing anchor, aging, external, financials, history) and each figure opens its ontology definition, unit, provenance, and the exact rules that used it. | Detail page with the fact dialog and the rules table pulled forward |
| 7 | *Decide* · **The analyst's judgment is the output** | Confirm the proposed result, or replace it with an allowed action and a reason; reopen; the history records it. The proposal is a starting point with an audit trail, not an instruction. | Decision zone + history table |
| 8 | **LIVE · Worklist → review → decide** | Demo A. Script in presenter notes: queue, auto-cleared account, escalation account, open a fact definition, confirm one result, replace one with a reason. | Full-bleed link slide to `/v2/` |
| 9 | *Adjust* · **When the rule is the problem, change the rule** | Configure rules, from the same topbar the analyst already works in: intent in business language → candidate → deterministic validation and compatibility → exactly which accounts change. Threshold debates become evidence instead of opinion. | Three-step strip (Draft · Verify · Assess) rebuilt in the prototype's visual language |
| 10 | **LIVE · Configure rules → impact → back to the queue** | Demo B. NET 30 8% → 5%, validation, compatibility, Review impact over the 12-record cohort, then the worklist badging the rows whose outcome would change. | Full-bleed link slide to `/v2/` Configure rules |
| 11 | *The loop* · **Analyst exceptions become the rule agenda** | Overrides are captured; a repeated override is a policy question; the policy change is assessed against the same engine; the queue reflects it. The system improves from the analysts' own decisions. | Rework of the current feedback-loop slide, redrawn as one product loop rather than two products |
| 12 | *Why this is safe to hand to analysts* · **The proposal is checkable, the authority is not delegated** | The single governance slide: AI proposes and explains; deterministic rules compute and leave a trace; the analyst decides; nothing writes to CIS here. Framed as the reason adoption is possible, not as the subject of the deck. | Condensed from the current trust-boundary + dual-pattern slides |
| 13 | *Next* · **What we would need to run this for real** | Boundary stated honestly, then the discovery ask: workflow, authoritative CIS facts, policy ownership, existing controls, evidence to justify going further. | Reuse the discovery-questions slide, trimmed, with the `NEXT_STEPS.md` link |

Trimming plan if time is short: slides 5–7 collapse into one "the screen, annotated" slide and act as
the fallback if a live demo cannot run.

## Appendix (reused, retitled, unchanged in substance)

1. What is real in this POC (reality table) — the claims anchor; keep verbatim.
2. Architecture poster — production direction, moved out of the core deck.
3. Tier-1 Review Context vs Tier-2 Evidence.
4. Rule Evaluation Trace card.
5. Model contract — the three bounded operations.
6. Failure behavior — deterministic continuity.
7. Review impact math and the 12-record cohort.
8. Responsibility mapping — POC today vs candidate production direction.
9. Reuse to other domains (onboarding and beyond), demoted from core.

## Where the current deck's content goes

| Current slide | New home |
| --- | --- |
| 1 Management problem / capacity funnel | Core 2, as one of five friction cards |
| 2 Protects both sides of the decision | Folded into core 2–3 as framing, not its own slide |
| 3 Trust boundary (can / cannot) | Core 12 (compressed) |
| 4 One pattern, two jobs | Core 11 (redrawn as one loop) + core 12 |
| 5 Architecture poster | Appendix 2 |
| 6 Live demo · Customer Review | Core 8, rewritten against `/v2/` |
| 7 Live demo · Review Policy | Core 10, entered through Configure rules |
| 8 Governed feedback loop | Core 11 |
| 9 Onboarding extension | Appendix 9 |
| 10 Framework reuse | Appendix 9 |
| 11–17 Appendix | Appendix 1, 3, 4, 5, 6, 7, 8 |

Net effect: governance drops from four core slides to one; business value goes from zero dedicated
core slides to six; the two demos become one continuous journey through a single product.

## Product dependencies

The deck as structured demos `/v2/` end to end. Two gaps in v2 today:

1. **Configure rules is a disabled stub** (`v2/index.html`, topbar). Core slides 9–10 need
   **v2-plan Phase 2** — the policy workbench in the prototype's visual language, reusing
   `src/core/authoring.js`, `src/core/governance.js`, and the credit pack scenarios, plus the
   worklist impact badges. Without it, demo B has to jump to the v1 workbench at `/`, which
   undercuts the "one product" framing the reframe depends on.
2. **The v2 proposal panel is scripted, with no model call** (`v2/src/app.js` header comment). A
   deck headlined "AI proposes" should either land **v2-plan Phase 3** (wire the explain endpoints)
   or keep the on-screen "scripted from deterministic results · no model call" label and have the
   presenter say so plainly. Recommendation: Phase 3 before this deck is presented.

Slide links change from `/` to `/v2/`; the v1 demo stays linked only from the appendix, if at all.

## Open questions for the maintainer

- Is the audience management only, or management plus credit analysts? The friction slide is
  written from the analyst's day and reads differently to each.
- Should the v1 demo appear in the deck at all, or be retired from the narrative?
- Build Phase 2 (and Phase 3) before the deck, or present the reframed deck against v1's policy
  workbench in the interim?
