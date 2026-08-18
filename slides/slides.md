---
theme: default
title: Customer Review
titleTemplate: '%s · AI proposes, analysts decide'
author: Lifan Huang
info: |
  AI-assisted customer credit review: a governed rule center over a shared
  ontology, where every account arrives with a proposed result and its
  evidence, and a credit analyst decides.
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
    <p class="subtitle">AI proposes. Analysts decide.</p>
    <p class="author">Lifan Huang · Illustrative POC</p>
  </div>
  <div class="hero-row" aria-label="One worklist row as the analyst receives it">
    <header><span>Worklist</span><b>4 accounts due</b></header>
    <article>
      <div class="hr-cust"><b>Ironclad Manufacturing</b><span>#2004 · NET 45</span></div>
      <div class="hr-fig"><small>Past due</small><b class="bad">$20,000</b><span>20% of AR</span></div>
      <div class="hr-fig"><small>Risk</small><b>High Risk</b><span>3.60 / 4</span></div>
      <div class="hr-mode"><i>AI proposal</i><span>Restrict customer</span></div>
      <div class="hr-open">Review</div>
    </article>
    <footer>A conclusion with its evidence — not a blank case.</footer>
  </div>
</div>

<!--
SCRIPT

Today a credit analyst opens an account and starts building the case from scratch. Statements, aging, history, ratios — all of that happens before any judgment does.

This is what we are proposing instead. The account arrives already evaluated. The row tells you what the system proposes and why it is worth your time. Ironclad Manufacturing: twenty thousand dollars past due, twenty percent of receivables, high risk — the proposal is to restrict the customer.

One sentence frames the whole session: AI proposes the review result of every account, and credit analysts decide. Deterministic rules and calculations stay authoritative throughout.

The customer on this slide is fictional. The portfolio numbers on the next slide are real.
-->

---

<p class="kicker">The problem · Real figures</p>

# 66,000 customers, two gaps

<div class="gap-split">
  <section class="below">
    <header><b>Below $50,000</b><span>Rules stopped</span></header>
    <div class="gap-figure"><strong>48,400</strong><small>customers</small></div>
    <ul><li>US 40,000</li><li>CA 8,400</li></ul>
    <p>Nothing automated runs here today.</p>
  </section>
  <div class="gap-line"><span>$50,000</span><i></i><small>the capacity line</small></div>
  <section class="above">
    <header><b>Above $50,000</b><span>Manual review, rotated</span></header>
    <div class="gap-figure"><strong>17,600</strong><small>customers</small></div>
    <ul><li>US 15,000</li><li>CA 2,600</li></ul>
    <p>The population grows. The team does not.</p>
  </section>
</div>

<p class="takeaway"><b>Below the line, the rules are off. Above it, nothing is automated.</b></p>

<!--
SCRIPT

Here is the size of the problem. Sixty-six thousand customers across the US and Canada.

Forty-eight thousand four hundred of them sit below the fifty-thousand-dollar credit limit — forty thousand in the US, eight thousand four hundred in Canada. The legacy rules for that segment were outdated, so they were stopped. Nothing automated runs there today.

Seventeen thousand six hundred sit above the line — fifteen thousand US, two thousand six hundred Canada. Every one of those is a manual review.

So the line cuts two ways. Below it, the rules that should run are switched off. Above it, nothing is automated — and because the population keeps growing while the team stays the same size, reviews get taken in rotation. That produces backlog, delays, and coverage that is incomplete by design.

IF ASKED — how far behind are we? We have not measured it. Making coverage visible is part of what we are proposing, not something we are claiming today.

REMINDER TO SELF — nothing later in this deck should be multiplied by these figures. The demo cohorts are engineered illustrations, not samples of this portfolio.
-->

---

<p class="kicker">The work today</p>

# Every review starts from zero

<div class="friction-grid">
  <article><b>Evidence is requested</b><span>Ask the reseller for statements. Then wait.</span></article>
  <article><b>Combined by hand</b><span>Reconciled against internal credit, AR, payment, and relationship data.</span></article>
  <article><b>The same math, re-derived</b><span>Past-due percentage, utilization, days to pay, limit sizing.</span></article>
  <article><b>Thresholds live in a document</b><span>Applied from memory, not shown on the screen.</span></article>
  <article class="constraint"><b>So reviews rotate</b><span>Growing population, fixed team — backlog, delays, incomplete coverage.</span></article>
</div>

<p class="takeaway"><b>Capacity scales only with headcount.</b></p>

<!--
SCRIPT

Why is a single review slow? Five reasons, and only one of them is judgment.

First, evidence is requested rather than retrieved. The analyst asks the reseller for financial statements and supporting information, and then waits.

Second, when the material arrives it is combined by hand — reconciled against internal credit, AR, payment, and relationship data, account by account.

Third, the same math is re-derived every time. Past-due percentage, utilization, days to pay against terms, and a limit sized against demand.

Fourth, the thresholds live in a policy document. The policy is real, but it is applied from memory rather than shown and evaluated on the screen.

Fifth — and this is the consequence of the other four — reviews get rotated. A growing population above fifty thousand, a fixed team.

The point of the slide is that capacity scales only with headcount, because every review starts from an empty page. And the same reseller gets asked for the same document more than once.

IF ASKED — which of these costs the most? The first two. The waiting on resellers, and the manual reconciliation once the material finally arrives.
-->

---

<p class="kicker">The proposal</p>

# Make review a governed capability

<div class="pillars">
  <article><span>01</span><b>Configurable rule center</b><small>Thresholds, versions, segments, effective scopes.</small></article>
  <article><span>02</span><b>Standardized workflow</b><small>Same evidence, same actions, same record, every time.</small></article>
  <article><span>03</span><b>Automated evidence</b><small>Internal and external sources, assembled up front.</small></article>
  <article><span>04</span><b>Differentiated policies</b><small>By customer size and risk, not one blunt threshold.</small></article>
  <article><span>05</span><b>AI-assisted analysis</b><small>Outcomes, risk drivers, policy fit — proposed, not decided.</small></article>
</div>

<p class="takeaway"><b>Segment and risk set the attention — not one dollar line.</b></p>

<!--
SCRIPT

So here is the proposal, in five parts.

A configurable rule center: thresholds, versions, customer segments, and effective scopes — governed, and changeable without waiting for a release cycle. That answers the stopped legacy rules directly.

A standardized workflow, so every review uses the same evidence, offers the same allowed actions, and leaves the same record.

Automated evidence collection — internal credit, AR, payment and relationship data, plus external sources, assembled before the analyst opens the case. The reseller gets asked once instead of repeatedly.

Differentiated policies, so large, medium and small customers, and different risk scenarios, stop sharing one blunt threshold.

And AI-assisted analysis: historical outcomes, risk drivers, and whether a policy is still reasonable — proposed for a person to judge.

The word that matters here is governed. Configurable on its own just moves the risk around. Versions, scopes, and evidence are what make configurability safe.

IF ASKED — does this replace the fifty-thousand-dollar rule? It replaces it as the policy. Segment and risk decide how much attention an account needs, and the rules that decide are themselves versioned and inspectable.
-->

---

<p class="kicker">How the work divides</p>

# Three lanes. Two need an analyst.

<div class="lanes">
  <section class="auto">
    <header><i>Low risk</i><b>Automated</b></header>
    <p>Rules pass and no limit change is recommended. Cleared and recorded.</p>
    <small>In the demo: <b>Auto-cleared</b></small>
  </section>
  <section class="assist">
    <header><i>Borderline</i><b>Human-in-the-loop</b></header>
    <p>Proposal, drivers, and evidence arrive together. The analyst decides.</p>
    <small>In the demo: <b>AI proposal</b></small>
  </section>
  <section class="manual">
    <header><i>High risk</i><b>Analyst control</b></header>
    <p>Restriction and escalation stay with a person.</p>
    <small>In the demo: <b>Escalation proposed</b></small>
  </section>
</div>

<p class="takeaway"><b>Capacity grows without linear headcount.</b></p>

<!--
SCRIPT

That splits the work into three lanes.

Low risk: the rules pass, the calculator recommends no change, and the account is cleared and recorded. No analyst touches it.

Borderline: the account arrives with a proposed result, its drivers, and the evidence already assembled. The analyst confirms it, or replaces it with a reason.

High risk and anything exceptional: restriction triggers, credit-manager routing, unusual cases. Those stay with a person — but with the evidence assembled for them.

These are not a future concept. They are the review modes you will see in the worklist in a moment, which makes the demo the evidence for this slide.

And this is how capacity grows without hiring proportionally. The bottom lane stops arriving in the queue at all, and the middle lane arrives finished enough to check rather than build.

IF ASKED — what proportion falls in each lane? We do not know until the rules run against the real portfolio. That is a discovery question, not a claim.

IF ASKED — is the automated lane an AI decision? No. It is automated because deterministic rules passed and the calculator recommended no change.
-->

---

<p class="kicker">The foundation</p>

# One vocabulary under every number

<div class="onto-map">
  <section><label>Case &amp; account</label><span>CustomerReview</span><span>CustomerAccount</span><span>FinancialRelationship</span></section>
  <section><label>Exposure &amp; behavior</label><span>ExposureProfile</span><span>ARBalance</span><span>ARAgingSnapshot</span><span>ADPDBTProfile</span></section>
  <section><label>Risk &amp; financials</label><span>RiskAssessment</span><span>FinancialProfile</span><span>FinancialStatement</span></section>
  <section><label>External</label><span>ExternalCreditProfile</span><span>ExternalTradeLine</span></section>
  <section><label>Decision &amp; workflow</label><span>CreditDecision</span><span>ReviewRuleResult</span><span>AIReview</span><span>ReviewHistoryEntry</span><span>AnalystAction</span><span>ReviewDocument</span></section>
</div>

<div class="onto-stats"><div><strong>18</strong><small>entities</small></div><div><strong>188</strong><small>attributes</small></div><div><strong>18</strong><small>relationships</small></div><div><strong>R1–R6</strong><small>review rules</small></div><div><strong>7</strong><small>derived metrics</small></div><div><strong>10</strong><small>screen sections</small></div></div>

<p class="takeaway"><b>A threshold is governable only if its terms are defined once.</b></p>

<!--
SCRIPT

None of the previous slide works without this one.

This is the customer credit review ontology. Eighteen entities, covering the case and the account, exposure and payment behaviour, risk and financials, external data, and the decision and workflow. Underneath them: a hundred and eighty-eight attributes, eighteen relationships, the six review rules, seven derived metrics, and the ten sections of the review screen.

Here is why it matters commercially, and it is the sentence to take away. A threshold can only be governed, versioned, and scoped to a segment if the thing it constrains has one agreed definition, one type, one unit, and one owner. Without that, past due percent means three different things in three systems — and a rule center just becomes a faster way to disagree.

Decision scope is a good example of the value. It is defined once as the financial master plus sharing-Y subsidiaries. That definition is how the same customer stops being counted twice in a roll-up.

The demo you are about to see implements a deliberately small working subset of this, which is exactly what makes every figure on screen openable.

IF ASKED — is this modeling for its own sake? No. It is the precondition for the rule center, for differentiated policies, and for reusing the same rule across regions.
-->

---

<p class="kicker">The foundation · Sources</p>

# Every attribute has a source

<table class="onto-source">
  <thead><tr><th>Entity</th><th>Example attributes</th><th>Source</th></tr></thead>
  <tbody>
    <tr><td><code>CustomerAccount</code></td><td>customer_id · customer_name · territory · terms · region</td><td>CIS customer master</td></tr>
    <tr><td><code>ARBalance</code></td><td>ar_balance · past_due_amount · past_due_percentage</td><td>Customer credit snapshot, via the credit API</td></tr>
    <tr><td><code>ExposureProfile</code></td><td>total_exposure · utilization_of_limit</td><td><b>Derived</b> — AR plus pending, over the limit</td></tr>
    <tr><td><code>FinancialRelationship</code></td><td>financial_master_id · sharing · restricted</td><td>Customer cross-reference, via the relationship API</td></tr>
    <tr><td><code>ExternalCreditProfile</code></td><td>nacm_risk_score · nacm_dbt · aging_distribution</td><td>External trade-credit feed</td></tr>
    <tr><td><code>ReviewDocument</code></td><td>file_name · uploaded_at · document_status</td><td>Financial-statement attachment service</td></tr>
  </tbody>
</table>

<p class="takeaway"><b>Same rule, same meaning, in the US and Canada.</b></p>

<!--
SCRIPT

And this is not abstract. Every attribute has a definition and a named source.

Customer account — identity, name, territory, terms, region — comes from the CIS customer master.

AR balance, past due amount, and past due percentage come from the customer credit snapshot, read through the credit API.

Exposure is derived: AR balance plus pending, over the credit limit. Read that one aloud, because it is the clearest illustration of the value. Defining it once, here, is what stops three teams computing it three different ways.

Financial relationship comes from the customer cross-reference. External credit comes from the trade-credit feed. Review documents come from the attachment service.

That is what turns a policy sentence into something a system can evaluate. No more than ten percent past due is enforceable only once past-due percentage has one definition, one unit, and one authoritative source. It is also what lets the same rule mean the same thing in the US and in Canada.

IF ASKED — how complete is this mapping? We have gone through it property by property, including the parts that still need verification and the few that need an external provider. I would rather walk you through that separately than put it on a slide.
-->

---

<p class="kicker">In the product</p>

# The queue sorts itself

<div class="kpi-strip">
  <div class="kpi ai"><small>AI proposal, awaiting decision</small><b>3</b><span>Ready for an analyst</span></div>
  <div class="kpi high"><small>Escalation proposed</small><b>2</b><span>Restrict or manager routing</span></div>
  <div class="kpi soft"><small>Past due over policy</small><b>2</b><span>Above 10% of AR</span></div>
  <div class="kpi pass"><small>Auto-cleared</small><b>1</b><span>View only</span></div>
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
      <div><dt>Source</dt><dd>Derived from two input facts</dd></div>
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
SCRIPT

Here is what all of that looks like in the product.

The top row is the queue as it arrives. Three accounts have a proposal waiting for a decision, two of those are escalations, and one is auto-cleared. Those counts come out of the evaluation — nobody types them in.

In the list itself, Northwind is auto-cleared and view-only. Say that one plainly: that account consumed no analyst attention at all. That is the bottom lane from the tiering slide, working. The other three each state what is proposed and why they are worth opening.

On the right is the ontology made tangible. Click any figure — this is past due ratio — and you get its meaning, its type and unit, where the value came from, and every rule that used it. Including the NET 30 rule, where it did not apply. That last part matters: you can see what was considered and ruled out, not just what fired.

And the case itself is assembled: twelve sections, from snapshot and exposure through to financials and attachments, in one place instead of several systems.

Four fictional accounts, engineered to show four different outcomes. Never present them as a portfolio or a sample.
-->

---

<p class="kicker">In the product</p>

# The analyst decides

<div class="decide-grid">
  <article class="confirm"><span>Confirm</span><b>Accept the proposal</b><small>Recorded as reviewed against a named policy version.</small></article>
  <article class="replace"><span>Replace</span><b>Different action, with a reason</b><small>The reason is required. The original proposal stays on record.</small></article>
  <article class="reopen"><span>Reopen</span><b>Undo and re-decide</b><small>The reopen is an event in the history, not a silent erase.</small></article>
</div>

<div class="decide-record">
  <b>What gets recorded</b>
  <span>Action</span><i>·</i><span>Reason</span><i>·</i><span>Policy version</span><i>·</i><span>Evaluation references</span>
</div>

<p class="boundary"><b>In this POC,</b> decisions update one browser tab. In production the confirmation would flow through the CIS workflow.</p>

<!--
SCRIPT

The decision is still the analyst's, and it is recorded.

They can confirm the proposed result, which is recorded as reviewed against a named policy version.

Or they replace it — a different action from the allowed vocabulary, with a required reason, and the original proposal stays on record beside it. Point at that reason field when you demo it. That field is what turns a disagreement into evidence rather than a shrug, and it is the raw material for the improvement loop later in the deck.

Or they reopen, which is itself an event in the history rather than a silent erase.

What gets recorded is the action, the reason, the policy version, and the evaluation references. That combination is what makes this auditable rather than merely faster.

In this POC a decision updates one browser tab. In production an authorized confirmation would flow through the CIS workflow.

IF ASKED — can an analyst override the findings? No. They replace the resolved action. The findings are objective evaluations of policy against facts, and they stay visible either way.
-->

---
layout: center
class: live-demo-slide
---

<div class="live-demo">
  <p class="kicker">Walkthrough</p>
  <h1>From queue<br><span>to decision</span></h1>
  <div class="demo-steps">
    <article><b>1</b><span>Triage</span><small>The queue, and the account nobody needs to open</small></article>
    <article><b>2</b><span>Check</span><small>Open a figure, see its definition and its rules</small></article>
    <article><b>3</b><span>Decide</span><small>Confirm one, replace one with a reason</small></article>
  </div>
  <a href="/v2/" target="_blank" rel="noopener noreferrer" class="demo-link">Open Customer Review <b>↗</b></a>
  <p class="demo-note">Illustrative POC · fictional customer data</p>
</div>

<!--
SCRIPT — WALKTHROUGH ONE

"Let me show you the queue as an analyst would get it."

1. Start on the worklist. Read the KPI strip aloud, then move to the review-mode column. Point at Northwind: auto-cleared, view only. "This account is done. Nobody opened it."

2. Open Ironclad Manufacturing. Take the banner first — the review trigger, the recommended limit against the current one, the proposed action, and the risk band. "Everything I need to start checking is already here."

3. Scroll to the proposal panel. Read the drivers rather than the paragraph. Then jump to the Review Rules section and show the same numbers as evaluated conditions against their thresholds. "The paragraph is readable, but this is the part that is authoritative."

4. Go back to the snapshot and click Past due ratio. Definition, type, unit, provenance, and the exact rules that used it — including the NET 30 rule where it did not apply. Slow down here; this is the ontology slide made real, and it is the moment the room understands what "one definition" buys them.

5. Confirm the result on one account. Then open Cascade Freight, replace the result with a different action and a reason, and show it landing in the history and coming back in the queue as completed.

6. Return to the worklist so the queue state is visible before you move on.

IF SOMETHING MISBEHAVES — keep going and say so. The deterministic evidence on the page is the product, and this is an illustration of the target experience rather than a production system.
-->

---

<p class="kicker">In the product · The rule center</p>

# Change the rule, see the impact

<div class="wb-steps">
  <article><span>1</span><b>Say it in business language</b><small>“NET 30 customers: no more than 5% of AR past due.”</small></article>
  <article><span>2</span><b>See the difference</b><small>Scope, threshold, and wording — active against candidate.</small></article>
  <article><span>3</span><b>Earn the evidence</b><small>Three gates, in order. A conflict stops at gate two.</small></article>
</div>

<div class="wb-evidence">
  <article><b>Validation</b><span>Syntax, stable ID, ontology properties, types, units</span></article>
  <i>→</i>
  <article><b>Compatibility</b><span>Does it conflict with the rules already in force?</span></article>
  <i>→</i>
  <article class="last"><b>Review impact</b><span>Which accounts change, before anything is approved</span></article>
</div>

<a href="/v2/" target="_blank" rel="noopener noreferrer" class="demo-inline">Walkthrough · Configure rules <b>↗</b></a>

<!--
SCRIPT — WALKTHROUGH TWO

"The other half of the story is what happens when the rule itself is the problem."

Set it up first: this is the rule center from the proposal slide, reachable from the same toolbar the analyst was just working in. A policy owner does not file a ticket and wait for a release.

1. Open Configure rules. Point at the active policy version chip. "Every candidate is compared against a named baseline. That is the versioning working."

2. Take the tighten-NET-30 example intent and load its candidate. Show the structured difference: scope unchanged, threshold moving from eight percent to five, and the policy sentence restated.

3. Run validation. Then run compatibility, and read the result out: compatible refinement, active eight percent to candidate five percent, against a global maximum of ten.

4. Run Review impact. Three additional records require review across the twelve-record boundary cohort, and the changed records are named. "This is the question that used to be an opinion."

5. Optional but strong: load the eight-to-fifteen-percent relaxation instead and show it stopping at compatibility as a conflict, producing no impact number at all. "A blocked candidate is the control working, not a bug."

6. Return to the worklist and show the candidate-preview banner. Then say explicitly: the active policy has not changed, and nothing has been approved.

KEEP THE TWO NUMBERS APART — the cohort count and the worklist preview are separate deterministic comparisons. The workbench deliberately does not project one onto the other, and neither should you.
-->

---

<p class="kicker">The payoff</p>

# Review improves itself

<div class="feedback-loop">
  <article><span>01</span><b>Decide</b><small>An analyst replaces a result and records why</small></article>
  <i>→</i>
  <article><span>02</span><b>A pattern appears</b><small>The same override, repeated, questions the threshold</small></article>
  <i>→</i>
  <article><span>03</span><b>Test the change</b><small>Validation, compatibility, impact — same engine</small></article>
  <i>→</i>
  <article><span>04</span><b>See it in the queue</b><small>Which accounts move, before any approval</small></article>
</div>

<div class="outcome-band">
  <b>What the business gets</b>
  <span>Fewer reseller requests</span><span>Less manual comparison</span><span>Capacity without headcount</span><span>Measurable and versioned</span><span>Auditable</span><span>Reusable across regions</span>
</div>

<!--
SCRIPT

Put the two walkthroughs together and review starts improving itself.

An analyst replaces a proposed result and records why. That is step one, and you saw it happen a few minutes ago.

When the same override keeps recurring, that is not a problem with the analyst. It is a question about the threshold.

Step three is testing that change — candidate, validation, compatibility, and impact, against the same engine that runs the reviews. Not a spreadsheet, not a guess.

And step four, you see which accounts would move, in the queue, before anything is approved.

What the business gets from that: fewer repeated requests to resellers, less manual comparison, capacity that does not scale with headcount, and a review process that is measurable, versioned, and auditable. It is reusable across regions too, because the ontology and the rule scopes are shared even where the thresholds are not.

IF ASKED — does one override prove a threshold is wrong? No. It is evidence worth investigating. The impact assessment is what turns it into a decision somebody can own.

IF ASKED — who owns the threshold? That is one of the open questions. In this POC nobody approves anything.
-->

---

<p class="kicker">Why this is safe</p>

# Checkable. Authority never moves.

<div class="can-cannot">
  <section class="can">
    <span>What makes it useful</span>
    <h3>Assembled, computed, explained</h3>
    <div><b>Assemble</b><small>Internal and external evidence, one case</small></div>
    <div><b>Compute</b><small>Rules, findings, advisory limit — deterministic</small></div>
    <div><b>Explain</b><small>Evidence turned into readable rationale</small></div>
  </section>
  <section class="cannot">
    <span>What never moves</span>
    <h3>Retained by people and CIS</h3>
    <div><b>Facts</b><small>Authoritative values and their meaning</small></div>
    <div><b>Controls</b><small>Validation, comparison, action resolution</small></div>
    <div><b>Choice</b><small>The review decision and any policy approval</small></div>
  </section>
</div>

<p class="boundary"><b>Next:</b> confirm the workflow with the people who run it, verify the source systems read-only, and name the owners of thresholds, exceptions, and rollback.</p>

<!--
SCRIPT

Last slide, and it is the one about trust. It sits here rather than at the front deliberately — you have now seen the value, so this answers "can we rely on it" instead of pre-empting a question nobody had asked yet.

On the left, what makes it useful. Evidence assembled into one case. Rules, findings, and the advisory limit computed deterministically. And the evidence turned into a readable rationale with its drivers.

On the right, what never moves. The authoritative facts and their shared meaning. The controls that validate, compare, and resolve. And the choice itself — the review decision, and any policy approval.

The line I would leave you with is this: a credible explanation is not proof. The authoritative evidence is always on the page above the paragraph, which is exactly why an analyst can check rather than believe.

And here is what we would need to go further. Half an hour with the people who actually run customer reviews. Read-only verification of the source systems behind the attributes we have mapped. And names against who owns thresholds, exceptions, and rollback.

CLOSING LINE — "The technology in this walkthrough works. What we need next is your domain knowledge, not more engineering."
-->

---

<p class="kicker">Appendix · Boundary</p>

# What is real here

<table class="reality-table">
  <thead><tr><th>Label</th><th>What it means</th></tr></thead>
  <tbody>
    <tr><th>Real</th><td>Rule evaluation, action resolution, the advisory calculator, candidate validation, compatibility, and Review impact</td></tr>
    <tr><th>Real figures</th><td>Only the portfolio counts: 48,400 below and 17,600 above the $50,000 line</td></tr>
    <tr><th>No model call</th><td>This walkthrough — proposal prose is rendered from deterministic results</td></tr>
    <tr><th>Fictional</th><td>Customers, illustrative policies, external data, cohort, history, attachments</td></tr>
    <tr><th>Session-only</th><td>Review decisions and policy-change state, in one browser tab</td></tr>
    <tr><th>Absent</th><td>CIS integration, production data, identity and roles, durable audit, policy publication</td></tr>
  </tbody>
</table>

<p class="boundary"><b>Approved claim:</b> deterministic code validates, compares, evaluates, and resolves; a person records the decision. Where AI participates, it drafts and explains only.</p>

<!--
SCRIPT — USE IF CHALLENGED ON CLAIMS

This table is the source of truth for what we are and are not saying.

"Real" refers to the operation, not to the surrounding data. The rule evaluation, action resolution, calculator, and the three policy gates all genuinely run.

The only real figures in the deck are the portfolio counts on slide two. Everything about the customers on screen is fictional.

This particular walkthrough makes no model call — the proposal prose is rendered from the same deterministic results shown beneath it. Bounded AI operations exist in the wider work and are described two slides on.

And the absences are deliberate: no CIS integration, no production data, no identities or roles, no durable audit, no policy publication.

Jena, SHACL, DMN, Drools and Z3 do not run here either. They appear only as candidate production directions.
-->

---

<p class="kicker">Appendix · Evidence</p>

# Every finding is traceable

<div class="trace-card">
  <header><code>credit-1.4.0/CRITICAL_RESTRICTION@1</code><b>FINDING</b></header>
  <div class="trace-policy"><small>Illustrative policy</small><strong>An unrestricted customer with more than 10% past due, negative operating cash flow, and a current ratio below 1 requires restriction.</strong></div>
  <div class="trace-observations">
    <article><span>Past-due ratio</span><b>20%</b><small>&gt; 10% · PERCENT · matched</small></article>
    <article><span>Operating cash flow</span><b>−$50,000</b><small>&lt; $0 · CURRENCY · matched</small></article>
    <article><span>Current ratio</span><b>0.8</b><small>&lt; 1 · NUMBER · matched</small></article>
  </div>
  <footer><span>Reason: CRITICAL_RESTRICTION_TRIGGER</span><span>Action hint: NEED_TO_RESTRICT</span><span>Versions pinned</span></footer>
</div>

<p class="takeaway">Policy, values, operators, thresholds, units, and provenance travel together.</p>

<!--
SCRIPT — USE IF ASKED HOW A FINDING IS JUSTIFIED

This is the trace behind the Ironclad proposal you saw earlier.

The policy statement is at the top, in the words a person wrote. Below it are the three conditions, each with the actual value, the operator, the threshold, and the unit — and each marked as matched.

At the bottom the reason code, the action hint, and the pinned versions of the ontology and the resolver.

The browser formats typed raw values. None of this is generated text, which is why it can be used to defend a decision.

IF ASKED — what happens when a value is missing? It stays explicit as indeterminate. It never collapses into a guessed pass or fail.
-->

---

<p class="kicker">Appendix · Impact</p>

# How impact is calculated

<div class="impact-compare">
  <section><small>Active policy</small><b>NET 30 maximum: 8%</b><span>Evaluate 12 fictional boundary records</span></section>
  <i>vs</i>
  <section class="candidate"><small>Candidate</small><b>NET 30 maximum: 5%</b><span>Evaluate the same records, compare</span></section>
  <div><strong>3</strong><b>additional records require review</b><small>Ratios at 6%, 7%, and 8% cross the new line</small></div>
</div>

<div class="completeness">evaluated · newly required · cleared · changed actions · added/resolved findings · indeterminate · errors · <b>complete</b></div>

<p class="warning"><b>Illustrative cohort:</b> no extrapolation to portfolio volume, staffing, time, cost, or loss.</p>

<!--
SCRIPT — USE IF ASKED HOW THE IMPACT NUMBER IS PRODUCED

The same twelve fictional boundary records are evaluated twice — once under the active policy, once under the candidate — and the outcomes are compared.

Three of them newly require review, and you can see exactly which: the records sitting at six, seven, and eight percent, which cross the new five percent line.

This is deterministic workload evidence, not a model estimate. Equality boundaries are explicit, and the changed records are listed first.

If any record comes back indeterminate or errors, the assessment is marked incomplete — and an incomplete assessment cannot reach evidence complete.

SAY THIS PLAINLY — do not extrapolate three-in-twelve onto the sixty-six thousand customers from slide two. This cohort is engineered to sit on the boundary; it is not a sample of anything.
-->

---

<p class="kicker">Appendix · Model contract</p>

# What the model can do

<div class="operation-grid">
  <article><code>draft_rule</code><b>Draft</b><span>Two supported policy families</span><small>NET30_PAST_DUE_MAX<br>HIGH_BALANCE_ADP_MAX</small></article>
  <article><code>explain_review</code><b>Explain</b><span>References deterministic evidence</span><small>May call bounded evidence lookups</small></article>
  <article><code>explain_policy_analysis</code><b>Explain</b><span>References completed analysis</span><small>Receives summary evidence, not customer rows</small></article>
</div>

<div class="schema-band"><b>Bounded</b><span>Named operations · JSON Schema · server-owned prompts and tools · validated references</span></div>
<div class="forbidden-band"><b>Never from the model</b><span>Facts · validation results · actions · approvals · ontology definitions · decisions</span></div>

<!--
SCRIPT — USE IF ASKED WHAT STOPS THE AI INVENTING A POLICY

There are exactly three operations. It can draft a rule within two supported policy families. It can explain a review, referencing deterministic evidence. And it can explain a completed policy analysis, from summary evidence rather than customer rows.

There is no general completion endpoint, no free SQL, no schema exploration, and no arbitrary rule authoring.

Every response is checked against a schema and its references are validated. Output that does not conform is rejected whole — the gateway never silently repairs it.

And the bottom band is the important one: no fact, validation result, action, approval, ontology definition, or decision ever comes from model output.
-->

---
class: architecture-slide
---

<p class="kicker">Appendix · Production direction · Not running today</p>

# Authority stays in CIS

<div class="architecture-poster">
  <section class="architecture-zone experience-zone">
    <header><i>1</i><b>Experience &amp; workflow</b></header>
    <div class="experience-parts">
      <span>Customer Review UI</span><span>Review API / Events</span><span>Identity &amp; roles</span>
    </div>
  </section>

  <section class="architecture-zone cis-zone">
    <header><i>2</i><b>CIS authority</b></header>
    <ul>
      <li>Review application service</li><li>Authoritative customer facts</li><li>Workflow / state / decision</li><li>Audit</li><li>Customer-state mutation</li>
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
      <li>Customer facts adapter</li><li>PolicyDecisionPort</li><li>Approved pinned release</li><li>Candidate DMN runtime</li><li>Deterministic findings</li><li>Recommendations + calculations</li>
    </ol>
    <p>Fast · deterministic · isolated from authoring</p>
  </section>

  <div class="release-lane" aria-label="Only an immutable approved release crosses from the policy control plane into the review-time runtime"><b>←</b><span>Only immutable approved release</span></div>

  <section class="architecture-zone control-plane-zone">
    <header><i>4</i><b>Policy control plane</b><small>Authoring-time only</small></header>
    <div class="control-sequence">
      <span>Configure rules · policy intent</span><em>↓</em>
      <span class="ai-part">Optional AI structured draft</span><em>↓</em>
      <span>Schema + typed policy model</span><em>↓</em>
      <span class="gate-part">Candidate tools<br>Ontology · DMN compiler · conflict analysis</span><em>↓</em>
      <span>Batch impact qualification</span><em>↓</em>
      <span class="human-part">Approval by authorized people</span><em>↓</em>
      <span class="release-part">Immutable release · rollback</span>
    </div>
    <div class="authoring-services"><b>Authoring services</b><span>Approved model provider · optional RDF store</span></div>
    <p><b>AI</b> never enters the review-time path</p>
  </section>

  <section class="architecture-zone platform-zone">
    <header><i>5</i><b>Platform services</b></header>
    <div>
      <span>Review DB</span><span>Artifact storage</span><span>Secrets manager</span><span>Observability</span>
    </div>
  </section>
</div>

<p class="architecture-rule"><b>AI drafts. Deterministic systems verify. Authorized people approve.</b></p>

<!--
SCRIPT — USE ONLY IF ASKED HOW IT WOULD REALLY BE BUILT

Start in the centre. CIS stays authoritative for the facts, the review workflow, the decision, the audit trail, and any change to customer state. We are not proposing to replace it.

To the right is the review-time runtime. It runs approved policies only, deterministically, and it is isolated from authoring.

Below that, the policy control plane — where a rule is drafted, validated, compiled, conflict-checked, impact-qualified, and then approved by a person. Only an immutable approved release crosses into the runtime.

The line worth saying out loud: AI never enters the review-time path. It assists at authoring time and at explanation time, and nowhere else.

The named components here are candidates, not selections. None of them runs today.
-->

---

<p class="kicker">Appendix · Discovery</p>

# What discovery must answer

<div class="discovery-questions">
  <article><b>Workflow</b><span>What triggers a review, what do analysts inspect, what does each action mean?</span></article>
  <article><b>Segmentation</b><span>How are large, medium, and small defined — and what runs below $50,000?</span></article>
  <article><b>Sources</b><span>Which systems are authoritative, fresh, and available read-only?</span></article>
  <article><b>Ownership</b><span>Who owns thresholds, exceptions, approval, and rollback?</span></article>
  <article><b>Controls</b><span>Which identity, audit, approval, and retention controls already exist?</span></article>
  <article><b>Evidence</b><span>Which cases would justify going beyond a POC?</span></article>
</div>

<p class="next-steps-note">A fuller set of production integration questions is written up and available on request.</p>

<!--
SCRIPT — USE WHEN ASKED "WHAT DO YOU NEED FROM US"

These six are the honest gaps. This POC demonstrates a working pattern over fictional data and a mapped ontology — it does not know how your team actually runs a review.

Workflow first: what triggers a review, what analysts genuinely inspect, and what each action means operationally once it leaves the screen.

Segmentation is the commercially important one. The forty-eight thousand customers below fifty thousand dollars are unreviewed right now. Deciding what should run there is a policy decision, not a technical one.

Then sources, ownership, and existing controls — we would rather reuse identity, audit and approval than rebuild them.

And finally evidence: which sanitized cases would actually justify going further than a POC.

THE ASK — thirty minutes with the people who run customer reviews, then read-only verification of the source systems.
-->
