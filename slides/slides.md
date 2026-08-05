---
theme: default
title: AI-Assisted Customer Credit Review
titleTemplate: '%s · Make review easier without giving AI decision authority'
author: Lifan Huang
info: |
  A management walkthrough of an illustrative POC in which GitHub Copilot
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
    <p class="author">Lifan Huang</p>
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
class: architecture-slide
---

<p class="kicker">Target production direction · Not running in this POC</p>

# The full architecture keeps operational authority in CIS

<div class="architecture-poster">
  <section class="architecture-zone experience-zone">
    <header><i>1</i><b>Experience & workflow</b></header>
    <div class="experience-parts">
      <span>Customer Review UI</span><span>Customer Review API / Events</span><span>Identity & roles</span>
    </div>
  </section>

  <section class="architecture-zone cis-zone">
    <header><i>2</i><b>CIS authority</b></header>
    <ul>
      <li>Review application service</li><li>Authoritative customer facts</li><li>Review workflow / state / disposition</li><li>Audit</li><li>Customer-state mutation</li>
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
      <li>Customer facts adapter</li><li>PolicyDecisionPort</li><li>Approved pinned policy release</li><li>Candidate DMN runtime</li><li>Deterministic Findings</li><li>Recommendations + advisory calculations</li>
    </ol>
    <p>Fast · deterministic · isolated from authoring</p>
  </section>

  <div class="release-lane" aria-label="Only an immutable approved release crosses from the policy control plane into the review-time runtime"><b>←</b><span>Only immutable approved release</span></div>

  <section class="architecture-zone control-plane-zone">
    <header><i>4</i><b>Policy control plane</b><small>Authoring-time only</small></header>
    <div class="control-sequence">
      <span>Review Policy UI · policy intent</span><em>↓</em>
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
Use this as the map for the rest of the walkthrough. Start in the center: CIS is authoritative for facts, review workflow, disposition, audit, and customer state. Move right through the green review-time runtime, then explain the separately governed policy-authoring path.
AI may draft structured policy, but deterministic systems validate, compile, compare, and qualify it before an authorized person can approve publication. Only an immutable approved release crosses into the review-time runtime.
Jena/SHACL, DMN, and Z3 are candidate production components from NEXT_STEPS.md; none runs in the current POC.
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
    <div><b>Choice</b><small>Approve and publish the rules updates</small></div>
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
    <div><b>Customer ontology facts</b><span>Fictional facts</span></div><i>→</i>
    <div class="control-step"><b>Findings + action</b><span>Deterministic</span></div><i>→</i>
    <div class="ai-step"><b>AI assistance</b><span>Bounded evidence + explanation</span></div><i>→</i>
    <div><b>Disposition</b><span>Person</span></div>
  </section>
  <section>
    <label>Review Policy</label>
    <div><b>Policy intent</b><span>Person</span></div><i>→</i>
    <div class="ai-step"><b>AI candidate</b><span>Bounded draft</span></div><i>→</i>
    <div class="control-step"><b>Validation + impact</b><span>Deterministic</span></div><i>→</i>
    <div><b>Publish Policy</b><span>Outside this POC</span></div>
  </section>
</div>

<p class="pattern-line">AI drafts and explains <b>·</b> deterministic controls verify <b>·</b> a person decides</p>

<!--
The audience will see the same authority boundary twice. In Customer Review, deterministic Findings and action come first; generated rationale may then explain their evidence. In Review Policy, a generated candidate can be validated, compared, and impact-assessed, but not approved, published, or activated.
Likely challenge: “Who is accountable?” This anonymous POC captures a session-scoped choice, not identity or a durable audit. Production ownership and controls require discovery.
-->

---
layout: center
class: live-demo-slide
---

<div class="live-demo">
  <p class="kicker">Live · Customer Review</p>
  <h1>Can AI make the review easier<br><span>without making the decision?</span></h1>
  <a href="/" target="_blank" rel="noopener noreferrer" class="demo-link">Open Customer Review <b>↗</b></a>
</div>

<!--
LIVE DEMO SCRIPT — CUSTOMER REVIEW
1. Open the app in a new tab and sign in if AI-enabled mode is configured.
2. Select Northwind Components. Show AUTO_REVIEW_PASS, no Findings, and that no Tier-2 tool is eligible.
3. Select Ironclad Manufacturing. Show the deterministic NEED_TO_RESTRICT action, Findings with actual values and thresholds, then request the GitHub Copilot rationale. Point out which eligible tools the model chose and that their results are fictional evidence, never decision input.
4. Select Cascade Freight. Show its two Findings and manager-review action. Record a fictional replacement with a reason, then open Review Policy as the separate authoring workbench.
5. If the model fails, do not restart. Show that action, Findings, and Disposition remain usable. The failure demonstrates deterministic continuity.
Challenge response: the analyst overrides the action, not objective Findings.
-->

---
layout: center
class: live-demo-slide
---

<div class="live-demo">
  <p class="kicker">Live · Review Policy</p>
  <h1>Can a policy owner change a threshold<br><span>without guessing its effect?</span></h1>
  <div class="demo-steps policy">
    <article><b>1</b><span>Draft</span><small>GitHub Copilot proposes a supported candidate</small></article>
    <article><b>2</b><span>Verify</span><small>Validation, compatibility, and Review impact are deterministic</small></article>
    <article><b>3</b><span>Assess</span><small>Compare customer impact against the active policy</small></article>
  </div>
  <a href="/" target="_blank" rel="noopener noreferrer" class="demo-link">Open Review Policy <b>↗</b></a>
  <p class="demo-note">Illustrative policies and 12-record Policy Impact Cohort · no approval, publication, or activation</p>
</div>

<!--
LIVE DEMO SCRIPT — REVIEW POLICY
1. Open Review Policy and choose the NET 30 example intent. Point out the Policy Change canvas, Active Policy Version, structured diff, and persistent evidence spine; the examples are not a queue.
2. Enter: “For customers on NET 30 terms, reduce the maximum past-due ratio from 8% to 5%.”
3. Ask GitHub Copilot to draft the bounded candidate.
4. Run deterministic validation and compatibility analysis.
5. Show that three additional records require review in the illustrative 12-record Policy Impact Cohort.
6. At Evidence complete, read the outside-this-POC governance boundary, then optionally request the grounded policy-analysis explanation. If it fails, continue—the deterministic assessment remains available.
7. Point out that the workbench stops at impact assessment: it cannot approve, publish, or activate the candidate.
Challenge response: this POC prepares evidence for an authorized policy decision; it does not make or execute that decision.
-->

---

<p class="kicker">Governed feedback</p>

# Two jobs become one improvement loop

<div class="feedback-loop">
  <article><span>01</span><b>Customer Review</b><small>Findings, action, and human Disposition</small></article>
  <i>→</i>
  <article><span>02</span><b>Visible exceptions</b><small>Repeated overrides become a policy question</small></article>
  <i>→</i>
  <article><span>03</span><b>Review Policy</b><small>Candidate, compatibility, and Review impact</small></article>
  <i>→</i>
  <article><span>04</span><b>Publish new policy</b><small>Authorized production workflow</small></article>
</div>

<!--
The product is more than two demos: analyst exceptions create a concrete agenda for policy owners, while deterministic candidate analysis makes the possible customer-review impact inspectable before any authorized production decision.
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

# A Framework can be shared to other domains

<div class="domain-reuse">
  <section class="shared">
    <small>Potential shared governed workflow</small>
    <div>Facts</div><div>Drafts</div><div>Validation</div><div>Comparison</div><div>Releases</div><div>Evidence</div>
  </section>
  <section>
    <article><b>Credit review</b><span>Own vocabulary · rules · evidence · authority</span></article>
    <article><b>New-customer onboarding</b><span>Own vocabulary · rules · evidence · authority</span></article>
    <article><b>Other domains</b><span>Own vocabulary · rules · evidence · authority</span></article>
  </section>
</div>

<!--
The framework shares a governed workflow while each domain retains its own vocabulary, rules, evidence, and authority.
One implementation does not prove a platform. A second bounded use case should reveal what is genuinely shared and what belongs to each domain.
Likely challenge: “Why not standardize now?” Premature standardization can encode credit-review assumptions as generic architecture.
-->

---

<p class="kicker">Appendix · Current boundary</p>

# What is real in this POC?

<table class="reality-table">
  <thead><tr><th>Label</th><th>What it means here</th></tr></thead>
  <tbody>
    <tr><th>Real</th><td>GitHub Copilot SDK calls in AI-enabled mode; Hono gateway; deterministic controls; access gate</td></tr>
    <tr><th>Simulated</th><td>Fixed Tier-1 Review Context and bounded Tier-2 Evidence lookups</td></tr>
    <tr><th>Fictional</th><td>Customers, illustrative policies, evidence, cohort, and seeded history</td></tr>
    <tr><th>Session-only</th><td>Review workflow, Dispositions, and policy authoring state in one browser tab</td></tr>
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
    <small>Same facts + same active policy version = same Findings and action</small>
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

<div class="continuity-flow"><span>Action</span><span>Rule Evaluation Traces</span><span>Deterministic policy gates</span><span>Disposition / impact assessment</span></div>

<p class="takeaway"><b>Continuity is the control.</b> Review and deterministic impact assessment do not become unavailable because generated explanation failed.</p>

<!--
Provider and operation deadlines are bounded, there are no invisible retries, and explicit retry starts a new operation.
For policy drafting, failure means no candidate. For policy explanation after deterministic qualification, failure does not block inspection of the completed impact assessment.
-->

---

<p class="kicker">Appendix · Review impact</p>

# How is policy impact calculated?

<div class="impact-compare">
  <section><small>Active policy version</small><b>NET 30 maximum: 8%</b><span>Evaluate all 12 fictional cohort records</span></section>
  <i>vs</i>
  <section class="candidate"><small>Candidate revision</small><b>NET 30 maximum: 5%</b><span>Evaluate the same records and compare outcomes</span></section>
  <div><strong>3</strong><b>additional records require review</b><small>Ratios at 6%, 7%, and 8% cross the candidate boundary</small></div>
</div>

<div class="completeness">evaluated · newly required · cleared · changed actions · added/resolved Findings · indeterminate · errors · <b>complete</b></div>

<p class="warning"><b>Illustrative cohort:</b> no extrapolation to portfolio volume, staffing, time, cost, or loss.</p>

<!--
Review impact is deterministic workload evidence, not a model estimate. Equality boundaries are explicit and the changed records are shown first.
Any indeterminate or error makes the impact assessment incomplete; the current POC has no activation action.
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
    <tr><td>AI access</td><td>Hono gateway + GitHub Copilot SDK</td><td>Approved provider, controls, observability, and release integration</td></tr>
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
