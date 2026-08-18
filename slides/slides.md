---
theme: default
title: Customer Review
titleTemplate: '%s · AI proposes every review, analysts decide'
author: Lifan Huang
info: |
  A walkthrough of an illustrative POC in which every account arrives with a
  proposed review result and its evidence, and a credit analyst decides.
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
    <p class="author">Lifan Huang · Illustrative POC · Fictional data</p>
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
Everything on screen is fictional. Do not quote volumes, savings, or timelines — this POC measures none of them.
-->

---

<p class="kicker">The work today</p>

# The decision takes minutes. Getting to it takes the day.

<div class="friction-grid">
  <article><b>The facts are scattered</b><span>AR aging, statements, order history, external files, and last cycle's notes each live somewhere else.</span></article>
  <article><b>The same math, by hand</b><span>Past-due percentage, utilization, days-to-pay against terms, a limit anchored to demand — recomputed per account.</span></article>
  <article><b>The rationale is rewritten</b><span>Every analyst writes the “why” from scratch, so two similar accounts can read very differently.</span></article>
  <article><b>Thresholds live in a document</b><span>“More than 10% past due” is policy, but it is applied from memory rather than shown on the screen.</span></article>
  <article class="constraint"><b>So capacity draws a line</b><span>Attention is prioritized to customers above a <b>$50,000</b> credit limit. That is operational triage — not a statement that the rest are safe.</span></article>
</div>

<p class="takeaway"><b>The bottleneck is not judgment.</b> It is everything an analyst must assemble before judgment can start.</p>

<!--
This is the slide the room should recognize. Ask them which of the five they feel most; that answer tells you which part of the demo to slow down on.
The $50,000 line is deliberately framed as capacity triage. It does not prove lower-limit customers are safe or higher-limit customers are risky.
Likely challenge: "How many reviews are we missing?" We have not measured that. The proposal is to make the demand visible, not to assert a number.
-->

---

<p class="kicker">What changes</p>

# The account arrives as a proposed result

<div class="arrival-compare">
  <section class="before">
    <small>How a case starts today</small>
    <h3>A row and a customer number</h3>
    <ul>
      <li>Open the account</li>
      <li>Pull statements, aging, history</li>
      <li>Recompute the ratios</li>
      <li>Recall which thresholds apply</li>
      <li>Then form a view</li>
    </ul>
  </section>
  <i>→</i>
  <section class="after">
    <small>How a case starts here</small>
    <h3>A conclusion you can check</h3>
    <div class="prop-card">
      <header><b>Proposal</b><span>Ironclad Manufacturing · #2004</span></header>
      <p>Critical restriction trigger: past due <b>20%</b> of AR, operating cash flow <b>−$50,000</b>, current ratio <b>0.8</b>. Proposes <b>Restrict customer</b>; the calculator sizes a reduced limit of <b>$75,000</b> against a current <b>$100,000</b>.</p>
      <div class="drv-row"><span class="drv">▼ Past-due exposure limit · 20% vs &gt; 10%</span><span class="drv">▼ Critical restriction trigger</span><span class="drv neu">● Calculator: decrease to $75,000</span></div>
    </div>
  </section>
</div>

<p class="takeaway"><b>The analyst's first act changes</b> from gathering to checking — and checking is where their expertise actually pays.</p>

<!--
This is the whole value claim in one picture. Everything on the right is produced from the same deterministic evaluation the analyst can open line by line.
The proposal text in this walkthrough is rendered from those deterministic results; it is not a model call. The design places AI at drafting and explaining, which is exactly the part that must stay checkable.
Likely challenge: "What if the proposal is wrong?" Then the analyst replaces it with a reason, and that override becomes visible evidence — slide 7 and slide 11.
-->

---

<p class="kicker">The value spine</p>

# Five things the analyst gets

<div class="value-spine">
  <article><span>01</span><b>Triage</b><small>The queue is ordered before anyone opens it</small><i>Worklist · KPI strip · review-mode pill</i></article>
  <article><span>02</span><b>Assemble</b><small>The case is built, not gathered</small><i>Review detail · twelve sections</i></article>
  <article><span>03</span><b>Justify</b><small>Every figure opens its definition and its rule</small><i>Fact definition · evaluation traces</i></article>
  <article><span>04</span><b>Decide</b><small>Judgment stays with the analyst, and is recorded</small><i>Decision zone · review history</i></article>
  <article><span>05</span><b>Adjust</b><small>A wrong threshold becomes a change you can measure</small><i>Configure rules · Review impact</i></article>
</div>

<p class="takeaway"><b>Four of the five are about the work around the decision.</b> The fifth is what makes the system improve instead of ossify.</p>

<!--
Use this as the map. The next six slides walk the spine in order, and the marker at the top of each shows where you are.
If you only have ten minutes, show Triage and Adjust: the first is the daily relief, the second is the reason this does not become another frozen rules engine.
-->

---

<div class="value-spine mini"><span class="on">01 Triage</span><span>02 Assemble</span><span>03 Justify</span><span>04 Decide</span><span>05 Adjust</span></div>

# The queue sorts itself before anyone opens it

<div class="queue-mock">
  <div class="kpi-strip">
    <div class="kpi ai"><small>AI proposal, awaiting decision</small><b>3</b><span>Ready for an analyst</span></div>
    <div class="kpi high"><small>Escalation proposed</small><b>2</b><span>Restrict or manager routing</span></div>
    <div class="kpi soft"><small>Past due over policy limit</small><b>2</b><span>Above 10% of AR</span></div>
    <div class="kpi pass"><small>Auto-cleared (rules pass)</small><b>1</b><span>View only</span></div>
  </div>
  <table class="queue-rows">
    <thead><tr><th>Customer</th><th>Credit limit</th><th>Past due</th><th>Risk</th><th>Review mode</th></tr></thead>
    <tbody>
      <tr class="p-high"><td><b>Ironclad Manufacturing</b><span>#2004 · NET 45</span></td><td>$100,000</td><td class="bad">$20,000 <span>20% of AR</span></td><td>High Risk · 3.60</td><td><i class="pill ai">AI proposal</i><span>proposes: Restrict customer</span></td></tr>
      <tr class="p-high"><td><b>Cascade Freight</b><span>#2002 · NET 30</span></td><td>$100,000</td><td class="bad">$18,000 <span>18% of AR</span></td><td>Moderate Risk · 1.80</td><td><i class="pill ai">AI proposal</i><span>proposes: Credit manager review</span></td></tr>
      <tr class="p-soft"><td><b>Meridian Industrial</b><span>#2003 · NET 30</span></td><td>$90,000</td><td>$1,000 <span>within 10% policy</span></td><td>Not rated</td><td><i class="pill ai">AI proposal</i><span>proposes: Request updated financial statements</span></td></tr>
      <tr class="p-pass"><td><b>Northwind Components</b><span>#2001 · NET 30</span></td><td>$60,000</td><td>$0 <span>no past due</span></td><td>Low Risk · 1.00</td><td><i class="pill pass">Auto-cleared</i><span>rules pass · view only</span></td></tr>
    </tbody>
  </table>
</div>

<p class="warning"><b>Four fictional Narrative Customers</b> — an illustrative queue shaped to show four outcomes, never a portfolio or a workload estimate. The topbar names the policy version every row was judged under.</p>

<!--
Point at the pill column first. One account needs nobody at all; the other three each state what is proposed and why they are worth opening.
The counts are computed from the deterministic evaluation, not entered by hand. Change the policy version and the same four accounts can sort differently — that is slide 9.
Likely challenge: "Only four accounts?" Yes, deliberately. Each is engineered to show one recognizable outcome. Extrapolating from them to a book of business is exactly what we are not doing.
-->

---

<div class="value-spine mini"><span>01 Triage</span><span class="on">02 Assemble</span><span class="on">03 Justify</span><span>04 Decide</span><span>05 Adjust</span></div>

# One screen — and every number opens up

<div class="assemble-grid">
  <section class="regions">
    <small>Assembled for the analyst</small>
    <div class="region-map">
      <span class="lead">Review snapshot</span><span class="lead">Exposure &amp; purchases</span><span class="lead">Credit &amp; financial profile</span>
      <span>Review history</span><span>Risk profile</span><span>External data</span>
      <span>Review rules</span><span>Payment behavior</span><span>Relationship</span>
      <span>AR aging</span><span>Financial statement</span><span>Attachments</span>
    </div>
    <p class="anchor-note"><b>Limit-sizing anchor:</b> $90,000/mo × 45d ÷ 30 = <b>$135,000</b> term exposure, × 1.10 buffer = <b>$148,500</b> demand basis — the calculation is shown, not asserted.</p>
  </section>
  <section class="checkable">
    <small>Checkable in one click</small>
    <div class="fact-open">
      <header><b>Past due ratio</b><code>customer.past_due_ratio</code></header>
      <dl>
        <div><dt>Meaning</dt><dd>Past due amount ÷ AR balance · Derived facts</dd></div>
        <div><dt>Type · unit</dt><dd>decimal · percent</dd></div>
        <div><dt>Provenance</dt><dd>Derived in the browser from two input facts. A CIS API would supply the source values in production.</dd></div>
      </dl>
      <table>
        <thead><tr><th>Policy</th><th>Use</th><th>Outcome</th></tr></thead>
        <tbody>
          <tr><td>Past-due exposure limit</td><td>condition</td><td class="fail">FINDING</td></tr>
          <tr><td>Critical restriction trigger</td><td>condition</td><td class="fail">FINDING</td></tr>
          <tr><td>NET 30 past-due limit</td><td>condition</td><td class="na">N/A</td></tr>
        </tbody>
      </table>
    </div>
  </section>
</div>

<p class="takeaway"><b>This is the ontology paying rent.</b> Shared meaning, type, unit, and provenance are not documentation — they are what lets an analyst defend a number to a manager or a customer.</p>

<!--
The left column is the "assemble" value: twelve sections the analyst would otherwise open in several systems. Do not read the list; point and move.
The right column is the "justify" value and the strongest single moment in the demo. Click a figure in the snapshot, show its definition, unit, provenance, and the exact rules that consumed it, including the rule where it did not apply.
Likely challenge: "Is the AI computing these?" No. Facts, rules, findings, and the calculator are deterministic. Generated prose sits on top and is always shown against the evidence above it.
-->

---

<div class="value-spine mini"><span>01 Triage</span><span>02 Assemble</span><span>03 Justify</span><span class="on">04 Decide</span><span>05 Adjust</span></div>

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
The point of this slide is that the product's output is the analyst's decision, not the model's proposal. The proposal is a starting position with an audit trail.
Show the required reason on a replacement. That field is what turns a disagreement into evidence rather than a shrug — it is the raw material for slide 11.
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
  <p class="demo-note">Illustrative POC · fictional data · this walkthrough makes no model calls: proposal prose is rendered from the same deterministic results shown above it</p>
</div>

<!--
WALKTHROUGH SCRIPT — CUSTOMER REVIEW
1. Start on the worklist. Read the KPI strip, then the pill column. Northwind is auto-cleared and view-only; say plainly that this account consumed no analyst attention.
2. Open Ironclad Manufacturing. Banner first: review trigger, recommended limit against current, proposed action, risk band.
3. Scroll to the proposal panel. Read the drivers, not the paragraph. Then jump to Review Rules and show the same numbers as evaluated conditions with their thresholds.
4. Back to the snapshot: click Past due ratio. Definition, unit, provenance, and the exact traces — including the NET 30 rule where it did not apply. This is the moment to slow down.
5. Confirm the result on one account, then replace the result on Cascade Freight with a reason, and show it in the history and back in the queue as Completed.
If anything misbehaves, say so and keep going — the deterministic evidence on the page is the product, and this is an illustration, not a production system.
-->

---

<div class="value-spine mini"><span>01 Triage</span><span>02 Assemble</span><span>03 Justify</span><span>04 Decide</span><span class="on">05 Adjust</span></div>

# When the rule is the problem, change the rule

<div class="workbench-flow">
  <div class="wb-steps">
    <article><span>1</span><b>Say it in business language</b><small>“Customers on NET 30 terms cannot have more than 5% of their AR past due.” Start from an example intent or write your own.</small></article>
    <article><span>2</span><b>See the structured difference</b><small>Scope, threshold, and policy statement, active against candidate — with the candidate's source editable in a bounded rule language.</small></article>
    <article><span>3</span><b>Earn the evidence</b><small>Three deterministic gates, in order. Each one is pinned to this candidate revision and this policy baseline.</small></article>
  </div>
  <div class="wb-evidence">
    <article><b>Validation</b><span>Bounded syntax, stable ID, ontology properties, datatypes, units</span></article>
    <i>→</i>
    <article><b>Compatibility</b><span>Does the candidate conflict with the rules already in force?</span></article>
    <i>→</i>
    <article class="last"><b>Review impact</b><span>Which accounts change outcome — before anything is approved</span></article>
  </div>
</div>

<p class="takeaway"><b>The threshold conversation changes shape.</b> “Should we tighten NET 30?” stops being an opinion and becomes a question with a deterministic answer in the same session.</p>

<!--
This is the entry point the analyst already has: Configure rules, in the same topbar, next to the queue they were just working in.
Emphasize the ordering. Compatibility cannot run until validation passes, and impact cannot run until compatibility comes back non-blocking. A conflicting candidate stops at gate two and never produces an impact number.
Evidence complete is where this POC stops. Approval, publication, and activation happen outside it, and nothing here changes the active policy or any customer's state.
-->

---
layout: center
class: live-demo-slide
---

<div class="live-demo">
  <p class="kicker">Walkthrough · Configure rules → impact → back to the queue</p>
  <h1>What would tightening<br><span>this threshold actually do?</span></h1>
  <div class="demo-steps policy">
    <article><b>1</b><span>Candidate</span><small>NET 30 past due: 8% → 5%, as a structured difference</small></article>
    <article><b>2</b><span>Gates</span><small>Validation passes · compatibility returns a compatible refinement</small></article>
    <article><b>3</b><span>Impact</span><small>3 additional records require review, named one by one</small></article>
  </div>
  <a href="/v2/" target="_blank" rel="noopener noreferrer" class="demo-link">Open Configure rules <b>↗</b></a>
  <p class="demo-note">Fixed 12-record boundary cohort · no extrapolation to portfolio, staffing, time, or cost · evidence complete is the terminal state</p>
</div>

<!--
WALKTHROUGH SCRIPT — CONFIGURE RULES
1. From the worklist, open Configure rules. Note the active policy version chip: the candidate is always compared against a named baseline.
2. Take the "Tighten NET 30 past due" example intent and load its candidate. Show the structured diff — scope unchanged, threshold 8% to 5%, restated policy sentence.
3. Run validation, then compatibility. Read the result aloud: compatible refinement, active 8% to candidate 5%, global maximum 10%.
4. Run Review impact: three additional records require review across the twelve-record boundary cohort. Open the changed records — the ratios that cross the new line are named.
5. Optional contrast: load the 8% to 15% relaxation and show it stopping at compatibility as a conflict, with no impact number produced. A blocked candidate is the control working.
6. Return to the worklist and show the candidate-preview banner and row badges, then say explicitly that the active policy has not changed.
Keep the two numbers apart. The cohort count and the worklist preview are separate deterministic comparisons; the workbench deliberately does not project one onto the other.
-->

---

<p class="kicker">The loop</p>

# Analyst exceptions become the rule agenda

<div class="feedback-loop">
  <article><span>01</span><b>Decide</b><small>An analyst replaces a proposed result and records the reason</small></article>
  <i>→</i>
  <article><span>02</span><b>A pattern appears</b><small>The same override, repeated, is a question about the threshold — not about the analyst</small></article>
  <i>→</i>
  <article><span>03</span><b>Test the change</b><small>Candidate, validation, compatibility, and impact against the same engine</small></article>
  <i>→</i>
  <article><span>04</span><b>See it in the queue</b><small>Preview badges show which accounts would move, before any approval</small></article>
</div>

<p class="takeaway"><b>This is what keeps the rules from ossifying.</b> The people closest to the accounts generate the evidence for changing the policy that governs them.</p>

<!--
Two demos become one product story here: the override captured in step one is the input to step three.
Be careful with the claim. A single override does not prove a threshold is wrong — it is evidence worth investigating, and the impact assessment is what turns it into a decision an owner can make.
Likely challenge: "Who owns the threshold?" Unknown for production, and it is one of the discovery questions on the next slide. In this POC nobody approves anything.
-->

---

<p class="kicker">Why analysts can accept the proposal</p>

# Useful because it is checkable — safe because authority never moves

<div class="can-cannot">
  <section class="can">
    <span>What makes it useful</span>
    <h3>Assembled, computed, explained</h3>
    <div><b>Assemble</b><small>Facts, evidence, and history gathered into one case</small></div>
    <div><b>Compute</b><small>Rules, findings, and the advisory limit, deterministically</small></div>
    <div><b>Explain</b><small>The evidence turned into readable rationale</small></div>
  </section>
  <section class="cannot">
    <span>What never moves</span>
    <h3>Retained by people and CIS</h3>
    <div><b>Facts</b><small>Authoritative values and their shared meaning</small></div>
    <div><b>Controls</b><small>Validation, comparison, and action resolution</small></div>
    <div><b>Choice</b><small>The review decision, and any policy approval</small></div>
  </section>
</div>

<p class="boundary"><b>In this walkthrough</b> the proposal prose is rendered deterministically — no model call is made. Where AI does contribute in the wider POC, it drafts and explains only; a fluent explanation is never treated as proof.</p>

<!--
This is the one governance slide, and it belongs here rather than up front: the room has now seen the value, so this answers "can we trust it" instead of pre-empting a question nobody asked yet.
The line that matters: credible prose is not proof. The authoritative evidence is always on the page above the paragraph, which is why the analyst can check rather than believe.
Full claim detail, the model contract, and failure behavior are in the appendix if the audience pushes.
-->

---

<p class="kicker">What we would need next</p>

# The gap is domain knowledge, not technology

<div class="discovery-questions">
  <article><b>Workflow</b><span>What triggers a review, what do analysts actually inspect, and what does each action mean operationally?</span></article>
  <article><b>The $50,000 line</b><span>Where is it enforced, what exceptions exist, and what demand below it is invisible today?</span></article>
  <article><b>Facts and APIs</b><span>Which CIS sources are authoritative, typed, fresh, and available read-only?</span></article>
  <article><b>Policy ownership</b><span>Who owns thresholds, exceptions, approval, and rollback?</span></article>
  <article><b>Controls</b><span>Which identity, audit, approval, and retention controls already exist to reuse?</span></article>
  <article><b>Evidence</b><span>Which sanitized cases would justify going beyond a POC?</span></article>
</div>

<a class="next-steps-link" href="https://github.com/lifanh/ontology-demo/blob/main/NEXT_STEPS.md" target="_blank" rel="noopener noreferrer">Detailed production integration questions live in NEXT_STEPS.md ↗</a>

<!--
Close by naming what this POC cannot tell us. It demonstrates a working pattern over fictional data; it does not know how this team actually runs a review.
The ask is thirty minutes with the people who do customer reviews, then read-only verification of the CIS contracts. That produces evidence and ownership — not a timeline promise.
-->

---

<p class="kicker">Appendix · Current boundary</p>

# What is real in this POC?

<table class="reality-table">
  <thead><tr><th>Label</th><th>What it means here</th></tr></thead>
  <tbody>
    <tr><th>Real</th><td>Deterministic rule evaluation, action resolution, the advisory calculator, candidate validation, compatibility, and Review impact; the access gate and Hono gateway</td></tr>
    <tr><th>No model call</th><td>This walkthrough. Proposal prose and policy narration are rendered from deterministic results; AI-enabled operations exist elsewhere in the POC and are not used here</td></tr>
    <tr><th>Fictional</th><td>Customers, illustrative policies, external data, boundary cohort, history, and attachments</td></tr>
    <tr><th>Session-only</th><td>Review decisions and policy-change state, in one browser tab</td></tr>
    <tr><th>Absent</th><td>CIS integration, production data, identity and roles, durable audit, customer-state mutation, policy publication</td></tr>
  </tbody>
</table>

<p class="boundary"><b>Approved claim:</b> deterministic code validates, compares, evaluates, and resolves; a person records the final session-scoped decision. Where AI participates, it drafts and explains only.</p>

<!--
This matrix is the source of truth for demo claims. "Real" refers to the operation, not to the surrounding fictional data.
Apache Jena, SHACL, DMN, Drools/Kogito, and Z3 do not run here. They appear only as candidate production directions.
-->

---

<p class="kicker">Appendix · Decision inputs</p>

# What data can influence the proposed action?

<div class="tier-split">
  <section class="tier-one">
    <span>Tier 1</span><h3>Review Context</h3>
    <b>Decision input</b>
    <p>Complete, typed facts used by deterministic rules and action resolution.</p>
    <small>Same facts + same active policy version = same findings and action</small>
  </section>
  <div class="one-way"><b>Findings unlock evidence</b><i>→</i><small>Evidence never flows back into the action</small></div>
  <section class="tier-two">
    <span>Tier 2</span><h3>Contextual evidence</h3>
    <b>Narrative support only</b>
    <p>Payment history, disputes, recent orders, and external-style data.</p>
    <small>Fictional fixed lookups · enriches rationale, never the outcome</small>
  </section>
</div>

<p class="takeaway"><b>Load-bearing constraint:</b> Tier-2 evidence can explain an action; it cannot change one.</p>

<!--
This one-way boundary is enforced in code, not requested in a prompt. Action resolution consumes findings only.
It is also what makes the fictional external panels safe to show: they add colour to the story without touching any outcome.
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

<p class="kicker">Appendix · Failure behavior</p>

# What happens when a generated explanation fails?

<div class="failure-grid">
  <article><b>Timeout or unavailable</b><span>Localized retry; deterministic evidence stays on the page</span></article>
  <article><b>Invalid output</b><span>Rejected whole; no partial prose or half-formed candidate appears</span></article>
  <article><b>Needs clarification</b><span>One bounded question; no rule candidate is invented</span></article>
  <article><b>Unsupported intent</b><span>Stops honestly; no arbitrary policy is drafted</span></article>
</div>

<div class="continuity-flow"><span>Proposed action</span><span>Rule evaluation traces</span><span>Deterministic gates</span><span>Decision / impact</span></div>

<p class="takeaway"><b>Continuity is the control.</b> Review and impact assessment never become unavailable because a generated explanation failed.</p>

<!--
This is why the walkthrough is safe to run without AI at all: everything load-bearing is deterministic, and generated prose is strictly additive.
For policy drafting, failure means no candidate — never a silently repaired one.
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
None of these three operations is exercised in this walkthrough; they define the ceiling on what AI is permitted to do in the wider POC.
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
Only open this if the room asks how it would really be built. Start in the centre: CIS is authoritative for facts, workflow, decision, audit, and customer state.
Jena/SHACL, DMN, and Z3 are candidate production components from NEXT_STEPS.md; none runs in the current POC.
-->

---

<p class="kicker">Appendix · Production direction · Not running in this POC</p>

# How could this integrate around CIS?

<table class="responsibility-table">
  <thead><tr><th>Responsibility</th><th>POC today</th><th>Candidate production direction</th></tr></thead>
  <tbody>
    <tr><td>Authoritative facts</td><td>Fictional fixtures</td><td>CIS APIs + governed fact adapter</td></tr>
    <tr><td>Meaning and quality</td><td>JavaScript fact contracts</td><td>Ontology + Jena/SHACL as candidates</td></tr>
    <tr><td>Policy execution</td><td>Deterministic JavaScript</td><td>DMN + Drools/Kogito as candidates</td></tr>
    <tr><td>Compatibility</td><td>Bounded comparison code</td><td>Z3 as a candidate for deeper satisfiability checks</td></tr>
    <tr><td>Workflow and state</td><td>One anonymous browser tab</td><td>Reuse CIS identity, workflow, approval, audit, and customer state</td></tr>
    <tr><td>AI access</td><td>Hono gateway + bounded operations</td><td>Approved provider, controls, observability, and release integration</td></tr>
  </tbody>
</table>

<p class="boundary">CIS supplies authoritative values and retains operational authority. The ontology defines shared meaning, types, units, provenance, and permitted policy use.</p>

<!--
These are responsibility mappings, not product selections or architecture commitments. Read-only discovery should first identify existing CIS capabilities rather than rebuild them.
-->

---

<p class="kicker">Appendix · Reuse after proof</p>

# The same pattern could serve other domains

<div class="domain-reuse">
  <section class="shared">
    <small>Potentially shared governed workflow</small>
    <div>Facts</div><div>Drafts</div><div>Validation</div><div>Comparison</div><div>Releases</div><div>Evidence</div>
  </section>
  <section>
    <article><b>Credit review</b><span>Own vocabulary · rules · evidence · authority</span></article>
    <article><b>New-customer onboarding</b><span>Own vocabulary · rules · evidence · authority</span></article>
    <article><b>Other domains</b><span>Own vocabulary · rules · evidence · authority</span></article>
  </section>
</div>

<p class="takeaway"><b>Reuse the pattern, not the policy.</b> One implementation does not prove a platform; a second bounded use case would show what is genuinely shared.</p>

<!--
Onboarding is the plausible second use case because some credit vocabulary and governance concerns carry over. Its workflow and ownership still need separate discovery.
Likely challenge: "Can we reuse the rules?" Not automatically. Reuse contracts where meaning is shared; keep domain-specific authority explicit.
-->
