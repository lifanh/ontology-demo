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
| 5 | *Triage* · **The queue sorts itself before anyone opens it** | Auto-cleared accounts stop consuming attention; escalations surface first; every account is covered, not only those over $50,000 — and the topbar names the policy version every row was judged under. | KPI strip + tabs + review-mode pill + Active policy chip, live values from `renderKpis` |
| 6 | *Assemble · Justify* · **One screen, and every number can be opened** | The case is assembled (snapshot, exposure with limit-sizing anchor, aging, external, financials, history) and each figure opens its ontology definition, unit, provenance, and the exact rules that used it. | Detail page with the fact dialog and the rules table pulled forward |
| 7 | *Decide* · **The analyst's judgment is the output** | Confirm the proposed result, or replace it with an allowed action and a reason; reopen; the history records it. The proposal is a starting point with an audit trail, not an instruction. | Decision zone + history table |
| 8 | **LIVE · Worklist → review → decide** | Demo A. Script in presenter notes: queue, auto-cleared account, escalation account, open a fact definition, confirm one result, replace one with a reason. | Full-bleed link slide to `/v2/` |
| 9 | *Adjust* · **When the rule is the problem, change the rule** | Configure rules, from the same topbar the analyst already works in: business intent → candidate → deterministic validation, compatibility, and Review impact. Threshold debates become evidence instead of opinion. | The shipped workbench's own three numbered steps: *1 · Example policy intents*, *2 · Structured policy diff*, *3 · Deterministic evidence sequence*, plus the three evidence cards |
| 10 | **LIVE · Configure rules → impact → back to the queue** | Demo B. Tighten NET 30 8% → 5%: validation, `COMPATIBLE_REFINEMENT`, then **3 additional records require review** over the 12-record cohort. Optionally the 15% conflict case, which blocks at compatibility. | Full-bleed link slide to `/v2/` Configure rules · see the demo-script constraints below |
| 11 | *The loop* · **Analyst exceptions become the rule agenda** | Overrides are captured; a repeated override is a policy question; the candidate is assessed against the same engine; the queue shows the preview badge before anything is approved. The system improves from the analysts' own decisions. | Rework of the current feedback-loop slide, redrawn as one product loop, ending on the candidate-preview badge |
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

## Product dependencies — rechecked against `main` (Phase 2 merged, PR #60)

**Resolved.** Configure rules is no longer a stub. `v2/src/policy.js` ships the Policy Change
workbench in the prototype's visual language: example intents, `Draft with AI` (a real bounded
`draft_rule` call in AI-enabled mode) or `Use example candidate`, an editable DSL with a structured
active-vs-candidate diff, the three-stage evidence sequence (validation → compatibility → Review
impact), and the Evidence-complete boundary. The topbar gained an **Active policy** version chip,
the worklist gained candidate-preview badges and a candidate-impact notice, and Policy Change state
is isolated under the v2 storage prefix. The one-product framing the reframe depends on now exists.

**Still open.** The review-side proposal panel is still scripted with no model call (`v2/src/app.js`
header). AI is real on the policy side only. Either land Phase 3 or have the presenter say plainly,
at slide 8, that the review proposal is deterministic prose while the policy draft is a live model
call. Recommendation unchanged: Phase 3 before this deck is presented.

### Demo-script constraints for slide 10 (verified against the engine)

Numbers below are deterministic outputs of the merged code, not estimates.

| Example intent | Compatibility | Cohort impact | Narrative worklist badges |
| --- | --- | --- | --- |
| Tighten NET 30 · 8% → 5% | `COMPATIBLE_REFINEMENT` | **3 additional records require review** | none |
| Relax NET 30 · 8% → 15% | `CONFLICT` (blocks) | 1 record no longer requires review | none |
| Tighten ADP · 25 → 20 days | `COMPATIBLE_REFINEMENT` | **3 additional records require review** | none |
| Relax ADP · 25 → 45 days | `CONFLICT` (blocks) | 2 records no longer require review | none |

**None of the four shipped example intents badges a worklist account.** The badge feature works;
the narrative accounts simply do not sit near those boundaries. Northwind has no past due, Cascade
already breaches the 10% global rule so its action does not move, and neither Cascade nor Ironclad
clears the high-balance ADP scope, which requires AR strictly above $100,000 (both sit at exactly
$100,000). So the ADP family can never badge the queue with the current narrative set.

The one candidate that does badge: hand-edit the NET 30 DSL to **2%**. Meridian Industrial (2.5%
past due) gains `NET30_PAST_DUE_LIMIT_EXCEEDED` and is badged **Candidate Finding Added**. Its
primary action stays `REQUEST_UPDATED_FINANCIAL_STATEMENTS`, so this is a finding change, not a
review-path change — worth saying out loud rather than overselling the badge.

Three options for slide 10, in the order I would pick them:

1. **Script it as-is**: run the 5% example for the governed cohort evidence, then edit the DSL to 2%
   and return to the worklist for the badge. Two edits, no code change, and the DSL edit doubles as
   proof that the analyst is not limited to canned examples.
2. **Add a fifth example intent** at 2% (`v2/src/policy.js` `scenarioMeta` + `scenarios` in the
   credit pack) labelled as the worklist-preview example. Cleanest demo, small shared-pack change.
3. **Drop the badge from the demo** and show it as a still on slide 11. Weakest — the badge is the
   moment that closes the loop back to the queue.

Whichever is chosen, keep the two numbers separate on stage. The workbench deliberately does not
project cohort results onto worklist accounts; they are two distinct deterministic comparisons, and
conflating them would restate exactly the extrapolation the cohort warning forbids.

## Open questions for the maintainer

- Is the audience management only, or management plus credit analysts? The friction slide is
  written from the analyst's day and reads differently to each.
- Should the v1 demo appear in the deck at all, or be retired from the narrative?
- Land Phase 3 (real model call on the review proposal) before presenting, or present with the
  scripted-proposal caveat stated on stage?
- For slide 10, which badge option above — script the 2% DSL edit, add a fifth example intent, or
  drop the badge to a still?
