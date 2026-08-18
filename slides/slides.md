---
theme: default
title: Customer Review
titleTemplate: '%s · AI proposes every review, analysts decide'
author: Lifan Huang
info: |
  A walkthrough of an AI-assisted customer credit review: a governed rule
  center over a shared ontology, where every account arrives with a proposed
  result and its evidence, and a credit analyst decides.
favicon: /slides/favicon.svg
fonts:
  sans: Manrope
  mono: DM Mono
  local: Manrope,DM Mono
  provider: none
exportFilename: customer-review
transition: fade
mdc: true
routerMode: hash
defaults:
  layout: default
---

<div class="opening-grid">
  <div>
    <p class="kicker">Customer credit review</p>
    <h1>Every account arrives<br><span>already reviewed</span></h1>
    <p class="subtitle">AI proposes the review result of every account. Credit analysts decide.</p>
    <p class="author">Lifan Huang · Illustrative POC · Fictional demo data</p>
  </div>
  <div class="hero-row" aria-label="One worklist row as the analyst receives it">
    <header><span>Worklist</span><b>4 accounts due this cycle</b></header>
    <article>
      <div class="hr-cust"><b>Ironclad Manufacturing</b><span>#2004 · Manufacturing · PA · Terms NET 45</span></div>
      <div class="hr-fig"><small>Past due</small><b class="bad">$20,000</b><span>20% of AR</span></div>
      <div class="hr-fig"><small>Risk</small><b>High Risk</b><span>3.60 / 4</span></div>
      <div class="hr-mode"><i>AI proposal</i><span>proposes: Restrict customer</span></div>
      <div class="hr-open">Review</div>
    </article>
    <footer>The analyst opens a conclusion with its evidence — not a blank case.</footer>
  </div>
</div>

<!--
Open on the change, not the technology. Today an analyst opens an account and starts assembling; here the account is already evaluated, and the row states what the system proposes and why it is worth their time.
Say the frame once and let it carry the deck: AI proposes the review result of every account; credit analysts decide. Deterministic rules and calculations stay authoritative.
The customer on screen is fictional demo data. The portfolio figures on the next slide are real.
-->

---

<p class="kicker">The problem · Real portfolio figures</p>

# 66,000 customers, and a gap on both sides of the line

<div class="gap-split">
  <section class="below">
    <header><b>Below $50,000 credit limit</b><span>Legacy rules outdated and stopped</span></header>
    <div class="gap-figure"><strong>48,400</strong><small>customers</small></div>
    <ul><li>US 40,000</li><li>CA 8,400</li></ul>
    <p>No automated review is running for this segment today.</p>
  </section>
  <div class="gap-line"><span>$50,000</span><i></i><small>the capacity line</small></div>
  <section class="above">
    <header><b>Above $50,000 credit limit</b><span>Manual review, rotated</span></header>
    <div class="gap-figure"><strong>17,600</strong><small>customers</small></div>
    <ul><li>US 15,000</li><li>CA 2,600</li></ul>
    <p>The population keeps growing; the analyst team does not.</p>
  </section>
</div>

<p class="takeaway"><b>Two different failures, one line.</b> Below it, the rules that should run have been switched off. Above it, every review is manual — so reviews are rotated, and coverage is incomplete by design.</p>

<!--
These four numbers are the real portfolio counts: 40,000 and 8,400 below the line in US and CA, 15,000 and 2,600 above it. Everything else in this deck's demo is fictional.
Make both halves of the gap explicit. The segment below the line is not "safe" — it is unreviewed, because the legacy rules were outdated and stopped. The segment above it is reviewed by people whose number is fixed while the population grows.
Do not multiply anything in this deck by these figures. The demo cohorts later are engineered illustrations, not samples of this portfolio.
-->

---

<p class="kicker">The work today</p>

# Every review restarts from zero

<div class="friction-grid">
  <article><b>Evidence is requested, not retrieved</b><span>Analysts ask resellers for financial statements and supporting information, then wait for them to come back.</span></article>
  <article><b>Then combined by hand</b><span>Those materials are reconciled against internal credit, AR, payment, and relationship data, account by account.</span></article>
  <article><b>The same math, re-derived</b><span>Past-due percentage, utilization, days-to-pay against terms, and a limit anchored to demand — recomputed every time.</span></article>
  <article><b>Thresholds live in a document</b><span>The policy exists, but it is applied from memory rather than shown and evaluated on the screen.</span></article>
  <article class="constraint"><b>So reviews get rotated</b><span>With a growing population above $50,000 and a fixed team, reviews are taken in rotation — producing backlog, delays, and incomplete coverage.</span></article>
</div>

<p class="takeaway"><b>Capacity scales only with headcount</b> when every review starts from an empty page, and the same reseller is asked for the same document more than once.</p>

<!--
This is the slide the room should recognize. The first two cards are the expensive ones: the waiting on resellers, and the manual reconciliation once the material arrives.
Rotation is the consequence worth naming out loud — it is not that reviews are done badly, it is that they cannot all be done.
Likely challenge: "How far behind are we?" Not measured here. The proposal is to make coverage visible and raise it, not to assert a backlog number.
-->

---

<p class="kicker">The proposal</p>

# Turn review into a governed capability, not a workload

<div class="pillars">
  <article><span>01</span><b>A configurable rule center</b><small>Thresholds, versions, customer segments, and effective scopes — governed and changeable without a release cycle.</small></article>
  <article><span>02</span><b>A standardized workflow</b><small>One review path with the same evidence, the same allowed actions, and the same record, every time.</small></article>
  <article><span>03</span><b>Automated evidence collection</b><small>Internal credit, AR, payment, and relationship data plus external sources — assembled, so the reseller is asked once.</small></article>
  <article><span>04</span><b>Differentiated policies</b><small>Large, medium, and small customers, and different risk scenarios, no longer share one blunt threshold.</small></article>
  <article><span>05</span><b>AI-assisted analysis</b><small>Historical outcomes, risk drivers, and whether a policy is still reasonable — proposed for a person to judge.</small></article>
</div>

<p class="takeaway"><b>The $50,000 line stops being the policy.</b> Segment and risk decide how much attention an account needs — and the rules that decide are themselves governed, versioned, and inspectable.</p>

<!--
This is the business case in one slide. Each pillar answers a specific failure from the previous slide: the rule center answers the stopped legacy rules, automated evidence answers the reseller round-trips, differentiated policies answer the blunt $50,000 threshold, and the standardized workflow answers inconsistent review.
The word to land is governed. Configurable alone would just move the risk; versions, scopes, and evidence are what make configurability safe.
-->

---

<p class="kicker">How the work divides</p>

# Three lanes, and only two of them need an analyst

<div class="lanes">
  <section class="auto">
    <header><i>Low risk</i><b>Automated</b></header>
    <p>Rules pass, the calculator recommends no change, and the account is cleared and recorded without consuming analyst attention.</p>
    <small>In the demo: <b>Auto-cleared</b> · view only</small>
  </section>
  <section class="assist">
    <header><i>Borderline</i><b>Human-in-the-loop</b></header>
    <p>The account arrives with a proposed result, its drivers, and assembled evidence. The analyst confirms it or replaces it with a reason.</p>
    <small>In the demo: <b>AI proposal</b> · awaiting decision</small>
  </section>
  <section class="manual">
    <header><i>High risk · exceptional</i><b>Analyst control</b></header>
    <p>Restriction triggers, credit-manager routing, and anything unusual stay with a person, with the evidence assembled for them.</p>
    <small>In the demo: <b>Escalation proposed</b></small>
  </section>
</div>

<p class="takeaway"><b>This is how capacity grows without linear headcount:</b> the bottom lane stops arriving in the queue at all, and the middle lane arrives finished enough to check rather than build.</p>

<!--
The three lanes are not a future concept — they are the review modes already visible in the worklist you are about to see. Point that out; it makes the demo the evidence for this slide.
Be careful with the automated lane. It is automated because deterministic rules passed and the calculator recommended no change, not because a model judged it safe.
Likely challenge: "What proportion falls in each lane?" Unknown until the rules run against the real portfolio. That is a discovery question, not a claim.
-->

---

<p class="kicker">The foundation</p>

# One vocabulary underneath every number

<div class="onto-map">
  <section><label>Case &amp; account</label><span>CustomerReview</span><span>CustomerAccount</span><span>FinancialRelationship</span></section>
  <section><label>Exposure &amp; behavior</label><span>ExposureProfile</span><span>ARBalance</span><span>ARAgingSnapshot</span><span>ADPDBTProfile</span></section>
  <section><label>Risk &amp; financials</label><span>RiskAssessment</span><span>FinancialProfile</span><span>FinancialStatement</span></section>
  <section><label>External</label><span>ExternalCreditProfile</span><span>ExternalTradeLine</span></section>
  <section><label>Decision &amp; workflow</label><span>CreditDecision</span><span>ReviewRuleResult</span><span>AIReview</span><span>ReviewHistoryEntry</span><span>AnalystAction</span><span>ReviewDocument</span></section>
</div>

<div class="onto-stats"><div><strong>18</strong><small>entities</small></div><div><strong>188</strong><small>attributes</small></div><div><strong>18</strong><small>relationships</small></div><div><strong>R1–R6</strong><small>review rules</small></div><div><strong>7</strong><small>derived metrics</small></div><div><strong>10</strong><small>screen sections</small></div></div>

<p class="takeaway"><b>This is what makes the rule center possible.</b> A threshold can only be governed, versioned, and scoped to a segment if the thing it constrains has one agreed definition, type, unit, and owner — otherwise “past due %” means three different things in three systems.</p>

<!--
For a management audience the ontology is not a modeling exercise; it is the precondition for everything on the proposal slide. Say that first, then show the entities.
Every derived metric is defined once — total exposure, utilization, past-due percentage, implied cycle exposure, limit change percent, risk band, decision scope. The last one matters commercially: decision scope is financial master plus sharing=Y subsidiaries, which is how the same customer stops being counted twice.
The demo implements a deliberately small working subset of this: 18 input facts, 10 derived facts, and 6 illustrative rules — enough for every figure on screen to open its definition, unit, provenance, and the rules that consumed it.
-->

---

<p class="kicker">The foundation · From concept to source</p>

# Every attribute has one definition and a named source

<table class="onto-source">
  <thead><tr><th>Entity</th><th>Example attributes</th><th>Where the value comes from</th></tr></thead>
  <tbody>
    <tr><td><code>CustomerAccount</code></td><td>customer_id · customer_name · territory · terms · region</td><td>CIS customer master, published to the customer dimension</td></tr>
    <tr><td><code>ARBalance</code></td><td>ar_balance · past_due_amount · past_due_percentage</td><td>Customer credit snapshot, read through the credit API</td></tr>
    <tr><td><code>ExposureProfile</code></td><td>total_exposure · utilization_of_limit</td><td><b>Derived</b> — AR balance plus pending, over the credit limit</td></tr>
    <tr><td><code>FinancialRelationship</code></td><td>financial_master_id · sharing · restricted</td><td>Customer cross-reference, read through the relationship API</td></tr>
    <tr><td><code>ExternalCreditProfile</code></td><td>nacm_risk_score · nacm_dbt · aging_distribution</td><td>External trade-credit feed</td></tr>
    <tr><td><code>ReviewDocument</code></td><td>file_name · uploaded_at · document_status</td><td>Financial-statement attachment service</td></tr>
  </tbody>
</table>

<p class="takeaway"><b>This is what turns a policy sentence into something a system can evaluate.</b> “No more than 10% past due” is enforceable only once past-due percentage has one definition, one unit, and one authoritative source — which is also what lets the same rule mean the same thing in the US and Canada.</p>

<!--
Walk two rows, not six. ARBalance is the one everybody recognizes: past-due percentage is defined once as past due over AR balance, typed as a percentage, and traced to the credit snapshot rather than to whichever report someone opened.
ExposureProfile is the second one to read aloud, because it is derived: total exposure is AR plus pending, and utilization is that over the credit limit. Defining it once in the ontology is what stops three teams computing it three ways.
A full property-by-property source assessment exists behind this — including the parts that still need verification and the few that need an external provider. Offer to walk through it separately rather than putting it on screen.
-->

---

<p class="kicker">In the product</p>

# The queue sorts itself — and every number opens up

<div class="kpi-strip">
  <div class="kpi ai"><small>AI proposal, awaiting decision</small><b>3</b><span>Ready for an analyst</span></div>
  <div class="kpi high"><small>Escalation proposed</small><b>2</b><span>Restrict or manager routing</span></div>
  <div class="kpi soft"><small>Past due over policy limit</small><b>2</b><span>Above 10% of AR</span></div>
  <div class="kpi pass"><small>Auto-cleared (rules pass)</small><b>1</b><span>View only</span></div>
</div>

<div class="screen-split">
  <table class="queue-rows">
    <thead><tr><th>Customer</th><th>Past due</th><th>Risk</th><th>Review mode</th></tr></thead>
    <tbody>
      <tr class="p-high"><td><b>Ironclad Manufacturing</b><span>#2004 · NET 45</span></td><td class="bad">$20,000 <span>20% of AR</span></td><td>High · 3.60</td><td><i class="pill ai">AI proposal</i><span>Restrict customer</span></td></tr>
      <tr class="p-high"><td><b>Cascade Freight</b><span>#2002 · NET 30</span></td><td class="bad">$18,000 <span>18% of AR</span></td><td>Moderate · 1.80</td><td><i class="pill ai">AI proposal</i><span>Credit manager review</span></td></tr>
      <tr class="p-soft"><td><b>Meridian Industrial</b><span>#2003 · NET 30</span></td><td>$1,000 <span>within policy</span></td><td>Not rated</td><td><i class="pill ai">AI proposal</i><span>Request statements</span></td></tr>
      <tr class="p-pass"><td><b>Northwind Components</b><span>#2001 · NET 30</span></td><td>$0 <span>no past due</span></td><td>Low · 1.00</td><td><i class="pill pass">Auto-cleared</i><span>view only</span></td></tr>
    </tbody>
  </table>
  <div class="fact-open">
    <header><b>Past due ratio</b><code>customer.past_due_ratio</code></header>
    <dl>
      <div><dt>Meaning</dt><dd>Past due amount ÷ AR balance</dd></div>
      <div><dt>Type · unit</dt><dd>decimal · percent</dd></div>
      <div><dt>Provenance</dt><dd>Derived from two input facts; a CIS API would supply the source values in production</dd></div>
    </dl>
    <table>
      <thead><tr><th>Policy</th><th>Outcome</th></tr></thead>
      <tbody>
        <tr><td>Past-due exposure limit</td><td class="fail">FINDING</td></tr>
        <tr><td>Critical restriction trigger</td><td class="fail">FINDING</td></tr>
        <tr><td>NET 30 past-due limit</td><td class="na">N/A</td></tr>
      </tbody>
    </table>
  </div>
</div>

<p class="region-strip"><b>One case, twelve sections:</b> Snapshot · Exposure · Profile · History · Risk · External · Rules · Payment · Relationship · AR aging · Financials · Files</p>

<!--
Two halves. On the left, triage: one account needs nobody, and the other three state what is proposed and why they are worth opening. The counts come from the deterministic evaluation, not from data entry.
On the right, the ontology from the previous slides made tangible: click any figure and it opens its definition, unit, provenance, and the exact rules that consumed it — including the rule where it did not apply.
Four fictional accounts, engineered to show four outcomes. Never present them as a portfolio or a sample.
-->

---

<p class="kicker">In the product</p>

# The analyst's judgment is the output

<div class="decide-grid">
  <article class="confirm"><span>Confirm</span><b>Accept the proposed result</b><small>The deterministic action is recorded as reviewed against this policy version.</small></article>
  <article class="replace"><span>Replace</span><b>Choose a different action, with a reason</b><small>From the allowed action vocabulary. The reason is required, and the original proposal stays on record beside it.</small></article>
  <article class="reopen"><span>Reopen</span><b>Undo and re-decide</b><small>The reopen is itself an event in the history, not a silent erase.</small></article>
</div>

<div class="decide-record">
  <b>What gets recorded</b>
  <span>Action outcome</span><i>·</i><span>Override reason</span><i>·</i><span>Policy version</span><i>·</i><span>Evaluation references</span>
</div>

<p class="boundary"><b>Boundary:</b> proposed limits, terms, and dates are view-only, and decisions update this browser tab only. In production an authorized confirmation would flow through the CIS workflow.</p>

<!--
The product's output is the analyst's decision, not the proposal. The proposal is a starting position with an audit trail.
Show the required reason on a replacement. That field is what turns a disagreement into evidence rather than a shrug — it is the raw material for the improvement loop later.
Likely challenge: "Can they override the findings?" No. They replace the resolved action. The findings are objective evaluations of policy against facts and stay visible either way.
-->

---
layout: center
class: live-demo-slide
---

<div class="live-demo">
  <p class="kicker">Walkthrough · Worklist → review → decide</p>
  <h1>What does an account<br><span>look like on arrival?</span></h1>
  <div class="demo-steps">
    <article><b>1</b><span>Triage</span><small>The queue, the KPI strip, and the one account nobody needs to open</small></article>
    <article><b>2</b><span>Check</span><small>Open a figure, read its definition and the rules that used it</small></article>
    <article><b>3</b><span>Decide</span><small>Confirm one result, replace another with a reason</small></article>
  </div>
  <a href="/v2/" target="_blank" rel="noopener noreferrer" class="demo-link">Open Customer Review <b>↗</b></a>
  <p class="demo-note">Illustrative POC · fictional customer data · decisions update one browser tab</p>
</div>

<!--
WALKTHROUGH SCRIPT — CUSTOMER REVIEW
1. Start on the worklist. Read the KPI strip, then the pill column. Northwind is auto-cleared and view-only; say plainly that this account consumed no analyst attention — that is the bottom lane from the tiering slide.
2. Open Ironclad Manufacturing. Banner first: review trigger, recommended limit against current, proposed action, risk band.
3. Scroll to the proposal panel. Read the drivers, not the paragraph. Then jump to Review Rules and show the same numbers as evaluated conditions against their thresholds.
4. Back to the snapshot: click Past due ratio. Definition, unit, provenance, and the exact traces — including the NET 30 rule where it did not apply. This is the ontology slide made real; slow down here.
5. Confirm the result on one account, then replace the result on Cascade Freight with a reason, and show it in the history and back in the queue as Completed.
If anything misbehaves, keep going — the deterministic evidence on the page is the product, and this is an illustration of the target experience.
-->

---

<p class="kicker">In the product · The rule center</p>

# When the rule is the problem, change the rule

<div class="wb-steps">
  <article><span>1</span><b>Say it in business language</b><small>“Customers on NET 30 terms cannot have more than 5% of their AR past due.” Start from an example intent or write your own.</small></article>
  <article><span>2</span><b>See the structured difference</b><small>Scope, threshold, and policy statement, active against candidate — pinned to a named policy version.</small></article>
  <article><span>3</span><b>Earn the evidence</b><small>Three deterministic gates, in order. A conflicting candidate stops at gate two and never produces an impact number.</small></article>
</div>

<div class="wb-evidence">
  <article><b>Validation</b><span>Bounded syntax, stable ID, ontology properties, datatypes, units</span></article>
  <i>→</i>
  <article><b>Compatibility</b><span>Does the candidate conflict with the rules already in force?</span></article>
  <i>→</i>
  <article class="last"><b>Review impact</b><span>Which accounts change outcome — before anything is approved</span></article>
</div>

<a href="/v2/" target="_blank" rel="noopener noreferrer" class="demo-inline">Walkthrough · Configure rules → impact → back to the queue <b>↗</b></a>

<!--
WALKTHROUGH SCRIPT — CONFIGURE RULES
1. From the worklist, open Configure rules. Note the active policy version chip: a candidate is always compared against a named baseline. This is the "versions and effective scopes" pillar, working.
2. Take the tighten-NET-30 example intent and load its candidate. Show the structured diff — scope unchanged, threshold 8% to 5%, restated policy sentence.
3. Run validation, then compatibility: compatible refinement, active 8% to candidate 5%, global maximum 10%.
4. Run Review impact: three additional records require review across the twelve-record boundary cohort, with the changed records named.
5. Optional contrast: load the 8% to 15% relaxation and show it stopping at compatibility as a conflict, with no impact number produced. A blocked candidate is the control working.
6. Return to the worklist for the candidate-preview banner, then say explicitly that the active policy has not changed.
Keep the two numbers apart: the cohort count and the worklist preview are separate deterministic comparisons, and the workbench deliberately does not project one onto the other.
-->

---

<p class="kicker">The payoff</p>

# Review becomes a capability that improves itself

<div class="feedback-loop">
  <article><span>01</span><b>Decide</b><small>An analyst replaces a proposed result and records the reason</small></article>
  <i>→</i>
  <article><span>02</span><b>A pattern appears</b><small>The same override, repeated, is a question about the threshold — not about the analyst</small></article>
  <i>→</i>
  <article><span>03</span><b>Test the change</b><small>Candidate, validation, compatibility, and impact against the same engine</small></article>
  <i>→</i>
  <article><span>04</span><b>See it in the queue</b><small>Preview badges show which accounts would move, before any approval</small></article>
</div>

<div class="outcome-band">
  <b>What that gives the business</b>
  <span>Fewer repeated reseller requests</span><span>Less manual comparison</span><span>Capacity without linear headcount</span><span>Measurable, versioned, auditable</span><span>Regional reuse · US and CA</span><span>Continuous policy calibration</span>
</div>

<!--
Two demos become one product story: the override captured in step one is the input to step three.
Be careful with the claim. A single override does not prove a threshold is wrong — it is evidence worth investigating, and the impact assessment turns it into a decision an owner can make.
The outcome band is the answer to "so what". Note that regional reuse is realistic precisely because the ontology and rule scopes are shared while thresholds are not.
-->

---

<p class="kicker">Why this is safe to adopt</p>

# Useful because it is checkable — safe because authority never moves

<div class="can-cannot">
  <section class="can">
    <span>What makes it useful</span>
    <h3>Assembled, computed, explained</h3>
    <div><b>Assemble</b><small>Internal and external evidence gathered into one case</small></div>
    <div><b>Compute</b><small>Rules, findings, and the advisory limit, deterministically</small></div>
    <div><b>Explain</b><small>The evidence turned into readable rationale and drivers</small></div>
  </section>
  <section class="cannot">
    <span>What never moves</span>
    <h3>Retained by people and CIS</h3>
    <div><b>Facts</b><small>Authoritative values and their shared meaning</small></div>
    <div><b>Controls</b><small>Validation, comparison, and action resolution</small></div>
    <div><b>Choice</b><small>The review decision, and any policy approval</small></div>
  </section>
</div>

<p class="boundary"><b>What we would need next:</b> confirm the review workflow and its actions with the people who run it, verify the source systems read-only against the mapped attributes, and name the owners of thresholds, exceptions, and rollback. The detailed questions are in the appendix.</p>

<!--
This slide belongs here rather than up front: the room has now seen the value, so this answers "can we trust it" instead of pre-empting a question nobody asked yet.
The line that matters: a credible explanation is not proof. The authoritative evidence is always on the page above the paragraph, which is why an analyst can check rather than believe.
Close on the ask. Thirty minutes with the people who run customer reviews, then read-only verification of the contracts already identified in the mapping document.
-->

---

<p class="kicker">Appendix · Current boundary</p>

# What is real in this POC?

<table class="reality-table">
  <thead><tr><th>Label</th><th>What it means here</th></tr></thead>
  <tbody>
    <tr><th>Real</th><td>Deterministic rule evaluation, action resolution, the advisory calculator, candidate validation, compatibility, and Review impact; the access gate and Hono gateway</td></tr>
    <tr><th>Real figures</th><td>Only the portfolio counts on slide 2 (48,400 below and 17,600 above the $50,000 line) and the ontology source-readiness counts</td></tr>
    <tr><th>No model call</th><td>This walkthrough. Proposal prose is rendered from deterministic results; bounded AI operations exist elsewhere in the POC and are not exercised here</td></tr>
    <tr><th>Fictional</th><td>Customers, illustrative policies, external data, boundary cohort, history, and attachments</td></tr>
    <tr><th>Session-only</th><td>Review decisions and policy-change state, in one browser tab</td></tr>
    <tr><th>Absent</th><td>CIS integration, production data, identity and roles, durable audit, customer-state mutation, policy publication</td></tr>
  </tbody>
</table>

<p class="boundary"><b>Approved claim:</b> deterministic code validates, compares, evaluates, and resolves; a person records the final session-scoped decision. Where AI participates, it drafts and explains only.</p>

<!--
This matrix is the source of truth for demo claims. "Real" refers to the operation, not to the surrounding fictional data.
Apache Jena, SHACL, DMN, Drools/Kogito, and Z3 do not run here; they appear only as candidate production directions.
-->

---

<p class="kicker">Appendix · Deterministic evidence</p>

# How is every finding traceable?

<div class="trace-card">
  <header><code>credit-1.4.0/CRITICAL_RESTRICTION@1</code><b>FINDING</b></header>
  <div class="trace-policy"><small>Illustrative policy</small><strong>An unrestricted customer with more than 10% past due, negative operating cash flow, and a current ratio below 1 requires restriction.</strong></div>
  <div class="trace-observations">
    <article><span>Past-due ratio</span><b>20%</b><small>&gt; 10% · PERCENT · matched</small></article>
    <article><span>Operating cash flow</span><b>−$50,000</b><small>&lt; $0 · CURRENCY · matched</small></article>
    <article><span>Current ratio</span><b>0.8</b><small>&lt; 1 · NUMBER · matched</small></article>
  </div>
  <footer><span>Reason: CRITICAL_RESTRICTION_TRIGGER</span><span>Action hint: NEED_TO_RESTRICT</span><span>Ontology + resolver versions pinned</span></footer>
</div>

<p class="takeaway">Policy statement, actual values, operators, thresholds, units, and provenance travel together — which is what makes the analyst's one-click check possible.</p>

<!--
This is the trace behind Ironclad Manufacturing's proposal. The browser formats typed raw values; nothing here is generated text.
Missing or unknown values stay explicit as indeterminate rather than collapsing into a guessed pass or fail.
-->

---

<p class="kicker">Appendix · Review impact</p>

# How is policy impact calculated?

<div class="impact-compare">
  <section><small>Active policy version</small><b>NET 30 maximum: 8%</b><span>Evaluate all 12 fictional boundary records</span></section>
  <i>vs</i>
  <section class="candidate"><small>Candidate revision</small><b>NET 30 maximum: 5%</b><span>Evaluate the same records and compare outcomes</span></section>
  <div><strong>3</strong><b>additional records require review</b><small>Ratios at 6%, 7%, and 8% cross the candidate boundary</small></div>
</div>

<div class="completeness">evaluated · newly required · cleared · changed actions · added/resolved findings · indeterminate · errors · <b>complete</b></div>

<p class="warning"><b>Illustrative cohort:</b> no extrapolation to portfolio volume, staffing, time, cost, or loss. The worklist preview is a separate comparison and is never projected from these records.</p>

<!--
Review impact is deterministic workload evidence, not a model estimate. Equality boundaries are explicit and changed records are listed first.
Any indeterminate result or error makes the assessment incomplete, and an incomplete assessment cannot reach evidence complete.
-->

---

<p class="kicker">Appendix · Model contract</p>

# What can a model actually do here?

<div class="operation-grid">
  <article><code>draft_rule</code><b>Draft</b><span>Two supported policy families only</span><small>NET30_PAST_DUE_MAX<br>HIGH_BALANCE_ADP_MAX</small></article>
  <article><code>explain_review</code><b>Explain</b><span>References deterministic review evidence</span><small>May call bounded, zero-argument evidence lookups</small></article>
  <article><code>explain_policy_analysis</code><b>Explain</b><span>References completed deterministic analysis</span><small>Receives summary evidence — not customer rows</small></article>
</div>

<div class="schema-band"><b>Bounded contract</b><span>Named operations · JSON Schema · closed fields · server-owned prompts and tools · validated references</span></div>
<div class="forbidden-band"><b>Forbidden authority</b><span>No facts, validation result, action, approval, activation, ontology definition, or decision from model output</span></div>

<!--
There is no generic completion endpoint, free SQL, schema exploration, or arbitrary rule authoring. The gateway validates response shape and references and never silently repairs output.
This is the ceiling on what AI is permitted to do — the answer to "what stops it inventing a policy".
-->

---
class: architecture-slide
---

<p class="kicker">Appendix · Target production direction · Not running in this POC</p>

# The full architecture keeps operational authority in CIS

<div class="architecture-poster">
  <section class="architecture-zone experience-zone">
    <header><i>1</i><b>Experience &amp; workflow</b></header>
    <div class="experience-parts">
      <span>Customer Review UI</span><span>Customer Review API / Events</span><span>Identity &amp; roles</span>
    </div>
  </section>

  <section class="architecture-zone cis-zone">
    <header><i>2</i><b>CIS authority</b></header>
    <ul>
      <li>Review application service</li><li>Authoritative customer facts</li><li>Review workflow / state / decision</li><li>Audit</li><li>Customer-state mutation</li>
    </ul>
  </section>

  <div class="cis-core" aria-label="CIS is the authority for facts, workflow, and customer state">
    <div><strong>CIS</strong><span>Authoritative facts<br>workflow · state</span></div>
    <small class="cis-input">facts →</small>
    <small class="cis-output">← result</small>
  </div>

  <section class="architecture-zone runtime-zone">
    <header><i>3</i><b>Review-time runtime</b><small>Approved policies only</small></header>
    <ol>
      <li>Customer facts adapter</li><li>PolicyDecisionPort</li><li>Approved pinned policy release</li><li>Candidate DMN runtime</li><li>Deterministic findings</li><li>Recommendations + advisory calculations</li>
    </ol>
    <p>Fast · deterministic · isolated from authoring</p>
  </section>

  <div class="release-lane" aria-label="Only an immutable approved release crosses from the policy control plane into the review-time runtime"><b>←</b><span>Only immutable approved release</span></div>

  <section class="architecture-zone control-plane-zone">
    <header><i>4</i><b>Policy control plane</b><small>Authoring-time only</small></header>
    <div class="control-sequence">
      <span>Configure rules · policy intent</span><em>↓</em>
      <span class="ai-part">Optional AI structured draft</span><em>↓</em>
      <span>JSON schema + canonical typed policy model</span><em>↓</em>
      <span class="gate-part">Candidate tools<br>Ontology + Jena/SHACL · DMN compiler · Z3 conflict analysis</span><em>↓</em>
      <span>Batch impact qualification</span><em>↓</em>
      <span class="human-part">Policy-release approval by authorized people</span><em>↓</em>
      <span class="release-part">Immutable release publication · rollback</span>
    </div>
    <div class="authoring-services"><b>Authoring services</b><span>Approved model provider · optional RDF store</span></div>
    <p><b>AI + Z3</b> never enter the review-time path</p>
  </section>

  <section class="architecture-zone platform-zone">
    <header><i>5</i><b>Platform services</b></header>
    <div>
      <span>Existing review DB</span><span>Artifact storage</span><span>Secrets manager</span><span>Observability</span>
    </div>
  </section>
</div>

<p class="architecture-rule"><b>AI drafts. Deterministic systems verify. Authorized people approve.</b> CIS retains operational and customer-state authority.</p>

<!--
Only open this if the room asks how it would really be built. Start in the centre: CIS is authoritative for facts, review workflow, decision, audit, and customer state.
Jena/SHACL, DMN, and Z3 are candidate production components; none runs in the current POC.
-->

---

<p class="kicker">Appendix · Production discovery</p>

# What must discovery answer?

<div class="discovery-questions">
  <article><b>Workflow</b><span>What triggers a review, what do analysts inspect, and what does each action mean operationally?</span></article>
  <article><b>Segmentation</b><span>How should large, medium, and small customers be defined, and what happens to the stopped legacy rules below $50,000?</span></article>
  <article><b>Facts and APIs</b><span>Which CIS and warehouse sources are authoritative, fresh, and available read-only?</span></article>
  <article><b>Policy ownership</b><span>Who owns thresholds, exceptions, approval, and rollback — and at what scope?</span></article>
  <article><b>Controls</b><span>Which identity, audit, approval, and retention controls already exist to reuse?</span></article>
  <article><b>Evidence</b><span>Which sanitized cases would justify going beyond a POC?</span></article>
</div>

<p class="next-steps-note">A fuller set of production integration questions — data contracts, controls, and phased gates — is written up and available on request.</p>

<!--
Name what this POC cannot tell us. It demonstrates a working pattern over fictional data and a mapped ontology; it does not know how this team actually runs a review.
The segmentation question is the commercially important one: the population below $50,000 is currently unreviewed, and deciding what should run there is a policy decision, not a technical one.
-->
