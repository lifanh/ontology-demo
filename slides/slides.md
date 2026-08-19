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
    <p class="author">Lifan Huang</p>
  </div>
  <div class="hero-row" aria-label="One worklist row as the analyst receives it">
    <header><span>Worklist</span><b>4 accounts due</b></header>
    <article>
      <div class="hr-cust"><b>Ironclad Manufacturing</b><span>#2004 · NET 30</span></div>
      <div class="hr-fig"><small>Current limit</small><b>$1.75M</b><span>$2.0M requested</span></div>
      <div class="hr-fig"><small>Risk</small><b>Low Risk</b><span>1.00 / 4</span></div>
      <div class="hr-mode"><i>AI proposal</i><span>Credit-limit reassessment</span></div>
      <div class="hr-open">Review</div>
    </article>
    <footer>A conclusion with its evidence — not a blank case.</footer>
  </div>
</div>

<!--
SCRIPT

Today, a credit analyst opens an account and starts building the case from scratch. Statements, aging, history, ratios — all of that happens before any judgment does.

Here is the alternative. The account arrives already evaluated. Ironclad Manufacturing has clean payment behavior, current statements, and a requested move from a $1.75 million credit limit to $2 million. The advisory calculator supports that amount, so the proposal is a credit-limit reassessment.

The whole session comes down to one sentence: AI proposes the review result of every account, and credit analysts decide. Deterministic rules and calculations remain authoritative.

讲稿

今天，credit analyst 打开一个账户，要从头拼出整份案卷。报表、AR aging、历史、比率——这些都要先做完，判断才能开始。

另一种做法是，账户到达时已经评估过。Ironclad Manufacturing 的付款行为正常，financial statements 是 current，并申请把 credit limit 从 175 万美元提高到 200 万美元。advisory calculator 支持这个数额，所以建议是做 credit-limit reassessment。

整场可以浓缩成一句话：AI 提出每个账户的复核结果，由 credit analyst 做决定。确定性规则和计算始终保持权威。
-->

---

<p class="kicker">The problem · Portfolio</p>

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

讲稿

这就是问题的规模。美国和加拿大一共六万六千个 customer。

其中四万八千四百个在五万美元 credit limit 以下——美国四万，加拿大八千四百。这一段的旧规则已经过时，所以被停掉了。今天这里没有任何自动化在跑。

一万七千六百个在这条线以上——美国一万五千，加拿大两千六百。每一个都是人工复核。

所以这条线切出了两边。线以下，本该运行的规则被关掉了。线以上，没有任何自动化——而且 customer 数量持续增长，团队规模不变，复核只能轮流做。结果就是积压、延误，以及覆盖面从设计上就不完整。

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

The result is simple: capacity scales only with headcount because every review starts from an empty page. The same reseller can also be asked for the same document more than once.

讲稿

为什么一次复核会这么慢？五个原因，其中只有一个是判断本身。

第一，证据是去要的，不是取回的。credit analyst 向经销商要财务报表和佐证材料，然后等。

第二，材料到了以后要手工拼合——对照内部 credit、AR、付款和关系数据，一个账户一个账户地对。

第三，同样的计算每次都要重做一遍。past_due_ratio、credit_utilization、相对 payment terms 的付款天数，以及按需求测算 credit limit。

第四，阈值写在政策文件里。政策是真实的，但执行靠记忆，而不是在屏幕上展示并评估。

第五——这是前四点的结果——复核只能轮流做。五万美元以上的 customer 在增加，团队规模不变。

结果很直接：产能只能跟着人头涨，因为每一次复核都从空白页开始。同一家经销商也可能被反复要同一份文件。
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

A configurable rule center: thresholds, versions, customer segments, and effective scopes — governed, with candidate changes testable before approval. That answers the stopped legacy rules directly.

A standardized workflow, so every review uses the same evidence, offers the same allowed actions, and leaves the same record.

Automated evidence collection — internal credit, AR, payment and relationship data, plus external sources, assembled before the analyst opens the case. The reseller gets asked once instead of repeatedly.

Differentiated policies, so large, medium and small customers, and different risk scenarios, stop sharing one blunt threshold.

And AI-assisted analysis: a proposed review result and readable risk drivers, always grounded in deterministic evidence and left for a person to judge.

The word that matters is governed. Configurable on its own just moves the risk around. Versions, scopes, and evidence are what make configurability safe.

讲稿

所以方案分五部分。

一个可配置的规则中心：阈值、版本、customer 分段，以及生效范围——受治理，而且候选变更可以在批准前测试。这直接回应了那些被停掉的旧规则。

一套标准化工作流，让每一次复核使用同样的证据、提供同样的允许动作，并留下同样的记录。

自动化证据收集——内部 credit、AR、付款和关系数据，加上外部来源，在 credit analyst 打开案卷之前就组装好。经销商只被问一次，而不是反复被问。

差异化政策，让大、中、小 customer 以及不同风险情景，不再共用一条粗糙的阈值。

以及 AI 辅助分析：提出 review result 和可读的 risk drivers，但始终以确定性证据为基础，留给人判断。

这里真正重要的词是受治理。光可配置，只是把风险挪了个位置。版本、范围和证据，才让可配置变得安全。

-->

---

<p class="kicker">How the work divides</p>

# Three lanes. Two need an analyst.

<div class="lanes">
  <section class="auto">
    <header><i>Low risk</i><b>Automated</b></header>
    <p>Rules pass and no limit change is recommended. Cleared and recorded.</p>
    <small>Review result: <b>Auto-cleared</b></small>
  </section>
  <section class="assist">
    <header><i>Borderline</i><b>Human-in-the-loop</b></header>
    <p>Proposal, drivers, and evidence arrive together. The analyst decides.</p>
    <small>Review result: <b>AI proposal</b></small>
  </section>
  <section class="manual">
    <header><i>High risk</i><b>Analyst control</b></header>
    <p>One or more R1–R6 controls require a person.</p>
    <small>Review result: <b>Manual review proposed</b></small>
  </section>
</div>

<p class="takeaway"><b>Capacity grows without linear headcount.</b></p>

<!--
SCRIPT

That splits the work into three lanes.

Low risk: the controls pass, the calculator recommends no change, and the account is auto-cleared. It remains visible in the queue as view-only.

Borderline: the account arrives with a proposed result, its drivers, and the evidence already assembled. The analyst confirms it, or replaces it with a reason.

High risk and exceptions: one or more R1–R6 controls require manual review. The case stays with a person, but the evidence is already assembled.

These are the review modes in the worklist: auto-cleared, AI proposal, and manual review proposed.

This is how capacity can grow without hiring proportionally. The automated lane requires no analyst action, while the other lanes arrive ready to check rather than build.

讲稿

这样就把工作分成三条通道。

低风险：controls 通过，calculator 建议不改 credit limit，账户自动通过。它仍留在 queue 里，只读可见。

临界：账户到达时已带有建议结果、驱动因素，以及已经组装好的证据。credit analyst 可以确认建议，也可以改选另一个允许的动作并说明理由。

高风险和例外情况：一个或多个 R1–R6 controls 要求 manual review。这些仍由人处理——但证据已经组装好。

这三种就是 worklist 里的 review mode：Auto-cleared、AI proposal 和 Manual review proposed。

产能也因此可以增长，而不必按比例加人。自动通道不需要 credit analyst 操作；另外两条通道到达时已经完成到只需核对，而不必再拼案卷。
-->

---

<p class="kicker">The foundation · v2</p>

# Customer Credit Review Ontology

<p class="ontology-subtitle">A compact property registry under every number</p>

<div class="onto-tree" aria-label="Customer Credit Review Ontology entity and property tree">
  <section>
    <label>Identity &amp; relationship</label>
    <ul>
      <li><b>customer_number</b><small>integer · Identity</small></li>
      <li><b>name</b><small>string · Identity</small></li>
      <li><b>relationship_type</b><small>SINGLE · FINANCIAL_MASTER</small></li>
      <li><b>sharing_group_restricted</b><small>Y · N</small></li>
    </ul>
  </section>
  <section>
    <label>Credit &amp; AR</label>
    <ul>
      <li><b>ar_balance</b><small>decimal · USD</small></li>
      <li><b>past_due_amount</b><small>decimal · USD</small></li>
      <li><b>credit_limit</b><small>decimal · USD</small></li>
      <li><b>requested_credit_limit</b><small>decimal · USD</small></li>
      <li><b>payment_terms</b><small>NET_15 · NET_30 · NET_45 · NET_60 · CS</small></li>
    </ul>
  </section>
  <section>
    <label>Payment behavior</label>
    <ul>
      <li><b>adp_w_90d</b><small>decimal · DAYS</small></li>
      <li><b>weighted_terms_days</b><small>decimal · DAYS</small></li>
      <li><b>open_invoices_over_39_days</b><small>decimal · USD</small></li>
      <li><b>nsf_count_90d</b><small>integer · count</small></li>
      <li><b>chargeback_count_90d</b><small>integer · count</small></li>
    </ul>
  </section>
  <section>
    <label>Financials &amp; demand</label>
    <ul>
      <li><b>annual_revenue</b><small>decimal · USD</small></li>
      <li><b>ebitda</b><small>decimal · USD</small></li>
      <li><b>operating_cash_flow</b><small>decimal · USD</small></li>
      <li><b>current_ratio</b><small>decimal · NUMBER</small></li>
      <li><b>net_sales_180d</b><small>decimal · USD</small></li>
    </ul>
  </section>
  <section>
    <label>Derived properties</label>
    <ul>
      <li><b>total_exposure</b><small>ar_balance + pending_amount</small></li>
      <li><b>past_due_ratio</b><small>past_due_amount ÷ ar_balance</small></li>
      <li><b>credit_utilization</b><small>total_exposure ÷ credit_limit</small></li>
      <li><b>monthly_net_sales_run_rate</b><small>max of 180d and 360d monthly rates</small></li>
      <li><b>payment_exception_count_90d</b><small>NSF + chargeback events</small></li>
    </ul>
  </section>
</div>

<p class="takeaway"><b>A threshold is governable only if its terms are defined once.</b></p>

<!--
SCRIPT

The v2 demo makes the ontology concrete as a compact property registry.

Each property has one stable name, display label, group, datatype, and unit. Derived properties also declare their dependencies and calculation. For example, <code>past_due_ratio</code> is <code>past_due_amount</code> divided by <code>ar_balance</code>.

That matters commercially because a threshold can only be governed, versioned, and scoped when the property it constrains has one agreed definition, type, and unit. Otherwise, past-due percentage can mean three different things in three systems, and a rule center simply makes disagreement faster.

The current v2 registry covers the facts used by R1–R6, the financial-statement control, and the advisory credit-limit calculator. Context such as NACM and D&amp;B-style data is shown separately and does not alter deterministic findings or actions.

In Customer Review, a figure can be opened to see its definition, value, provenance, and policy use together.

讲稿

v2 demo 把 ontology 落成了一个紧凑的 property registry。

每个 property 都有唯一的 English name、display label、group、datatype 和 unit。derived property 还会声明 dependencies 和 calculation。比如 <code>past_due_ratio</code> 就是 <code>past_due_amount</code> 除以 <code>ar_balance</code>。

商业价值在于，一条 threshold 只有在它约束的 property 有统一 definition、type 和 unit 时，才能被治理、versioned，并限定到某个 segment。否则，<code>past_due_ratio</code> 在三个系统里可能是三种意思，rule center 只会让分歧发生得更快。

当前 v2 registry 覆盖 R1–R6、financial-statement control 和 advisory credit-limit calculator 使用的 facts。NACM 和 D&amp;B-style context 单独展示，不会改变确定性 findings 或 actions。

在 Customer Review 里，数字可以点开，同时看到 definition、value、provenance 和 policy use。
-->

---

<p class="kicker">The foundation · Sources</p>

# Production source mapping is explicit

<table class="onto-source">
  <thead><tr><th>Property group</th><th>Example properties</th><th>Proposed table · API mapping</th></tr></thead>
  <tbody>
    <tr><td><code>Identity</code></td><td>customer_number · name</td><td><code>dim_us.dim_pub_customer_info</code><small>GET /api/customer/{custNo}</small></td></tr>
    <tr><td><code>Credit operations</code></td><td>ar_balance · pending_amount · past_due_amount · credit_limit</td><td><code>dim_us.dim_pub_customer_credit_info</code><small>POST /api/customers/creditInfo/queryForm</small></td></tr>
    <tr><td><code>Derived facts</code></td><td>total_exposure · past_due_ratio · credit_utilization</td><td><code>Credit operations inputs</code><small>Deterministic calculation · derived</small></td></tr>
    <tr><td><code>Financial relationship</code></td><td>relationship_type · sharing_group_restricted</td><td><code>CIS.dbo.cust_xref</code><small>GET /api/customer/{custNo}/relationship/FINAN_SUB</small></td></tr>
    <tr><td><code>External context</code></td><td>NACM and D&amp;B-style concepts (non-actioning)</td><td><code>dim_us.dim_customer_nacm_cms_aging</code><small>POST /api/customer/nacm/nacmDetail/excel/queryForm</small><em>Field mapping unverified</em></td></tr>
    <tr><td><code>Supporting files</code></td><td>financial-statement attachments</td><td><code>customer_attach</code><small>GET /api/customer/{customerNo}/files?templateType=FINANCIAL_STATEMENT</small></td></tr>
  </tbody>
</table>

<p class="source-note">The v2 POC uses fictional in-browser fixtures. These are proposed production mappings and still require read-only verification.</p>

<p class="takeaway"><b>Same rule, same meaning, in the US and Canada.</b></p>

<!--
SCRIPT

The current v2 POC uses fictional fixtures in the browser. It does not call CIS. This slide shows how its properties are proposed to map to production sources.

Customer account identity, name, territory, terms, and region map to <code>dim_us.dim_pub_customer_info</code> and <code>GET /api/customer/{custNo}</code>.

AR balance and past-due amount map to <code>dim_us.dim_pub_customer_credit_info</code> and <code>POST /api/customers/creditInfo/queryForm</code>. Past-due percentage is derived as <code>past_due_amt / curr_bal</code>; it is not a source field.

Exposure is derived from the same source: current balance plus pending amount, over the credit limit. Defining that calculation once is what stops three teams computing it three different ways.

Financial-master identifiers and relationship type map to <code>CIS.dbo.cust_xref</code>, using the <code>FINAN_SUB</code> relationship API. NACM aging and score concepts have a partial mapping to <code>dim_us.dim_customer_nacm_cms_aging</code> and the NACM query API; the concrete field mapping remains unverified. Review documents map to <code>customer_attach</code> and the financial-statement files API. Field grain and runtime contracts still need read-only verification.

That is what turns a policy sentence into something a system can evaluate. No more than ten percent past due is enforceable only once past-due percentage has one definition, one unit, and one authoritative source. It is also what lets the same rule mean the same thing in the US and in Canada.

讲稿

当前 v2 POC 使用 browser 里的 fictional fixtures，并没有调用 CIS。这一页展示的是这些 properties 在 production 中的 proposed source mapping。

Customer account 的 identity、name、territory、payment_terms 和 region，拟映射到 <code>dim_us.dim_pub_customer_info</code> 和 <code>GET /api/customer/{custNo}</code>。

<code>ar_balance</code> 和 <code>past_due_amount</code> 拟映射到 <code>dim_us.dim_pub_customer_credit_info</code> 和 <code>POST /api/customers/creditInfo/queryForm</code>。<code>past_due_ratio</code> 由 <code>past_due_amt / curr_bal</code> 派生，不是 source field。

<code>credit_utilization</code> 也由同一来源派生：<code>ar_balance</code> 加 <code>pending_amount</code>，再除以 <code>credit_limit</code>。定义一次，才能避免三个团队用三种算法。

财务主账户标识和关系类型映射到 <code>CIS.dbo.cust_xref</code>，并使用 <code>FINAN_SUB</code> 关系 API。NACM 账龄和评分概念只完成了到 <code>dim_us.dim_customer_nacm_cms_aging</code> 与 NACM 查询 API 的部分映射；具体字段仍未核实。复核文件映射到 <code>customer_attach</code> 和财务报表文件 API。字段粒度和运行时契约仍需只读核实。

这才把一句 policy 变成系统能评估的东西。“<code>past_due_ratio</code> 不超过 10%”只有在这个 property 有统一 definition、unit 和 authoritative source 时才能执行，也才能让同一条 rule 在美国和加拿大表达同一个意思。
-->

---

<p class="kicker">In the product</p>

# The queue explains itself

<div class="kpi-strip">
  <div class="kpi ai"><small>AI proposal, awaiting decision</small><b>3</b><span>Ready for an analyst</span></div>
  <div class="kpi high"><small>Manual review proposed</small><b>2</b><span>R1–R6 requires a person</span></div>
  <div class="kpi soft"><small>R3 visibility signal</small><b>1</b><span>Non-actioning</span></div>
  <div class="kpi pass"><small>Auto-cleared</small><b>1</b><span>View only</span></div>
  <div class="kpi"><small>Due this cycle</small><b>4</b><span>customer-review-2.0.0</span></div>
</div>

<div class="screen-split">
  <table class="queue-rows">
    <thead><tr><th>Customer</th><th>Past due</th><th>Risk</th><th>Review mode</th></tr></thead>
    <tbody>
      <tr class="p-pass"><td><b>Northwind Components</b><span>#2001 · NET 30</span></td><td>$0 <span>no past due</span></td><td>Low · 1.00</td><td><i class="pill pass">Auto-cleared</i><span>view only</span></td></tr>
      <tr class="p-high"><td><b>Cascade Freight</b><span>#2002 · NET 45</span></td><td>$212,400 <span>5.2% of AR</span></td><td>Elevated · 2.76</td><td><i class="pill ai">AI proposal</i><span>Manual review</span></td></tr>
      <tr class="p-high"><td><b>Meridian Industrial</b><span>#2003 · NET 30</span></td><td class="bad">$394,240 <span>14% of AR</span></td><td>Not rated</td><td><i class="pill ai">AI proposal</i><span>Manual review</span></td></tr>
      <tr class="p-soft"><td><b>Ironclad Manufacturing</b><span>#2004 · NET 30</span></td><td>$0 <span>no past due</span></td><td>Low · 1.00</td><td><i class="pill ai">AI proposal</i><span>Credit-limit reassessment</span></td></tr>
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
        <tr><td>R2 · Low ADP with delinquent invoices</td><td class="fail">FINDING</td></tr>
        <tr><td>R1 · ADP-W threshold</td><td class="na">Different property</td></tr>
        <tr><td>R3–R6</td><td class="na">Different properties</td></tr>
      </tbody>
    </table>
  </div>
</div>

<p class="region-strip"><b>One case, evidence assembled:</b> Snapshot · Exposure · Profile · AI proposal · History · Risk · External · Rules · Payment · Relationship · AR aging · Financials · Files</p>

<!--
SCRIPT

Here is what all of that looks like in the product.

The KPI strip shows the current v2 worklist: three proposals awaiting a decision, two manual-review proposals, one non-actioning R3 visibility signal, one auto-clear, and four accounts due. Those counts come from the deterministic evaluation.

Northwind is auto-cleared and view-only. Cascade and Meridian need manual review for different deterministic reasons. Ironclad has no actioning finding, but the advisory calculator supports its requested increase from $1.75 million to $2 million, so it awaits a credit-limit reassessment decision.

On the right, the ontology becomes tangible. Open <code>past_due_ratio</code> and you see its meaning, type, unit, provenance, and policy references. On Meridian, R2 is a finding because the scoped conditions apply and the ratio is fourteen percent against a ten-percent threshold.

The full case is assembled in one place: snapshot, exposure, profile, proposal, history, risk, external context, rules, payment, relationship, AR aging, financials, and files.

讲稿

这些在产品里长这样。

KPI strip 展示当前 v2 worklist：三个 proposal 等待决定，两个是 Manual review proposed，一个是 non-actioning R3 visibility signal，一个 Auto-cleared，本周期一共四个账户。这些计数来自 deterministic evaluation。

Northwind 是 Auto-cleared、view only。Cascade 和 Meridian 因不同的 deterministic findings 需要 manual review。Ironclad 没有 actioning finding，但 advisory calculator 支持把 credit limit 从 175 万美元提高到 200 万美元，所以等待 credit-limit reassessment 决定。

右边让 ontology 变得可见。打开 <code>past_due_ratio</code>，可以看到 meaning、type、unit、provenance 和 policy references。在 Meridian 上，R2 的 scope conditions 成立，而且 <code>past_due_ratio</code> 是 14%，高于 10% threshold，所以结果是 Finding。

完整 case 也集中在一处：snapshot、exposure、profile、AI proposal、history、risk、external context、rules、payment、relationship、AR aging、financials 和 files。
-->

---

<p class="kicker">In the product</p>

# The analyst decides

<div class="decide-grid">
  <article class="confirm"><span>Confirm</span><b>Accept the proposal</b><small>Saved against a named policy version in browser-tab state.</small></article>
  <article class="replace"><span>Replace</span><b>Different action, with a reason</b><small>The reason is required. The proposal remains beside the decision.</small></article>
  <article class="reopen"><span>Reopen</span><b>Undo and re-decide</b><small>A session event records the reopen.</small></article>
</div>

<div class="decide-record">
  <b>What gets recorded</b>
  <span>Action</span><i>·</i><span>Reason</span><i>·</i><span>Policy version</span><i>·</i><span>Evaluation references</span>
</div>

<p class="boundary"><b>POC boundary:</b> the illustrative record is session-scoped browser-tab state, not a CIS workflow or durable audit record.</p>

<!--
SCRIPT

The decision still belongs to the analyst. In this POC, it is saved in browser-tab session state.

They can confirm the proposed result, which is recorded as reviewed against a named policy version.

Or they replace it with another action from the allowed vocabulary. A reason is required, and the original proposal remains beside the analyst's choice. That reason turns a disagreement into evidence for later policy analysis.

Or they reopen, which is itself an event in the history rather than a silent erase.

The session record contains the action, reason, policy version, and evaluation references. It illustrates the shape of an auditable production record without claiming that v2 already writes to CIS or a durable audit store.

The analyst replaces the proposed action, not the findings. Deterministic findings remain visible.

讲稿

决定仍然属于 credit analyst。在这个 POC 里，决定保存在 browser-tab session state 中。

他们可以确认建议结果，记录为对照某个具名政策版本完成了复核。

或者替换它——从 allowed action vocabulary 里选另一个 action，并填写必填 reason；原来的 proposal 仍留在旁边。这个 reason 把一次分歧变成后续 policy analysis 的证据。

或者重新打开，这本身是历史里的一个事件，而不是悄悄抹掉。

session record 包含 action、reason、policy version 和 evaluation references。它展示 production audit record 应有的形状，但不表示 v2 已经写入 CIS 或 durable audit store。

credit analyst 替换的是 proposed action，不是 Findings。确定性 Findings 会继续保持可见。
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
</div>

<!--
SCRIPT

Let me show you the queue as a credit analyst receives it.

The KPI strip separates proposals awaiting a decision, manual-review proposals, the R3 visibility signal, auto-clears, and the total due. Northwind is already auto-cleared and remains view-only, so no analyst action is required.

Ironclad shows a different path. Its banner compares the current $1.75 million credit limit with the $2 million recommendation, and the proposal is a credit-limit reassessment. The readable explanation summarizes the drivers; the Review Rules section shows the deterministic evidence underneath it.

Meridian makes the ontology visible. Opening <code>past_due_ratio</code> shows the definition, type, unit, provenance, and R2 policy reference. The value is fourteen percent against a ten-percent threshold inside R2's scope.

The analyst can confirm a proposal or adjust it to another allowed result with a reason. The original proposal, policy version, and evaluation references remain beside that session decision. Back on the worklist, the account now appears as completed.

讲稿

我先按 credit analyst 收到 worklist 时的样子来演示。

KPI strip 把 awaiting-decision proposals、Manual review proposed、R3 visibility signal、Auto-cleared 和 due total 分开。Northwind 已经 Auto-cleared，而且是 view only，所以不需要 credit analyst 操作。

Ironclad 展示的是另一条路径。横幅把当前 175 万美元 credit limit 和 200 万美元 recommended credit limit 放在一起，proposal 是 credit-limit reassessment。可读 explanation 总结 drivers；Review Rules 区域展示它下面的 deterministic evidence。

Meridian 让 ontology 变得可见。打开 <code>past_due_ratio</code>，可以看到 definition、type、unit、provenance 和 R2 policy reference。这个值是 14%，而 R2 scope 内的 threshold 是 10%。

credit analyst 可以确认 proposal，也可以换成另一个 allowed result，并填写 reason。original proposal、policy version 和 evaluation references 会和这个 session decision 一起保留。回到 worklist 后，这个账户显示为 Completed。
-->

---

<p class="kicker">In the product · The rule center</p>

# Change the rule, see the impact

<div class="wb-steps">
  <article><span>1</span><b>Say it in business language</b><small>“For R2's scope, trigger review at 8% past due.”</small></article>
  <article><span>2</span><b>See the difference</b><small>Scope, threshold, and wording — active against candidate.</small></article>
  <article><span>3</span><b>Earn the evidence</b><small>Validation, compatibility, then deterministic impact.</small></article>
</div>

<div class="wb-evidence">
  <article><b>Validation</b><span>Syntax, stable ID, ontology properties, types, units</span></article>
  <i>→</i>
  <article><b>Compatibility</b><span>Refinement, relaxation, or no effective change?</span></article>
  <i>→</i>
  <article class="last"><b>Review impact</b><span>Which accounts change, before anything is approved</span></article>
</div>

<a href="/v2/" target="_blank" rel="noopener noreferrer" class="demo-inline">Walkthrough · Configure rules <b>↗</b></a>

<!--
SCRIPT

The other half of the story is what happens when the rule itself needs to change.

Configure rules opens the Policy Change workbench. Every candidate is compared with the active <code>customer-review-2.0.0</code> baseline and receives its own revision.

The default example tightens R2. Its scope stays the same: ADP-W below thirty-nine days, with invoices at least thirty-nine days old still open. Only the <code>past_due_ratio</code> threshold moves, from ten percent to eight percent.

Validation checks the bounded DSL, stable rule ID, ontology properties, datatypes, units, and supported policy family. Compatibility then reports a compatible refinement: active ten percent, candidate eight percent.

Review impact evaluates the same twelve fictional boundary records under both versions. Two records, at eight and nine percent, newly require manual review. The current four-account worklist has no changed action or finding for this candidate, so it shows no account badges.

The candidate now has complete evidence for governed review, but it remains a preview. The active policy and customer state have not changed, and v2 does not approve or activate it.

讲稿

故事的另一半是：当 rule 本身需要改变时，会发生什么。

Configure rules 会打开 Policy Change workbench。每个 candidate 都对照当前 <code>customer-review-2.0.0</code> baseline 比较，并得到自己的 revision。

默认示例会收紧 R2。它的 scope 不变：<code>adp_w_90d</code> 低于 39 days，而且仍有至少 39 days old 的 open invoices。只有 <code>past_due_ratio</code> threshold 从 10% 改到 8%。

Validation 检查 bounded DSL、stable rule ID、ontology properties、datatypes、units 和 supported policy family。Compatibility 随后给出 compatible refinement：active 是 10%，candidate 是 8%。

Review impact 用两个版本评估同一批 12 条 fictional boundary records。8% 和 9% 的两条记录会新增 manual review。当前四个账户的 worklist 没有 action 或 Finding 变化，所以不会出现 account badge。

这个 candidate 已经具备 governed review 所需的完整 evidence，但仍然只是 preview。active policy 和 customer state 都没有改变，v2 也不会批准或激活它。
-->

---

<p class="kicker">The payoff</p>

# Review improves itself

<div class="feedback-loop">
  <article><span>01</span><b>Decide</b><small>An analyst replaces a result and captures why</small></article>
  <i>→</i>
  <article><span>02</span><b>A pattern appears</b><small>The same override, repeated, questions the threshold</small></article>
  <i>→</i>
  <article><span>03</span><b>Test the change</b><small>Validation, compatibility, impact — same engine</small></article>
  <i>→</i>
  <article><span>04</span><b>See it in the queue</b><small>Which accounts move, before any approval</small></article>
</div>

<div class="outcome-band">
  <b>What the business gets</b>
  <span>Fewer reseller requests</span><span>Less manual comparison</span><span>Capacity without headcount</span><span>Measurable and versioned</span><span>Audit-ready record shape</span><span>Reusable across regions</span>
</div>

<!--
SCRIPT

Put the two walkthroughs together and review starts improving itself.

An analyst replaces a proposed result and captures why. That is step one.

When the same override keeps recurring, that is not a problem with the analyst. It is a question about the threshold.

Step three is testing that change — candidate, validation, compatibility, and impact, against the same engine that runs the reviews. Not a spreadsheet, not a guess.

And step four, you see which accounts would move, in the queue, before anything is approved.

What the business gets from that: fewer repeated requests to resellers, less manual comparison, capacity that does not scale with headcount, and a process that is measurable and versioned. The POC also shows the shape of an audit-ready record. Production still needs durable workflow, approval, and audit integration.

讲稿

把两次演示合在一起，复核就开始自我改进。

credit analyst 替换一条 proposed result，并记录 reason。这是第一步。

当同一种替换反复出现，那不是 credit analyst 的问题。那是关于阈值的问题。

第三步是测试这次变更——candidate、validation、compatibility 和 impact，对照运行 customer review 的同一套 engine。不是电子表格，也不是猜测。

第四步，你在队列里看到哪些账户会变动，而且是在任何批准之前。

业务因此得到：更少对经销商的重复索要，更少手工比对，产能不必跟着人头涨，以及一套 measurable、versioned 的 customer review process。POC 也展示了 audit-ready record 的形状；production 仍需要 durable workflow、approval 和 audit integration。
-->

---

<p class="kicker">Why this is safe</p>

# Checkable now. Authority stays put.

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
    <h3>Retained by people and production systems</h3>
    <div><b>Facts</b><small>CIS remains the target authority</small></div>
    <div><b>Controls</b><small>Deterministic validation and comparison</small></div>
    <div><b>Choice</b><small>Authorized people approve decisions and policy</small></div>
  </section>
</div>

<p class="boundary"><b>Next:</b> confirm the workflow with the people who run it, verify the source systems read-only, and name the owners of thresholds, exceptions, and rollback.</p>

<!--
SCRIPT

This is the trust boundary.

On the left, what makes it useful. Evidence assembled into one case. Rules, findings, and the advisory limit computed deterministically. And the evidence turned into a readable rationale with its drivers.

On the right, what never moves. In the target production design, CIS supplies authoritative facts and retains workflow and customer-state authority. Deterministic controls validate and compare. Authorized people own the review decision and any policy approval.

The line I would leave you with is this: a credible explanation is not proof. The authoritative evidence is always on the page above the paragraph, which is exactly why an analyst can check rather than believe.

The current v2 demo is an illustrative proof of concept with fictional data and browser-tab state. It does not call CIS or mutate customer state. Going further requires time with the people who run customer reviews, read-only verification of the proposed source mappings, and named owners for thresholds, exceptions, approval, and rollback.

讲稿

这一页讲 trust boundary。

左边是它有用的原因。evidence 组装成一份 case。rules、Findings 和 recommended credit limit 由 deterministic calculation 得出。evidence 再被转成带 drivers 的可读 rationale。

右边是永远不动的部分。在 target production design 中，CIS 提供 authoritative facts，并保留 workflow 和 customer-state authority。deterministic controls 负责 validation 和 comparison。authorized people 负责 review decision 和 policy approval。

我想留给你们的一句话是：可信的解释不是证明。权威证据始终在那段文字上方的页面上，正因为如此，credit analyst 可以核对，而不必相信。

当前 v2 demo 是 illustrative proof of concept，使用 fictional data 和 browser-tab state。它不调用 CIS，也不修改 customer state。要继续推进，需要和真正做 customer review 的人交流，对 proposed source mappings 做 read-only verification，并明确 thresholds、exceptions、approval 和 rollback 的 owners。
-->

---

<p class="kicker">Appendix · Evidence</p>

# Every finding is traceable

<div class="trace-card">
  <header><code>customer-review-2.0.0/R2_LOW_ADP_PLUS_PD@1</code><b>FINDING</b></header>
  <div class="trace-policy"><small>Policy</small><strong>When ADP-W is below 39 days and invoices at least 39 days old remain open, past due at or above 10% of AR requires manual review.</strong></div>
  <div class="trace-observations">
    <article><span>ADP-W · 90 days</span><b>38d</b><small>&lt; 39d · scope matched</small></article>
    <article><span>Invoices ≥39 days old</span><b>$41,200</b><small>&gt; $0 · scope matched</small></article>
    <article><span>Past-due ratio</span><b>14%</b><small>≥ 10% · condition matched</small></article>
  </div>
  <footer><span>Reason: LOW_ADP_DELINQUENT_INVOICES</span><span>Action hint: NEED_MANUAL_REVIEW</span><span>Versions pinned</span></footer>
</div>

<p class="takeaway">Policy, values, operators, thresholds, units, and provenance travel together.</p>

<!--
SCRIPT

This is the R2 trace behind Meridian's manual-review proposal.

The policy statement is at the top, in the words a person wrote. Below it are the three conditions, each with the actual value, the operator, the threshold, and the unit — and each marked as matched.

At the bottom are the reason code, action hint, and pinned release references.

The browser formats typed raw values. None of this trace is generated text. If a required value is missing, the evaluation remains explicitly indeterminate rather than becoming a guessed pass or fail.

讲稿

这是 Meridian 的 manual-review proposal 背后的 R2 evaluation trace。

政策陈述在最上面，用的是人写的原话。下面是三个条件，每个都有实际值、运算符、阈值和单位——并且都标为匹配。

底部是 reason code、action hint 和 pinned release references。

browser 只是把 typed raw values 格式化出来。这里的 trace 没有 generated text。缺少 required value 时，evaluation 会明确保持 indeterminate，而不会变成猜出来的 pass 或 fail。
-->

---

<p class="kicker">Appendix · Impact</p>

# How impact is calculated

<div class="impact-compare">
  <section><small>Active R2</small><b>Past-due trigger: 10%</b><span>Evaluate 12 boundary records</span></section>
  <i>vs</i>
  <section class="candidate"><small>Candidate R2</small><b>Past-due trigger: 8%</b><span>Same scope · same records</span></section>
  <div><strong>2</strong><b>additional records require review</b><small>Ratios at 8% and 9% cross the new line</small></div>
</div>

<div class="completeness">evaluated · newly required · cleared · changed actions · added/resolved findings · indeterminate · errors · <b>complete</b></div>

<!--
SCRIPT

The same twelve boundary records are evaluated twice — once under the active policy, once under the candidate — and the outcomes are compared.

Two of them newly require review: the records at eight and nine percent, which cross the candidate's new eight-percent inclusive threshold.

This is deterministic workload evidence, not a model estimate. Equality boundaries are explicit, and the changed records are listed first.

If any record comes back indeterminate or errors, the assessment is marked incomplete — and an incomplete assessment cannot reach evidence complete.

讲稿

同一批十二条边界记录会被评估两次——一次用有效政策，一次用候选——然后比较结果。

其中两条新增 manual review：<code>past_due_ratio</code> 为 8% 和 9% 的记录越过了 candidate 新的 8% inclusive threshold。

这是确定性的工作量证据，不是模型估算。相等边界是明确的，变更记录会先列出来。

如果任何记录返回不确定或出错，评估就会标为不完整——不完整的评估到不了证据完整。
-->

---

<p class="kicker">Appendix · Model contract</p>

# The current v2 model boundary

<div class="operation-grid">
  <article><code>review proposal</code><b>Browser-built</b><span>Readable text from deterministic results</span><small>The v2 UI makes no model call for review proposals.</small></article>
  <article><code>policy candidate</code><b>Bounded</b><span>R1 and R2 families only</span><small>Four preconfigured scenarios or a human-edited DSL.</small></article>
  <article><code>Node gateway</code><b>Available separately</b><span>Three schema-checked operations</span><small>Real model calls are a gateway capability, not invoked by the current v2 UI.</small></article>
</div>

<div class="schema-band"><b>Current v2</b><span>Fictional fixtures · deterministic R1–R6 evaluation · advisory calculator · browser-tab state</span></div>
<div class="forbidden-band"><b>Never delegated</b><span>Facts · validation · comparison · action resolution · approval · customer-state authority</span></div>

<!--
SCRIPT

The current v2 UI does not call a model to produce its review proposals. It builds readable proposal text in the browser from deterministic findings, the advisory calculator, and seeded context.

The Policy Change workbench is also bounded. It supports R1 and R2 policy families through four preconfigured scenarios or a human-edited DSL, followed by deterministic validation, compatibility, and impact.

AI-enabled Node mode does provide a separate gateway with three schema-checked operations: <code>draft_rule</code>, <code>explain_review</code>, and <code>explain_policy_analysis</code>. That capability can make real model calls, but the current v2 UI does not invoke those operations.

In every mode, facts, validation, comparison, action resolution, approval, and customer-state authority remain outside model output.

讲稿

当前 v2 UI 不调用 model 来生成 review proposals。它在 browser 中根据 deterministic findings、advisory calculator 和 seeded context 生成可读文字。

Policy Change workbench 也是 bounded。它只支持 R1 和 R2 policy families，可以从四个 preconfigured scenarios 开始，也可以 human-edit bounded DSL，然后依次运行 deterministic validation、compatibility 和 impact。

AI-enabled Node mode 另外提供三个 schema-checked gateway operations：<code>draft_rule</code>、<code>explain_review</code> 和 <code>explain_policy_analysis</code>。这个 gateway capability 可以发起真实 model calls，但当前 v2 UI 不会调用它们。

无论哪种 mode，facts、validation、comparison、action resolution、approval 和 customer-state authority 都不会交给 model output。
-->

---
class: architecture-slide
---

<p class="kicker">Appendix · Target architecture</p>

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

<p class="architecture-rule"><b>Target only:</b> AI drafts. Deterministic systems verify. Authorized people approve. The current POC does not run CIS, DMN, RDF, or an approval runtime.</p>

<!--
SCRIPT

This is the target architecture, not the current POC runtime.

At the centre, CIS remains authoritative for facts, review workflow, decisions, audit, and customer-state changes. Customer Review does not replace that authority.

To the right is the review-time runtime. It runs approved policies only, deterministically, and it is isolated from authoring.

Below that, the policy control plane — where a rule is drafted, validated, compiled, conflict-checked, impact-qualified, and then approved by a person. Only an immutable approved release crosses into the runtime.

The key invariant is that authoring and review-time execution stay separate, with only an immutable approved release crossing into runtime.

The current v2 demo does not run CIS APIs, Jena, SHACL, DMN, Drools or Kogito, Z3, an RDF store, or this approval and release pipeline. Those are production design options to validate during discovery.

讲稿

这是 target architecture，不是当前 POC runtime。

从中间开始。CIS 对 facts、customer review workflow、decisions、audit 和 customer-state changes 保持 authoritative。Customer Review 不会替代这些 authority。

右边是复核时运行时。它只运行已批准的政策，而且是确定性的，并与编写隔离。

再下面是政策控制面——规则在这里被起草、验证、编译、冲突检查、影响认定，然后由人批准。只有一份不可变的已批准发布会进入运行时。

关键不变量是编写和复核时执行保持隔离，只有不可变的已批准发布能进入运行时。

当前 v2 demo 不运行 CIS APIs、Jena、SHACL、DMN、Drools 或 Kogito、Z3、RDF store，也不运行这套 approval 和 release pipeline。这些都是需要在 discovery 中验证的 production design options。
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
  <article><b>Evidence</b><span>Which cases validate policy behavior end to end?</span></article>
</div>

<p class="next-steps-note">A fuller set of integration questions is written up and available on request.</p>

<!--
SCRIPT

These six questions align Customer Review with how your team runs a review.

Workflow first: what triggers a review, what analysts genuinely inspect, and what each action means operationally once it leaves the screen.

Segmentation is the commercially important one. The forty-eight thousand customers below fifty thousand dollars are unreviewed right now. Deciding what should run there is a policy decision, not a technical one.

Then sources, ownership, and existing controls — we would rather reuse identity, audit and approval than rebuild them.

And finally evidence: which representative cases validate the workflow end to end.

The immediate ask is thirty minutes with the people who run customer reviews, followed by read-only verification of the source systems.

讲稿

这六个问题用于让 Customer Review 与你们团队的实际复核方式对齐。

先谈 workflow：什么触发一次 customer review，credit analyst 真正检查什么，以及每个 action 离开屏幕之后在运营上意味着什么。

分段是商业上最重要的一项。现在五万美元以下的四万八千个 customer 没有被复核。决定那里该跑什么，是政策决定，不是技术决定。

然后是来源、归属和现有控制——我们更愿意复用身份、审计和批准，而不是重建它们。

最后是证据：哪些代表性个案可以端到端验证整个工作流。

眼前的请求是：和做 customer review 的人谈三十分钟，然后对 source systems 做 read-only verification。
-->
