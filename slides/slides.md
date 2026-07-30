---
theme: default
title: AI-Assisted Customer Credit Review
titleTemplate: '%s · Make review easier without giving AI decision authority'
author: AI-Assisted Customer Credit Review
info: |
  A management walkthrough of an illustrative POC in which GPT-5.6 Luna
  drafts and explains, deterministic controls verify, and a person decides.
favicon: /slides/favicon.svg
fonts:
  sans: Manrope
  mono: DM Mono
  local: Manrope,DM Mono
  provider: none
exportFilename: ai-assisted-customer-credit-review
transition: fade
mdc: true
routerMode: hash
defaults:
  layout: default
---

<div class="opening-grid">
  <div>
    <p class="kicker">The management problem</p>
    <h1>AI-Assisted Customer<br><span>Credit Review</span></h1>
    <p class="subtitle">Make review easier without giving AI decision authority</p>
  </div>
  <div class="capacity-funnel" aria-label="Review demand exceeds analyst capacity">
    <div><b>Many customers may warrant review</b><span>Risk signals and changing conditions create demand</span></div>
    <i>↓</i>
    <div class="constraint"><b>Limited analyst capacity</b><span>Human attention must be prioritized</span></div>
    <i>↓</i>
    <div class="focus"><b>Current focus: credit limit above $50,000</b><span>Operational prioritization—not a statement of safety or fraud</span></div>
  </div>
</div>

<p class="takeaway"><b>The gap:</b> prioritization helps manage capacity, but it does not make the remaining review demand disappear.</p>

<!--
Open with the operating problem, not the technology. Many customers may warrant review, while the available analyst team currently prioritizes customers above the $50,000 credit-limit threshold.
That threshold does not prove lower-limit customers are safe or higher-limit customers are fraudulent. Do not add volume, time, loss, or cost estimates.
Likely challenge: “How many reviews are missed?” We have not measured that. The proposal is to establish evidence, not assert an outcome.
-->

---

<p class="kicker">The objective</p>

# Customer review protects both sides of the decision

<div class="balance-visual">
  <section class="downside">
    <small>Protect the business</small>
    <h3>Reduce avoidable exposure</h3>
    <ul><li>Bad-debt risk</li><li>Broader fraud risk</li><li>Inconsistent escalation</li></ul>
  </section>
  <div class="balance-center"><span></span><b>Better human review</b><i></i></div>
  <section class="opportunity">
    <small>Preserve the business</small>
    <h3>Keep viable opportunity open</h3>
    <ul><li>Justified credit decisions</li><li>Visible exceptions</li><li>Avoid unnecessary restriction</li></ul>
  </section>
</div>

<p class="takeaway"><b>The objective is not stricter rules.</b> It is easier, more consistent review without discarding justified opportunities.</p>

<!--
Customer review has two responsibilities: protect against downside and avoid blocking legitimate business.
AI should make the analyst’s work easier, but policy still needs room for accountable human exceptions.
Likely challenge: “Does this POC reduce fraud or bad debt?” No. Those are business objectives; the POC demonstrates a control pattern, not measured outcomes or fraud detection.
-->

---

<p class="kicker">The trust boundary</p>

# AI can reduce effort—but fluency is not a control

<div class="can-cannot">
  <section class="can">
    <span>AI assistance</span>
    <h3>Good at making work easier</h3>
    <div><b>Gather</b><small>Choose from bounded evidence lookups</small></div>
    <div><b>Draft</b><small>Turn supported intent into a rule candidate</small></div>
    <div><b>Explain</b><small>Translate deterministic evidence into readable prose</small></div>
  </section>
  <section class="cannot">
    <span>Retained authority</span>
    <h3>Never delegated to the model</h3>
    <div><b>Facts</b><small>Typed context and evidence values</small></div>
    <div><b>Controls</b><small>Validation, comparison, and action resolution</small></div>
    <div><b>Choice</b><small>Disposition and Demo Release activation</small></div>
  </section>
</div>

<p class="takeaway"><b>Credible prose is not proof.</b> The model cannot validate itself or establish that a decision follows policy.</p>

<!--
The model contributes where language helps. Deterministic code owns every claim that must be reproducible.
Likely challenge: “Can the explanation still be wrong?” Yes. It is generated text with validated references, not a semantic guarantee. The authoritative evidence remains visible above it.
-->

---

<p class="kicker">One pattern · Two jobs</p>

# The same authority pattern governs review and policy

<div class="dual-pattern">
  <section>
    <label>Customer Review</label>
    <div><b>Tier-1 context</b><span>Fictional facts</span></div><i>→</i>
    <div class="control-step"><b>Findings + action</b><span>Deterministic</span></div><i>→</i>
    <div class="ai-step"><b>AI assistance</b><span>Bounded evidence + explanation</span></div><i>→</i>
    <div><b>Disposition</b><span>Person</span></div>
  </section>
  <section>
    <label>Policy Studio</label>
    <div><b>Policy intent</b><span>Person</span></div><i>→</i>
    <div class="ai-step"><b>AI candidate</b><span>Bounded draft</span></div><i>→</i>
    <div class="control-step"><b>Validation + impact</b><span>Deterministic</span></div><i>→</i>
    <div><b>Demo Release</b><span>Person</span></div>
  </section>
</div>

<p class="pattern-line">AI drafts and explains <b>·</b> deterministic controls verify <b>·</b> a person decides</p>

<!--
The audience will see the same authority boundary twice. In Customer Review, deterministic Findings and action come first; generated rationale may then explain their evidence. In Policy Studio, a generated candidate must pass deterministic gates before a person can activate a Demo Release.
Likely challenge: “Who is accountable?” This anonymous POC captures a session-scoped choice, not identity or a durable audit. Production ownership and controls require discovery.
-->

---

<p class="kicker">Claims preview</p>

# What the audience is about to see

<div class="claims-grid">
  <article class="real"><span>Real</span><b>GPT-5.6 Luna calls</b><small>Deterministic evaluation, validation, comparison, and resolution</small></article>
  <article><span>Simulated</span><b>Bounded lookups</b><small>Fixed review context and evidence-tool results</small></article>
  <article><span>Fictional</span><b>Demo records</b><small>Customers, policies, evidence, cohort, and seeded override history</small></article>
  <article><span>Session-only</span><b>Browser-tab state</b><small>Dispositions, policy feedback, and activated Demo Releases</small></article>
</div>

<p class="warning"><b>Not connected:</b> CIS, Vertica, production data, durable audit, production policy publication, or customer mutation.</p>

<!--
Set the boundary before opening the app. In AI-enabled mode, the model calls are real. The customer and policy world around them is deliberately fictional and bounded.
The app is an illustrative POC, not a production integration or claim about official company policy.
Likely challenge: “Is this a scripted model response?” No in AI-enabled mode. If credentials are unavailable, static mode truthfully labels AI features disabled.
-->

---
layout: center
class: live-demo-slide
---

<div class="live-demo">
  <p class="kicker">Live · Customer Review</p>
  <h1>Can AI make the review easier<br><span>without making the decision?</span></h1>
  <div class="demo-steps">
    <article><b>1</b><span>Northwind</span><small>Auto pass · no Findings · no eligible tools</small></article>
    <article><b>2</b><span>Ironclad</span><small>Restrict action and evidence first · rationale second</small></article>
    <article><b>3</b><span>Cascade</span><small>Manager review · record a justified override</small></article>
  </div>
  <a href="/" target="_blank" rel="noopener noreferrer" class="demo-link">Open Customer Review <b>↗</b></a>
  <p class="demo-note">Independent app · opens in a new tab · fictional customer data</p>
</div>

<!--
LIVE DEMO SCRIPT — CUSTOMER REVIEW
1. Open the app in a new tab and sign in if AI-enabled mode is configured.
2. Select Northwind Components. Show AUTO_REVIEW_PASS, no Findings, and that no Tier-2 tool is eligible.
3. Select Ironclad Manufacturing. Show the deterministic NEED_TO_RESTRICT action, Findings with actual values and thresholds, then request the GPT-5.6 Luna rationale. Point out which eligible tools the model chose and that their results are fictional evidence, never decision input.
4. Select Cascade Freight. Show its two Findings and manager-review action. Record a fictional override with a reason so the session association appears in Policy Studio.
5. If the model fails, do not restart. Show that action, Findings, and Disposition remain usable. The failure demonstrates deterministic continuity.
Challenge response: the analyst overrides the action, not objective Findings.
-->

---
layout: center
class: live-demo-slide
---

<div class="live-demo">
  <p class="kicker">Live · Policy Studio</p>
  <h1>Can a policy owner change a threshold<br><span>without guessing its effect?</span></h1>
  <div class="demo-steps policy">
    <article><b>1</b><span>Draft</span><small>GPT-5.6 Luna proposes a supported candidate</small></article>
    <article><b>2</b><span>Verify</span><small>Validation, compatibility, and Review impact are deterministic</small></article>
    <article><b>3</b><span>Activate</span><small>A person activates a Demo Release in this browser tab</small></article>
  </div>
  <a href="/" target="_blank" rel="noopener noreferrer" class="demo-link">Open Policy Studio <b>↗</b></a>
  <p class="demo-note">Illustrative policies and 12-record Policy Impact Cohort · not production publication</p>
</div>

<!--
LIVE DEMO SCRIPT — POLICY STUDIO
1. Open Policy Studio and show the session-associated NET 30 override created in Customer Review.
2. Enter: “For customers on NET 30 terms, reduce the maximum past-due ratio from 8% to 5%.”
3. Ask GPT-5.6 Luna to draft the bounded candidate.
4. Run deterministic validation and compatibility analysis.
5. Show that three additional records require review in the illustrative 12-record Policy Impact Cohort.
6. Request the grounded policy-analysis explanation. If it fails, continue—the explanation is not an activation gate.
7. Approve and activate the Demo Release in this browser tab.
8. Return to Cascade and show release-pinned re-evaluation requiring a fresh Disposition.
Challenge response: only successful deterministic qualification enables activation; this is not production publication.
-->

---

<p class="kicker">Governed feedback</p>

# Two jobs become one improvement loop

<div class="feedback-loop">
  <article><span>01</span><b>Customer Review</b><small>Findings, action, and human Disposition</small></article>
  <i>→</i>
  <article><span>02</span><b>Visible exceptions</b><small>Repeated overrides become a policy question</small></article>
  <i>→</i>
  <article><span>03</span><b>Policy Studio</b><small>Candidate, compatibility, and Review impact</small></article>
  <i>→</i>
  <article><span>04</span><b>Demo Release</b><small>Pinned rules return to Customer Review</small></article>
</div>

<p class="warning"><b>POC boundary:</b> seeded history is fictional and current-session associations are tab-only. This is not production analytics or a durable audit.</p>

<!--
The product is more than two demos: analyst exceptions create a concrete agenda for policy owners, and every activated Demo Release sends customer review through fresh release-pinned evaluation.
Likely challenge: “Does an override prove a threshold is wrong?” No. It is evidence for investigation, not a conclusion.
-->

---

<p class="kicker">First extension</p>

# New-customer onboarding can reuse the control pattern

<div class="reuse-stack">
  <section>
    <label>Reuse</label>
    <div>Credit vocabulary + fact contracts</div>
    <div>Bounded AI operations</div>
    <div>Deterministic controls</div>
    <div>Release-pinned evidence</div>
    <div>Human authority</div>
  </section>
  <span>+</span>
  <section class="new-domain">
    <label>Add for onboarding</label>
    <div>Onboarding-specific facts</div>
    <div>Policies and workflow states</div>
    <div>Evidence sources and owners</div>
    <div>Escalation and approval controls</div>
  </section>
</div>

<p class="takeaway"><b>Reuse the pattern and credit semantics.</b> Do not force review and onboarding into one undifferentiated model.</p>

<!--
Onboarding is a plausible second use case because some credit vocabulary and governance concerns carry over. Its workflow and ownership still need separate discovery.
Likely challenge: “Can we just use the same rules?” Not automatically. Reuse contracts where meaning is shared; keep domain-specific authority explicit.
-->

---

<p class="kicker">Reuse after proof</p>

# A framework is earned by the second domain

<div class="domain-reuse">
  <section class="shared">
    <small>Potential shared governed workflow</small>
    <div>Facts</div><div>Drafts</div><div>Validation</div><div>Comparison</div><div>Releases</div><div>Evidence</div>
  </section>
  <section>
    <article><b>Credit review</b><span>Own vocabulary · rules · evidence · authority</span></article>
    <article><b>New-customer onboarding</b><span>Own vocabulary · rules · evidence · authority</span></article>
    <article class="future"><b>Future domain</b><span>Prove the seam before naming a platform</span></article>
  </section>
</div>

<p class="takeaway"><b>Do not call today’s code split a plugin platform.</b> Test reuse through a second bounded use case first.</p>

<!--
There is a credible reusable pattern, but one implementation does not prove a platform. The second use case should reveal what is genuinely shared and what belongs to each domain.
Likely challenge: “Why not standardize now?” Premature standardization can encode credit-review assumptions as generic architecture.
-->

---

<p class="kicker">Production direction · Not running in this POC</p>

# Integrate around CIS—do not replace its authority

<div class="production-map">
  <section><small>Authoritative facts</small><b>CIS APIs</b><span>Customer and credit values</span></section><i>→</i>
  <section class="accent"><small>Shared meaning</small><b>Fact contracts / ontology</b><span>Types, units, provenance, permitted use</span></section><i>→</i>
  <section><small>Controlled reasoning</small><b>Deterministic engines</b><span>Validation, policy execution, comparison</span></section><i>→</i>
  <section><small>Operational authority</small><b>CIS workflow</b><span>Identity, approval, audit, customer state</span></section>
</div>

<div class="candidate-tech"><b>Candidate responsibilities—not commitments</b><span>Jena + SHACL · DMN + Drools/Kogito · Z3 · release/artifact registry</span></div>

<div class="evidence-gates"><span>Discovery</span><i>→</i><span>Shadow comparison</span><i>→</i><span>Advisory use</span><i>→</i><span>Separately approved enforcement</span></div>

<!--
Everything on this slide is production direction and is not running in the POC. CIS remains authoritative for facts, workflow, and customer state.
Named technologies are candidates by responsibility, not selected architecture or commitments. Discovery must determine what already exists and should be reused.
Likely challenge: “When could this enforce a decision?” No timeline is proposed. Enforcement would require separate evidence and approval after discovery, shadow, and advisory stages.
-->

---

<p class="kicker">The management decision</p>

# The next step is bounded evidence—not a platform commitment

<div class="ask-list">
  <article><b>01</b><span>Confirm one bounded review policy and scenario</span></article>
  <article><b>02</b><span>Nominate a credit analyst and policy owner to validate the workflow</span></article>
  <article><b>03</b><span>Permit read-only discovery of authoritative CIS facts and review states</span></article>
  <article><b>04</b><span>Agree what evidence is required before shadow comparison</span></article>
  <article><b>05</b><span>Decide whether onboarding is the second proving use case</span></article>
</div>

<p class="closing-ask">Prove the control pattern on a real, bounded workflow—then decide what deserves to scale.</p>

<!--
This is an evidence request, not a funding request, timeline, production commitment, or compliance claim.
The highest-value input is direct workflow validation from a credit analyst and policy owner, followed by read-only discovery around CIS.
Likely challenge: “What are you asking us to approve today?” Access to validate the workflow and establish the evidence needed for a shadow comparison—nothing more.
-->

---

<p class="kicker">Appendix · Current boundary</p>

# What is real in this POC?

<table class="reality-table">
  <thead><tr><th>Label</th><th>What it means here</th></tr></thead>
  <tbody>
    <tr><th>Real</th><td>GPT-5.6 Luna calls in AI-enabled mode; Hono gateway; deterministic controls; access gate</td></tr>
    <tr><th>Simulated</th><td>Fixed Tier-1 Review Context and bounded Tier-2 Evidence lookups</td></tr>
    <tr><th>Fictional</th><td>Customers, illustrative policies, evidence, cohort, and seeded history</td></tr>
    <tr><th>Session-only</th><td>Disposition, feedback associations, and Demo Releases in one browser tab</td></tr>
    <tr><th>Absent</th><td>CIS/Vertica/MCP, production data, identity/roles, durable audit, mutation, production publication</td></tr>
  </tbody>
</table>

<p class="boundary"><b>Approved claim:</b> a real LLM drafts and explains; deterministic code validates, compares, evaluates, and resolves; a person records the final session-scoped Disposition.</p>

<!--
This matrix is the source of truth for demo claims. Real refers to the operation, not the surrounding fictional data.
In static mode, the product label changes to “AI features disabled” and no provider call is made.
-->

---

<p class="kicker">Appendix · Decision inputs</p>

# What data can influence the action?

<div class="tier-split">
  <section class="tier-one">
    <span>Tier 1</span><h3>Tier-1 Review Context</h3>
    <b>Decision input</b>
    <p>Complete, typed facts used by deterministic rules and action resolution.</p>
    <small>Same facts + same Demo Release = same Findings and action</small>
  </section>
  <div class="one-way"><b>Findings unlock tools</b><i>→</i><small>Evidence never flows back into action</small></div>
  <section class="tier-two">
    <span>Tier 2</span><h3>Tier-2 Evidence</h3>
    <b>Narrative support only</b>
    <p>Payment history, open disputes, and recent orders selected from eligible tools.</p>
    <small>Fictional fixed lookups · model may call zero or several</small>
  </section>
</div>

<p class="takeaway"><b>Load-bearing constraint:</b> Tier-2 Evidence can explain an action; it cannot change one.</p>

<!--
There is no parent-exposure or financial-group relationship tool. Internal financial groups do not imply a parent relationship.
Tier-1-only action resolution is explicitly checked rather than trusted to prompt instructions.
-->

---

<p class="kicker">Appendix · Deterministic evidence</p>

# How is every Finding traceable?

<div class="trace-card">
  <header><code>credit-1.4.0/CRITICAL_RESTRICTION@1</code><b>FINDING</b></header>
  <div class="trace-policy"><small>Illustrative policy</small><strong>Restrict when past due is above 10%, operating cash flow is negative, and current ratio is below 1.</strong></div>
  <div class="trace-observations">
    <article><span>Past-due ratio</span><b>20%</b><small>&gt; 10% · PERCENT · matched</small></article>
    <article><span>Operating cash flow</span><b>−$35,000</b><small>&lt; $0 · CURRENCY · matched</small></article>
    <article><span>Current ratio</span><b>0.8</b><small>&lt; 1 · NUMBER · matched</small></article>
  </div>
  <footer><span>Reason: CRITICAL_RESTRICTION</span><span>Action hint: NEED_TO_RESTRICT</span><span>Ontology + resolver versions pinned</span></footer>
</div>

<p class="takeaway">Policy statement, actual values, operators, thresholds, units, dependencies, and provenance travel together.</p>

<!--
This is representative of the Rule Evaluation Trace shown for fictional Ironclad Manufacturing. The browser formats typed raw values; the model does not calculate them.
The final action resolver consumes Findings only. Missing or unknown values remain explicit rather than becoming a guessed pass or failure.
-->

---

<p class="kicker">Appendix · Model contract</p>

# What can the model actually do?

<div class="operation-grid">
  <article><code>draft_rule</code><b>Draft</b><span>Two supported families only</span><small>NET30_PAST_DUE_MAX<br>HIGH_BALANCE_ADP_MAX</small></article>
  <article><code>explain_review</code><b>Explain</b><span>References deterministic review evidence</span><small>May call three eligible, zero-argument evidence tools</small></article>
  <article><code>explain_policy_analysis</code><b>Explain</b><span>References completed deterministic analysis</span><small>Receives summary evidence—not customer rows</small></article>
</div>

<div class="schema-band"><b>Bounded contract</b><span>Named operations · JSON Schema · closed fields · server-owned prompts/tools · validated references</span></div>
<div class="forbidden-band"><b>Forbidden authority</b><span>No facts, validation result, action, approval, activation, ontology definition, or Disposition from model output</span></div>

<!--
There is no generic completion endpoint, free SQL, schema exploration, or arbitrary rule authoring. The gateway validates response shape and references and never silently repairs model output.
Tool calls are supported only inside explain_review and only when deterministic reason codes make a tool eligible.
-->

---

<p class="kicker">Appendix · Failure behavior</p>

# What happens when the model fails?

<div class="failure-grid">
  <article><b>Timeout or unavailable</b><span>Localized retry state; deterministic evidence remains visible</span></article>
  <article><b>Invalid output</b><span>Rejected whole; no partial generated prose or candidate appears</span></article>
  <article><b>Needs clarification</b><span>One bounded question; no rule candidate is invented</span></article>
  <article><b>Unsupported intent</b><span>Stops honestly; no arbitrary policy is drafted</span></article>
</div>

<div class="continuity-flow"><span>Action</span><span>Rule Evaluation Traces</span><span>Deterministic policy gates</span><span>Disposition / activation choice</span></div>

<p class="takeaway"><b>Continuity is the control.</b> Review and qualified activation do not become unavailable because generated explanation failed.</p>

<!--
Provider and operation deadlines are bounded, there are no invisible retries, and explicit retry starts a new operation.
For policy drafting, failure means no candidate. For policy explanation after deterministic qualification, failure does not block activation.
-->

---

<p class="kicker">Appendix · Review impact</p>

# How is policy impact calculated?

<div class="impact-compare">
  <section><small>Active Demo Release</small><b>NET 30 maximum: 8%</b><span>Evaluate all 12 fictional cohort records</span></section>
  <i>vs</i>
  <section class="candidate"><small>Candidate revision</small><b>NET 30 maximum: 5%</b><span>Evaluate the same records and compare outcomes</span></section>
  <div><strong>3</strong><b>additional records require review</b><small>Ratios at 6%, 7%, and 8% cross the candidate boundary</small></div>
</div>

<div class="completeness">evaluated · newly required · cleared · changed actions · added/resolved Findings · indeterminate · errors · <b>complete</b></div>

<p class="warning"><b>Illustrative cohort:</b> no extrapolation to portfolio volume, staffing, time, cost, or loss.</p>

<!--
Review impact is deterministic workload evidence, not a model estimate. Equality boundaries are explicit and the changed records are shown first.
Any indeterminate or error makes impact incomplete and blocks activation.
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
    <tr><td>AI access</td><td>Hono gateway + GPT-5.6 Luna</td><td>Approved gateway, controls, observability, and release integration</td></tr>
  </tbody>
</table>

<p class="boundary">CIS supplies authoritative values and retains operational authority. The ontology defines shared meaning, types, units, provenance, and permitted policy use.</p>

<!--
These are responsibility mappings, not selected products or architecture commitments. Read-only discovery should first identify existing CIS capabilities and avoid rebuilding them.
Detailed production questions and phased gates live in NEXT_STEPS.md.
-->

---

<p class="kicker">Appendix · Production discovery · Not running in this POC</p>

# What must production discovery answer?

<div class="discovery-questions">
  <article><b>Workflow</b><span>What triggers review, what do analysts inspect, and what does each action mean operationally?</span></article>
  <article><b>$50,000 prioritization</b><span>Where is it enforced, what exceptions exist, and what lower-limit demand is visible?</span></article>
  <article><b>Facts and APIs</b><span>Which CIS sources are authoritative, typed, fresh, and available read-only?</span></article>
  <article><b>Policy ownership</b><span>Who owns thresholds, exceptions, activation, and rollback?</span></article>
  <article><b>Controls</b><span>Which identity, audit, approval, retention, and segregation controls already exist?</span></article>
  <article><b>Evidence</b><span>Which sanitized cases and shadow measures would justify moving beyond the POC?</span></article>
</div>

<a class="next-steps-link" href="https://github.com/lifanh/ontology-demo/blob/main/NEXT_STEPS.md" target="_blank" rel="noopener noreferrer">Read the detailed production integration questions in NEXT_STEPS.md ↗</a>

<!--
This is the domain-knowledge gap made explicit. Do not delegate it to the model or fill it with generic credit-analysis conventions.
Start with 30 minutes with the people who run customer reviews, then verify system contracts read-only. Discovery should produce evidence and ownership, not a timeline promise.
-->
