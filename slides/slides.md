---
theme: default
title: Customer Review Ontology
titleTemplate: '%s · Governed AI-Assisted Credit Policy Reasoning for CIS'
author: Customer Review Ontology
info: |
  An illustrative showcase of how governed AI, shared credit semantics,
  and deterministic reasoning could support policy evolution around CIS.
favicon: /slides/favicon.svg
fonts:
  sans: Manrope
  mono: DM Mono
  local: Manrope,DM Mono
  provider: none
exportFilename: customer-review-ontology
transition: fade
mdc: true
routerMode: hash
defaults:
  layout: default
---

<div class="cover-grid">
  <div>
    <div class="brand-lockup"><span class="brand-symbol"><i></i><i></i><i></i></span><b>Customer Review Ontology</b></div>
    <p class="kicker">Innovation showcase</p>
    <h1>Customer Review<br><span>Ontology</span></h1>
    <p class="subtitle">Governed AI-Assisted Credit Policy Reasoning for CIS</p>
    <p class="trust-line">AI drafts · shared semantics ground · deterministic engines decide · people govern</p>
  </div>
  <div class="cover-orbit" aria-hidden="true">
    <span>AI</span><span>ONTOLOGY</span><span>REASONING</span><b>CIS</b>
  </div>
</div>

<div class="slide-footer"><span>Illustrative showcase</span><span>Customer Review Ontology</span></div>

<!--
Open by setting expectations: this is an innovation showcase, not a funding request or production commitment.
The proposition is controlled AI adoption in the credit domain. AI accelerates drafting, while deterministic systems and people retain authority.
-->

---

<p class="kicker">The opportunity</p>

# Credit policy changes cross several worlds

<div class="problem-flow">
  <article><small>01</small><b>Business intent</b><span>Policy starts as language, context, and judgment.</span></article>
  <i>→</i>
  <article><small>02</small><b>CIS data</b><span>Operational facts arrive through technical API contracts.</span></article>
  <i>→</i>
  <article><small>03</small><b>Executable rules</b><span>Scope, thresholds, precedence, and exceptions must be exact.</span></article>
  <i>→</i>
  <article><small>04</small><b>Governed change</b><span>Impact must be understood before activation.</span></article>
</div>

<div class="executive-callout">
  <b>A locally reasonable change can still contradict the active policy set.</b>
  <span>Manual translation slows change; opaque automation increases operational and audit risk.</span>
</div>

<!--
Describe the translation problem rather than blaming CIS or current teams.
Credit policy is expressed by people, but production execution needs exact facts, types, units, scope, and precedence.
The risk is not only malformed rules. A valid rule may still conflict with an active rule.
-->

---

<p class="kicker">The trust model</p>

# Safe AI adoption requires clear authority

<div class="authority-grid">
  <article class="ai"><span>01</span><h3>AI</h3><b>Draft and explain</b><p>Produces a bounded proposal. It remains untrusted input.</p></article>
  <article class="ontology"><span>02</span><h3>Customer Review Ontology</h3><b>Define shared meaning</b><p>Provides facts, types, units, relationships, and provenance.</p></article>
  <article class="engine"><span>03</span><h3>Deterministic engines</h3><b>Validate and execute</b><p>Compare, qualify, calculate, and return stable evidence.</p></article>
  <article class="people"><span>04</span><h3>People + CIS</h3><b>Govern outcomes</b><p>Approve releases and retain authority over customer state.</p></article>
</div>

<p class="principle"><b>AI may propose.</b> It does not validate itself, activate policy, or make the final credit decision.</p>

<!--
This is the sentence to remember: AI proposes; ontology supplies meaning; deterministic systems validate and execute; people govern.
The separation lets us use AI for speed without confusing fluency with authority.
-->

---

<p class="kicker">Shared semantics</p>

# From CIS APIs to governed credit facts

<div class="fact-pipeline">
  <article><small>System of record</small><h3>CIS APIs</h3><p>Authoritative customer and credit values</p></article>
  <span>→</span>
  <article class="accent"><small>Translation boundary</small><h3>Facts adapter</h3><p>Names · types · units · nulls · freshness · provenance</p></article>
  <span>→</span>
  <article><small>Shared contract</small><h3>Customer Review Ontology</h3><p>Consistent meaning across authoring and evaluation</p></article>
</div>

<div class="fact-examples">
  <div><code>ar_balance</code><b>125,000</b><small>USD · CIS source fact</small></div>
  <div><code>payment_terms</code><b>NET_30</b><small>Controlled value</small></div>
  <div><code>past_due_ratio</code><b>12%</b><small>Deterministically derived</small></div>
  <div><code>adp_days</code><b>28</b><small>DAYS · typed unit</small></div>
</div>

<p class="boundary"><b>Important distinction:</b> CIS APIs supply fact values. The ontology defines what those facts mean and how policy may use them.</p>

<!--
The demo has 18 source facts and 10 derived facts. That is illustrative scale, not a final CIS data dictionary.
The adapter is important: similarly named fields are not assumed to have identical business meaning.
Derived facts, such as past-due ratio, are calculated deterministically rather than by the AI.
-->

---

<p class="kicker">Illustrative browser showcase</p>

# One bounded policy lifecycle, end to end

<div class="lifecycle">
  <div><b>1</b><span>Describe</span><small>Human intent</small></div>
  <i></i>
  <div><b>2</b><span>Draft</span><small>AI proposal</small></div>
  <i></i>
  <div><b>3</b><span>Validate</span><small>Facts + grammar</small></div>
  <i></i>
  <div><b>4</b><span>Reason</span><small>Active release</small></div>
  <i></i>
  <div><b>5</b><span>Qualify</span><small>13-customer batch</small></div>
  <i></i>
  <div><b>6</b><span>Publish</span><small>Human approval</small></div>
</div>

<div class="stat-grid">
  <article><strong>18</strong><span>source facts</span></article>
  <article><strong>10</strong><span>derived facts</span></article>
  <article><strong>6</strong><span>active policies</span></article>
  <article><strong>13</strong><span>fictional portfolio cases</span></article>
</div>

<p class="warning"><b>Boundary:</b> static browser showcase, fictional data, in-memory state. No CIS API, external model, production engine, persistence, or automatic customer mutation.</p>

<!--
Orient the audience before leaving the deck.
The latest showcase is more than prompt generation: it carries an exact revision through validation, conflict analysis, portfolio qualification, and one-session publication.
Everything resets on refresh and nothing changes a real customer.
-->

---

<p class="kicker">Happy path</p>

# A stricter NET 30 policy is a compatible refinement

<blockquote>“Customers with NET 30 payment terms cannot have more than <b>5%</b> of their AR balance past due.”</blockquote>

<div class="thresholds">
  <article><small>Global ceiling</small><strong>10%</strong><span>All applicable customers</span></article>
  <article><small>Active NET 30 revision</small><strong>8%</strong><span>Scoped maximum</span></article>
  <article class="candidate"><small>Candidate NET 30 revision</small><strong>5%</strong><span>Stricter, not contradictory</span></article>
</div>

<div class="relationship-good"><span>8% active</span><i>→</i><span>5% candidate</span><b>COMPATIBLE REFINEMENT</b></div>

<!--
This is a revision of the stable NET30 rule, not an unrelated duplicate rule.
The candidate is stricter than both the active scoped 8% limit and the global 10% maximum.
Next, open the demo and carry this exact revision through the complete lifecycle.
-->

---
layout: center
class: live-demo-slide
---

<div class="live-demo">
  <p class="kicker">Live walkthrough · happy path</p>
  <h1>Qualify the exact revision<br><span>before publication</span></h1>
  <ol>
    <li>Generate a bounded, ontology-grounded proposal</li>
    <li>Validate and compare with the active release</li>
    <li>Run the same evaluator over 13 fictional customers</li>
    <li>Approve and publish only after evidence is complete</li>
  </ol>
  <a href="/" target="_blank" rel="noopener noreferrer" class="demo-link">Open interactive demo <b>↗</b></a>
  <p class="demo-note">The demo opens in a separate tab. This deck keeps its current slide and presenter state.</p>
</div>

<!--
LIVE DEMO SCRIPT — HAPPY PATH
1. Open the interactive demo using the button. Confirm “5% refinement” is selected.
2. Select Generate LLM prompt. Point out that the ontology and bounded grammar are included automatically.
3. Select Simulate AI response. Emphasize “untrusted input.”
4. Select Validate syntax. Show that evidence is tied to the exact candidate revision.
5. Select Analyze conflicts. Expected result: compatible refinement against active release credit-1.4.0.
6. Select Run current batch. Show the baseline/candidate comparison over 13 fictional customers. The batch qualifies but never approves.
7. Select Approve & publish. Show the new complete release and pinned runtime context.
8. Return to this deck tab.
If time is short, stop after conflict analysis and explain the remaining gates from the displayed workflow.
-->

---

<p class="kicker">Conflict path</p>

# A valid rule can still be unsafe to publish

<blockquote>“Customers with NET 30 payment terms may have up to <b>15%</b> of their AR balance past due.”</blockquote>

<div class="conflict-visual">
  <div class="limit global"><span>Global maximum</span><b>10%</b></div>
  <div class="limit active"><span>Active NET 30</span><b>8%</b></div>
  <div class="limit proposed"><span>Candidate allows</span><b>15%</b></div>
  <div class="conflict-zone"><b>Contradictory overlap</b><span>Candidate permits outcomes the global policy forbids.</span></div>
</div>

<div class="blocked"><b>CONFLICT</b><span>Batch progression and publication remain blocked.</span></div>

<!--
LIVE DEMO SCRIPT — CONFLICT PATH
1. Return to the demo tab and choose “15% conflict.”
2. Generate the prompt, simulate the response, and validate it.
3. Select Analyze conflicts.
4. Show that syntax and ontology validation can succeed while semantic policy compatibility fails.
5. Point out that Run current batch and Approve & publish cannot progress.
The important point is the governance boundary, not the percentage arithmetic.
-->

---

<p class="kicker">Evidence, not theatre</p>

# What the showcase proves—and what it does not

<div class="proof-grid">
  <section>
    <h3><span class="good-dot"></span> Demonstrates</h3>
    <ul>
      <li>Ontology-grounded AI drafting</li>
      <li>Typed and unit-aware validation</li>
      <li>Revision-aware policy comparison</li>
      <li>Portfolio impact qualification</li>
      <li>Stable findings and reason codes</li>
      <li>Explicit approval and release boundaries</li>
    </ul>
  </section>
  <section>
    <h3><span class="neutral-dot"></span> Not production evidence</h3>
    <ul>
      <li>No live CIS APIs or customer records</li>
      <li>No production identity or durable audit</li>
      <li>No production Jena, DMN, or Z3 runtime</li>
      <li>No availability or performance claim</li>
      <li>No unrestricted natural-language policies</li>
      <li>No autonomous customer decision</li>
    </ul>
  </section>
</div>

<!--
This slide is essential for credibility.
The browser implementation proves the trust model and workflow boundaries. It does not prove production readiness or imply that named production technologies are already executing.
-->

---

<p class="kicker">Target direction</p>

# Integrate around CIS—do not replace it

<div class="architecture">
  <section class="control-plane">
    <label>Policy control plane</label>
    <div><b>Policy owner</b><span>+ governed AI</span></div><i>→</i>
    <div><b>Typed candidate</b><span>Customer Review Ontology contract</span></div><i>→</i>
    <div><b>Validate + prove</b><span>SHACL · DMN · Z3</span></div><i>→</i>
    <div class="accent"><b>Approved release</b><span>immutable + auditable</span></div>
  </section>
  <section class="runtime-plane">
    <label>CIS review runtime</label>
    <div><b>CIS APIs</b><span>authoritative facts</span></div><i>→</i>
    <div><b>Facts adapter</b><span>ontology contract</span></div><i>→</i>
    <div><b>Pinned evaluation</b><span>findings + reasons</span></div><i>→</i>
    <div class="cis"><b>CIS workflow</b><span>final authority</span></div>
  </section>
  <div class="release-arrow">approved release ↓</div>
</div>

<p class="boundary"><b>Runtime boundary:</b> AI stays off the transaction-time evaluation path. CIS remains the system of record and owns every customer-state mutation.</p>

<!--
The proposed shape has a control plane for authoring and governance, and a low-latency runtime integrated at the existing CIS credit-review decision point.
The exact deployment topology remains a discovery decision. The important contracts and authority boundaries remain the same.
-->

---

<p class="kicker">Bounded responsibilities</p>

# Scale each capability with the right production tool

<table class="capability-table">
  <thead><tr><th>Responsibility</th><th>Showcase today</th><th>Production direction</th></tr></thead>
  <tbody>
    <tr><td>Shared semantics</td><td>JavaScript fact registry</td><td><b>Customer Review Ontology RDF/OWL vocabulary</b></td></tr>
    <tr><td>Semantic conformance</td><td>Custom property checks</td><td><b>Apache Jena + SHACL</b></td></tr>
    <tr><td>Shared policy contract</td><td>Bounded AST</td><td><b>Canonical typed policy model</b></td></tr>
    <tr><td>Deterministic execution</td><td>Modular evaluator</td><td><b>DMN + Kogito/Drools</b></td></tr>
    <tr><td>Conflict proof</td><td>Bounded comparison</td><td><b>Z3 constraint solver</b></td></tr>
    <tr><td>Governed release</td><td>In-memory evidence</td><td><b>CIS identity, audit + artifact registry</b></td></tr>
    <tr><td>Assisted authoring</td><td>Mocked prompt</td><td><b>Provider-neutral enterprise AI gateway</b></td></tr>
  </tbody>
</table>

<p class="table-note">Technology names define responsibilities—not permission to put every component on the CIS transaction path.</p>

<!--
Keep this at responsibility level. The standards matter because they offer reviewable contracts and established tooling, but product selection comes after CIS discovery.
Jena validates semantic shape. DMN executes approved decisions. Z3 proves satisfiability and conflict witnesses. None of them approves policy by itself.
-->

---

<p class="kicker">Possible evolution path</p>

# Move through evidence gates, not a big-bang replacement

<div class="roadmap">
  <article><b>01</b><h3>Discover</h3><p>Map CIS APIs, current policy, decision ownership, and authoritative facts.</p></article>
  <article><b>02</b><h3>Contract</h3><p>Define the Customer Review Ontology fact dictionary and canonical policy model.</p></article>
  <article><b>03</b><h3>Govern</h3><p>Add immutable revisions, qualification, approval, audit, and rollback.</p></article>
  <article><b>04</b><h3>Shadow</h3><p>Compare with current behavior without changing CIS outcomes.</p></article>
  <article><b>05</b><h3>Advise</h3><p>Expose explainable findings to authorized credit reviewers.</p></article>
  <article><b>06</b><h3>Bound</h3><p>Only if approved, enforce selected policies with a kill switch.</p></article>
</div>

<div class="gate-line"><span>decision gate</span><span>decision gate</span><span>decision gate</span><span>decision gate</span><span>decision gate</span></div>

<p class="boundary"><b>No timeline implied.</b> Each transition depends on CIS evidence, reconciled outcomes, approved authority, and rollback readiness.</p>

<!--
This is not a delivery proposal. It shows that the architecture can be adopted incrementally.
The safest sequence is disabled, shadow, advisory, then narrowly bounded enforcement only if a later decision authorizes it.
-->

---
layout: center
class: closing-slide
---

<div class="closing">
  <p class="kicker">Customer Review Ontology</p>
  <h1>Accelerate policy work.<br><span>Preserve control.</span></h1>
  <div class="closing-points">
    <article><b>AI</b><span>speeds bounded drafting</span></article>
    <article><b>Ontology</b><span>aligns language with CIS facts</span></article>
    <article><b>Reasoning</b><span>makes policy testable and explainable</span></article>
    <article><b>Governance</b><span>keeps activation and outcomes authorized</span></article>
  </div>
  <p class="closing-line">A practical pattern for safer AI adoption in the credit domain.</p>
</div>

<!--
Close without asking for budget or approval.
The showcase demonstrates a pattern: use AI where it adds speed, and place shared semantics, deterministic evidence, release governance, and human authority between AI output and operational decisions.
-->

---
layout: section
class: appendix-title
---

<p class="kicker">Reference</p>
# Appendix
<p>Supporting detail for the self-guided deck and PDF export</p>

---

<p class="kicker">Appendix · fact contract</p>

# A fact is more than a field name

<div class="contract-card">
  <div class="contract-head"><code>past_due_amount</code><span>SOURCE FACT</span></div>
  <dl>
    <div><dt>Business meaning</dt><dd>Open receivables beyond contractual due date</dd></div>
    <div><dt>Type and unit</dt><dd>Decimal · USD</dd></div>
    <div><dt>Source</dt><dd>Named CIS API and response property</dd></div>
    <div><dt>Null behavior</dt><dd>Explicitly mapped; never silently treated as zero</dd></div>
    <div><dt>Freshness</dt><dd>Recorded observation time and accepted review window</dd></div>
    <div><dt>Provenance</dt><dd>Source system, transformation version, correlation ID</dd></div>
  </dl>
</div>

<p class="boundary">A production Customer Review Ontology dictionary would be confirmed from CIS contracts and credit-owner semantics—not copied from this illustrative example.</p>

---

<p class="kicker">Appendix · derived facts</p>

# Derivations remain deterministic and traceable

<div class="formula-card">
  <span>past_due_ratio</span>
  <div><b>past_due_amount</b><i>÷</i><b>ar_balance</b><i>=</i><strong>12%</strong></div>
  <small>15,000 USD ÷ 125,000 USD · guarded when the denominator is zero or unavailable</small>
</div>

<div class="three-columns compact">
  <article><b>Registered dependencies</b><p>The runtime knows which source facts support each derivation.</p></article>
  <article><b>One implementation</b><p>Single-customer and portfolio evaluations use the same calculation.</p></article>
  <article><b>Visible evidence</b><p>Inputs and intermediate values can be retained with the decision trace.</p></article>
</div>

---

<p class="kicker">Appendix · candidate lifecycle</p>

# Evidence belongs to an exact revision and baseline

<div class="revision-flow">
  <article><b>Draft r5</b><span>source intent + generated DSL</span></article><i>→</i>
  <article><b>Validated r5</b><span>grammar + ontology contracts</span></article><i>→</i>
  <article><b>Analyzed r5</b><span>against release credit-1.4.0</span></article><i>→</i>
  <article><b>Batch passed r5</b><span>same baseline + evaluator</span></article><i>→</i>
  <article class="accent"><b>Published</b><span>complete release credit-1.5.0</span></article>
</div>

<div class="edit-rule"><b>Edit after validation?</b><span>Create a new immutable revision and invalidate prior evidence.</span></div>

---

<p class="kicker">Appendix · portfolio qualification</p>

# The batch gate compares releases, not isolated rules

<div class="batch-compare">
  <article><small>Baseline</small><h3>Active release</h3><p>Same customer fixtures<br>Same evaluator<br>Pinned versions</p></article>
  <div><span>13 fictional cases</span><b>⇄</b><small>compare findings, actions, limits, errors</small></div>
  <article><small>Candidate</small><h3>Substituted revision</h3><p>Complete candidate rule set<br>Same resolver<br>Same calculator</p></article>
</div>

<p class="warning"><b>Qualification is not approval.</b> Errors and applicable indeterminate results block progression; an authorized person still approves the release.</p>

---

<p class="kicker">Appendix · production engines</p>

# Each engine answers a different question

<div class="engine-grid">
  <article><span>Jena + SHACL</span><h3>Does the graph conform?</h3><p>Validate types, cardinality, enums, units, and allowed semantic relationships.</p><b>Authoring + publication path</b></article>
  <article><span>DMN + Kogito/Drools</span><h3>What does the approved release return?</h3><p>Execute typed decisions with stable findings, reason codes, and pinned versions.</p><b>Deterministic review runtime</b></article>
  <article><span>Z3</span><h3>Can these constraints contradict?</h3><p>Prove overlap and satisfiability; produce a concrete conflict witness.</p><b>Authoring conflict analysis</b></article>
</div>

<p class="boundary">No engine supplies business approval or silently changes CIS workflow state.</p>

---

<p class="kicker">Appendix · governed AI</p>

# The AI gateway receives a bounded task

<div class="gateway">
  <section><h3>Provide</h3><ul><li>Allowed ontology subset</li><li>Bounded grammar</li><li>Business intent</li><li>Examples and output schema</li></ul></section>
  <div><b>Provider-neutral<br>AI gateway</b><span>policy · logging · redaction · versioning</span></div>
  <section><h3>Never delegate</h3><ul><li>Semantic validation</li><li>Conflict resolution</li><li>Release approval</li><li>Customer disposition</li></ul></section>
</div>

<p class="warning"><b>Data boundary:</b> approved deterministic rules evaluate CIS facts. A model does not need customer records to execute those rules.</p>

---

<p class="kicker">Appendix · CIS discovery assumptions</p>

# Questions that production discovery must answer

<div class="question-grid">
  <article><b>Decision point</b><span>Where does CIS currently own review orchestration and state transition?</span></article>
  <article><b>Authoritative facts</b><span>Which APIs, semantics, units, nulls, freshness, and sensitivity apply?</span></article>
  <article><b>Current behavior</b><span>Which policies, precedence, reason codes, side effects, and retry rules exist?</span></article>
  <article><b>Governance</b><span>Which identity, approvals, audit, release, feature flag, and rollback patterns can be reused?</span></article>
  <article><b>Runtime constraints</b><span>What latency, availability, throughput, and failure behavior are required?</span></article>
  <article><b>Adoption boundary</b><span>Which policy cohort can be safely compared in shadow mode first?</span></article>
</div>

---

<p class="kicker">Appendix · terminology</p>

# Terms used in this showcase

<table class="terms-table">
  <tbody>
    <tr><th>Ontology</th><td>A versioned vocabulary defining credit facts, types, units, and semantic relationships.</td></tr>
    <tr><th>SHACL</th><td>Standard constraints used to validate RDF data and policy resources against expected shapes.</td></tr>
    <tr><th>DMN</th><td>A standard representation for reviewable, deterministic business decisions.</td></tr>
    <tr><th>Constraint solver</th><td>A tool that proves whether conditions can overlap, conflict, or be satisfied.</td></tr>
    <tr><th>Policy release</th><td>An immutable, approved bundle of exact rule and decision-model versions.</td></tr>
    <tr><th>Shadow mode</th><td>Evaluate beside current behavior, record comparisons, and do not affect CIS outcomes.</td></tr>
  </tbody>
</table>

---
layout: center
class: end-slide
---

<div class="end-mark"><span class="brand-symbol"><i></i><i></i><i></i></span></div>

# Customer Review Ontology

<p>Governed AI · shared semantics · deterministic reasoning</p>

<a href="/" target="_blank" rel="noopener noreferrer" class="demo-link small">Open illustrative demo <b>↗</b></a>
