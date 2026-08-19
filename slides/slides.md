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

讲稿

今天，credit analyst 打开一个账户，要从头拼出整份案卷。报表、账龄、历史、比率——这些都要先做完，判断才能开始。

我们提议的是另一种做法。账户到达时已经评估过。这一行会告诉你系统建议什么，以及为什么值得你花时间。Ironclad Manufacturing：逾期两万美元，占应收账款百分之二十，高风险——建议是限制该 customer。

整场只用一句话来框定：AI 提出每个账户的复核结果，由 credit analyst 做决定。确定性规则和计算始终保持权威。
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

IF ASKED — how far behind are we? We have not measured it. Making coverage visible is part of what we are proposing, not something we are claiming today.

讲稿

这就是问题的规模。美国和加拿大一共六万六千个 customer。

其中四万八千四百个在五万美元授信额度以下——美国四万，加拿大八千四百。这一段的旧规则已经过时，所以被停掉了。今天这里没有任何自动化在跑。

一万七千六百个在这条线以上——美国一万五千，加拿大两千六百。每一个都是人工复核。

所以这条线切出了两边。线以下，本该运行的规则被关掉了。线以上，没有任何自动化——而且 customer 数量持续增长，团队规模不变，复核只能轮流做。结果就是积压、延误，以及覆盖面从设计上就不完整。

若被问到——我们落后多少？我们没有量过。让覆盖情况可见，是我们提议的一部分，不是今天要主张的数字。
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

讲稿

为什么一次复核会这么慢？五个原因，其中只有一个是判断本身。

第一，证据是去要的，不是取回的。credit analyst 向经销商要财务报表和佐证材料，然后等。

第二，材料到了以后要手工拼合——对照内部授信、应收账款、付款和关系数据，一个账户一个账户地对。

第三，同样的计算每次都要重做一遍。逾期占比、额度使用率、相对账期的付款天数，以及按需求测算额度。

第四，阈值写在政策文件里。政策是真实的，但执行靠记忆，而不是在屏幕上展示并评估。

第五——这是前四点的结果——复核只能轮流做。五万美元以上的 customer 在增加，团队规模不变。

这页的要点是：产能只能跟着人头涨，因为每一次复核都从空白页开始。而且同一家经销商会被反复要同一份文件。

若被问到——哪几项成本最高？前两项。等经销商，以及材料终于到了之后的手工核对。
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

讲稿

所以方案分五部分。

一个可配置的规则中心：阈值、版本、customer 分段，以及生效范围——受治理，而且不用等发布周期就能改。这直接回应了那些被停掉的旧规则。

一套标准化工作流，让每一次复核使用同样的证据、提供同样的允许动作，并留下同样的记录。

自动化证据收集——内部授信、应收账款、付款和关系数据，加上外部来源，在 credit analyst 打开案卷之前就组装好。经销商只被问一次，而不是反复被问。

差异化政策，让大、中、小 customer 以及不同风险情景，不再共用一条粗糙的阈值。

以及 AI 辅助分析：历史结果、风险驱动因素，以及某项政策是否仍然合理——提出来供人判断。

这里真正重要的词是受治理。光可配置，只是把风险挪了个位置。版本、范围和证据，才让可配置变得安全。

若被问到——这是不是要替换五万美元那条规则？它替换的是那条规则作为政策。分段和风险决定一个账户需要多少关注，而做决定的规则本身是有版本、可检查的。
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
    <p>Restriction and escalation stay with a person.</p>
    <small>Review result: <b>Escalation proposed</b></small>
  </section>
</div>

<p class="takeaway"><b>Capacity grows without linear headcount.</b></p>

<!--
SCRIPT

That splits the work into three lanes.

Low risk: the rules pass, the calculator recommends no change, and the account is cleared and recorded. No analyst touches it.

Borderline: the account arrives with a proposed result, its drivers, and the evidence already assembled. The analyst confirms it, or replaces it with a reason.

High risk and anything exceptional: restriction triggers, credit-manager routing, unusual cases. Those stay with a person — but with the evidence assembled for them.

These are the review modes in the worklist: auto-cleared, AI proposal, and escalation proposed.

And this is how capacity grows without hiring proportionally. The bottom lane stops arriving in the queue at all, and the middle lane arrives finished enough to check rather than build.

IF ASKED — what proportion falls in each lane? Review impact measures the distribution against the active policy before activation.

IF ASKED — is the automated lane an AI decision? No. It is automated because deterministic rules passed and the calculator recommended no change.

讲稿

这样就把工作分成三条通道。

低风险：规则通过，计算器建议不改额度，账户获自动通过并被记录。credit analyst 不碰它。

临界：账户到达时已带有建议结果、驱动因素，以及已经组装好的证据。credit analyst 可以确认建议，也可以改选另一个允许的动作并说明理由。

高风险和任何例外情况：限制触发、信贷经理转办、异常个案。这些仍由人处理——但证据已经为他们组装好。

这三种就是工作清单里的复核模式：自动通过、AI 建议和升级建议。

产能也因此可以增长，而不必按比例加人。最下面那条通道根本不再进入队列；中间那条到达时已经完成到只需核对、而不必再拼案卷。

若被问到——各通道占比多少？Review impact 会在激活前按有效政策衡量这个分布。

若被问到——自动通道是不是 AI 的决定？不是。它能自动，是因为确定性规则通过了，并且计算器建议不改。
-->

---

<p class="kicker">The foundation · v1.0</p>

# Customer Credit Review Ontology

<p class="ontology-subtitle">One vocabulary under every number</p>

<div class="onto-tree" aria-label="Customer Credit Review Ontology entity and property tree">
  <section>
    <label>Case &amp; account</label>
    <ul>
      <li><b>CustomerReview</b><small>review_id · status · review_mode<br>decision_scope · source_system</small></li>
      <li><b>CustomerAccount</b><small>customer_id · customer_name · terms<br>territory · region</small></li>
      <li><b>FinancialRelationship</b><small>financial_master_id · relationship_type<br>sharing · restricted · rolled_up_credit_limit</small></li>
    </ul>
  </section>
  <section>
    <label>Exposure &amp; behavior</label>
    <ul>
      <li><b>ExposureProfile</b><small>total_exposure · utilization_of_limit<br>peak_balance_90d · purchases_yoy</small></li>
      <li><b>ARBalance</b><small>ar_balance · past_due_amount<br>past_due_percentage · aging_as_of</small></li>
      <li><b>ARAgingSnapshot</b><small>current · days_1_30 · days_31_60<br>days_61_90 · days_91_180 · days_360_plus</small></li>
      <li><b>ADPDBTProfile</b><small>adp_w · dbt_w · weighted_terms<br>nsf_count_90d · chargeback_count_90d</small></li>
    </ul>
  </section>
  <section>
    <label>Risk &amp; financials</label>
    <ul>
      <li><b>RiskAssessment</b><small>risk_band · risk_number · weighted_score<br>trend · factor_scores</small></li>
      <li><b>FinancialProfile</b><small>net_leverage · altman_z_score<br>ebitda_margin · current_ratio · frisk_score</small></li>
      <li><b>FinancialStatement</b><small>fiscal_year · period_end · reporting_currency<br>auditor_opinion · line_items</small></li>
    </ul>
  </section>
  <section>
    <label>External</label>
    <ul>
      <li><b>ExternalCreditProfile</b><small>nacm_risk_score · nacm_dbt · dnb_paydex<br>dnb_failure_score · payment_trend</small></li>
      <li><b>ExternalTradeLine</b><small>reporting_member · high_credit · balance<br>terms · payment_manner</small></li>
    </ul>
  </section>
  <section>
    <label>Decision &amp; workflow</label>
    <ul>
      <li><b>CreditDecision</b><small>recommended_credit_limit · recommendation<br>limit_change_percent · analyst_commentary</small></li>
      <li><b>ReviewRuleResult</b><small>rule_id · condition · status · detail</small></li>
      <li><b>AIReview</b><small>confidence · conclusion · drivers · summary</small></li>
      <li><b>ReviewHistoryEntry</b><small>review_date · decision · decided_by · comments</small></li>
      <li><b>AnalystAction</b><small>action_type · performed_by · target_system</small></li>
      <li><b>ReviewDocument</b><small>file_name · category · uploaded_at · document_status</small></li>
    </ul>
  </section>
</div>

<p class="takeaway"><b>A threshold is governable only if its terms are defined once.</b></p>

<!--
SCRIPT

None of the previous slide works without this one.

This is the Customer Credit Review Ontology, version 1.0. It covers the case and account, exposure and payment behaviour, risk and financials, external data, and the decision and workflow. The tree shows the properties beneath each entity: not just a label such as AR balance, but the balance, past-due amount, past-due percentage, aging date, and the other facts needed to interpret it consistently.

Here is why it matters commercially, and it is the sentence to take away. A threshold can only be governed, versioned, and scoped to a segment if the thing it constrains has one agreed definition, one type, one unit, and one owner. Without that, past due percent means three different things in three systems — and a rule center just becomes a faster way to disagree.

Decision scope is a good example of the value. It is defined once as the financial master plus sharing-Y subsidiaries. That definition is how the same customer stops being counted twice in a roll-up.

In Customer Review, every figure is openable because the ontology definition, value, provenance, and policy use travel together.

IF ASKED — is this modeling for its own sake? No. It is the precondition for the rule center, for differentiated policies, and for reusing the same rule across regions.

讲稿

没有这一页，前面那一页都立不住。

这就是 Customer Credit Review Ontology 1.0。它覆盖案卷与账户、敞口与付款行为、风险与财务、外部数据，以及决定与工作流。树状结构展示了每个实体下面的属性：不只是“应收账款余额”这样一个标签，而是余额、逾期金额、逾期占比、账龄日期，以及一致解释这个数字所需的其他事实。

商业上为什么重要，带走这一句就够。一条阈值只有在它所约束的对象有一个约定定义、一种类型、一个单位、一个责任人时，才能被治理、被版本化、并限定到某个分段。没有这些，逾期占比在三个系统里会是三种意思——规则中心只会变成更快地各说各话。

决策范围就是一个好例子。它被一次性定义为财务主账户加上 sharing-Y 子公司。正是这个定义，让同一个 customer 在汇总时不会被算两次。

在 Customer Review 里，每个数字都能点开，因为本体定义、数值、来源和政策用途始终绑定在一起。

若被问到——这是不是为建模而建模？不是。它是规则中心、差异化政策，以及同一条规则跨地区复用的前提。
-->

---

<p class="kicker">The foundation · Sources</p>

# Every attribute has a source

<table class="onto-source">
  <thead><tr><th>Entity</th><th>Example attributes</th><th>Mapped table · API</th></tr></thead>
  <tbody>
    <tr><td><code>CustomerAccount</code></td><td>customer_id · customer_name · territory · terms · region</td><td><code>dim_us.dim_pub_customer_info</code><small>GET /api/customer/{custNo}</small></td></tr>
    <tr><td><code>ARBalance</code></td><td>ar_balance · past_due_amount · past_due_percentage (derived)</td><td><code>dim_us.dim_pub_customer_credit_info</code><small>POST /api/customers/creditInfo/queryForm</small><em>past_due_amt ÷ curr_bal</em></td></tr>
    <tr><td><code>ExposureProfile</code></td><td>total_exposure · utilization_of_limit</td><td><code>dim_us.dim_pub_customer_credit_info</code><small>POST /api/customers/creditInfo/queryForm · derived</small></td></tr>
    <tr><td><code>FinancialRelationship</code></td><td>financial_master_id · relationship_type</td><td><code>CIS.dbo.cust_xref</code><small>GET /api/customer/{custNo}/relationship/FINAN_SUB</small></td></tr>
    <tr><td><code>ExternalCreditProfile</code></td><td>NACM aging and score concepts (partial)</td><td><code>dim_us.dim_customer_nacm_cms_aging</code><small>POST /api/customer/nacm/nacmDetail/excel/queryForm</small><em>Field mapping unverified</em></td></tr>
    <tr><td><code>ReviewDocument</code></td><td>file_name · uploaded_at · document_status</td><td><code>customer_attach</code><small>GET /api/customer/{customerNo}/files?templateType=FINANCIAL_STATEMENT</small></td></tr>
  </tbody>
</table>

<p class="source-note">Derived and partial mappings are labeled; field grain and runtime contracts still require read-only verification.</p>

<p class="takeaway"><b>Same rule, same meaning, in the US and Canada.</b></p>

<!--
SCRIPT

And this is not abstract. Every attribute has a definition and a named source.

Customer account identity, name, territory, terms, and region map to <code>dim_us.dim_pub_customer_info</code> and <code>GET /api/customer/{custNo}</code>.

AR balance and past-due amount map to <code>dim_us.dim_pub_customer_credit_info</code> and <code>POST /api/customers/creditInfo/queryForm</code>. Past-due percentage is derived as <code>past_due_amt / curr_bal</code>; it is not a source field.

Exposure is derived from the same source: current balance plus pending amount, over the credit limit. Read that one aloud, because it is the clearest example of the value. Defining it once, here, is what stops three teams computing it three different ways.

Financial-master identifiers and relationship type map to <code>CIS.dbo.cust_xref</code>, using the <code>FINAN_SUB</code> relationship API. NACM aging and score concepts have a partial mapping to <code>dim_us.dim_customer_nacm_cms_aging</code> and the NACM query API; the concrete field mapping remains unverified. Review documents map to <code>customer_attach</code> and the financial-statement files API. Field grain and runtime contracts still need read-only verification.

That is what turns a policy sentence into something a system can evaluate. No more than ten percent past due is enforceable only once past-due percentage has one definition, one unit, and one authoritative source. It is also what lets the same rule mean the same thing in the US and in Canada.

IF ASKED — how complete is this mapping? We have gone through it property by property, including the parts that still need verification and the few that need an external provider. I would rather walk you through that separately than put it on a slide.

讲稿

而且这并不抽象。每个属性都有定义，也有具名来源。

Customer account 的身份、名称、区域、账期和地区，映射到 <code>dim_us.dim_pub_customer_info</code> 和 <code>GET /api/customer/{custNo}</code>。

应收账款余额和逾期金额，映射到 <code>dim_us.dim_pub_customer_credit_info</code> 和 <code>POST /api/customers/creditInfo/queryForm</code>。逾期占比由 <code>past_due_amt / curr_bal</code> 派生，不是来源字段。

敞口由同一来源派生：应收账款余额加上在途，再除以授信额度。这一条要大声读出来，因为它最能说明价值。在这里定义一次，才能阻止三个团队用三种算法去算。

财务主账户标识和关系类型映射到 <code>CIS.dbo.cust_xref</code>，并使用 <code>FINAN_SUB</code> 关系 API。NACM 账龄和评分概念只完成了到 <code>dim_us.dim_customer_nacm_cms_aging</code> 与 NACM 查询 API 的部分映射；具体字段仍未核实。复核文件映射到 <code>customer_attach</code> 和财务报表文件 API。字段粒度和运行时契约仍需只读核实。

这才把一句政策变成系统能评估的东西。“逾期不超过百分之十”只有在逾期占比有一个定义、一个单位、一个权威来源时才能执行。这也让同一条规则在美国和加拿大表示同一件事。

若被问到——这张映射有多完整？我们已经逐个属性过了一遍，包括仍需核实的部分，以及少数需要外部提供方的部分。我更愿意单独带你们走一遍，而不是放在一页幻灯片上。
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

讲稿

这些在产品里长这样。

最上面一行是队列到达时的样子。三个账户有待决定的建议，其中两个是升级，一个自动通过。这些计数来自评估——没有人手工填进去。

清单里，Northwind 是自动通过、仅可查看。把这一句说清楚：这个账户完全没有占用 credit analyst 注意力。这就是分层那一页最下面那条通道在工作。另外三个各自写明建议是什么，以及为什么值得打开。

右边是本体变得可摸到。点任何一个数字——这里是逾期比率——你会看到它的含义、类型和单位、数值从哪来，以及用过它的每一条规则。包括并不适用的 NET 30 规则。最后这一点很重要：你能看到被考虑过又被排除的，而不只是触发了的。

案卷本身也已经组装好：十二个分区，从快照和敞口一直到财务和附件，集中在一处，而不是分散在多个系统。
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

<p class="boundary"><b>The review record</b> keeps the original proposal beside the analyst’s decision, reason, policy version, and evaluation references.</p>

<!--
SCRIPT

The decision is still the analyst's, and it is recorded.

They can confirm the proposed result, which is recorded as reviewed against a named policy version.

Or they replace it — a different action from the allowed vocabulary, with a required reason, and the original proposal stays on record beside it. Point at that reason field during the walkthrough. That field is what turns a disagreement into evidence rather than a shrug, and it is the raw material for the improvement loop later in the deck.

Or they reopen, which is itself an event in the history rather than a silent erase.

What gets recorded is the action, the reason, the policy version, and the evaluation references. That combination is what makes this auditable rather than merely faster.

The review record keeps the original proposal beside the analyst’s decision, reason, policy version, and evaluation references.

IF ASKED — can an analyst override the findings? No. They replace the resolved action. The findings are objective evaluations of policy against facts, and they stay visible either way.

讲稿

决定仍然属于 credit analyst，而且会被记录。

他们可以确认建议结果，记录为对照某个具名政策版本完成了复核。

或者替换它——从允许的动作词表里选另一个动作，并填写必填理由；原来的建议仍会留在旁边。演示时要点一下那个理由字段。正是这个字段把一次分歧变成证据，而不是耸耸肩；它也是后面改进闭环的原材料。

或者重新打开，这本身是历史里的一个事件，而不是悄悄抹掉。

被记录下来的是动作、理由、政策版本，以及评估引用。正是这组信息让它可审计，而不只是更快。

复核记录会同时保留原始建议，以及 credit analyst 的决定、理由、政策版本和评估引用。

若被问到——credit analyst 能不能覆盖 Finding？不能。他们替换的是已解析的动作。Finding 是政策对照事实的客观评估，无论怎样都会保持可见。
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
SCRIPT — WALKTHROUGH ONE

"Let me show you the queue as an analyst would get it."

1. Start on the worklist. Read the KPI strip aloud, then move to the review-mode column. Point at Northwind: auto-cleared, view only. "This account is done. Nobody opened it."

2. Open Ironclad Manufacturing. Take the banner first — the review trigger, the recommended limit against the current one, the proposed action, and the risk band. "Everything I need to start checking is already here."

3. Scroll to the proposal panel. Read the drivers rather than the paragraph. Then jump to the Review Rules section and show the same numbers as evaluated conditions against their thresholds. "The paragraph is readable, but this is the part that is authoritative."

4. Go back to the snapshot and click Past due ratio. Definition, type, unit, provenance, and the exact rules that used it — including the NET 30 rule where it did not apply. Slow down here; this is the ontology slide made real, and it is the moment the room understands what "one definition" buys them.

5. Confirm the result on one account. Then open Cascade Freight, replace the result with a different action and a reason, and show it landing in the history and coming back in the queue as completed.

6. Return to the worklist so the queue state is visible before you move on.

IF SOMETHING MISBEHAVES — move to the next step and return to it after the walkthrough.

讲稿 — 演示一

“我先按 credit analyst 会看到的样子，给你们看队列。”

1. 从工作清单开始。把 KPI 条大声读出来，再看复核模式这一列。指一下 Northwind：自动通过，仅可查看。“这个账户已经完成了。没有人打开过它。”

2. 打开 Ironclad Manufacturing。先看横幅——复核触发条件、建议额度对照当前额度、建议动作，以及风险档。“我开始核对所需的一切，已经在这里了。”

3. 滚到建议面板。读驱动因素，不要读那段文字。然后跳到 Review Rules 分区，把同样的数字展示成对照阈值评估过的条件。“那段文字好读，但权威的是这一部分。”

4. 回到快照，点 Past due ratio。定义、类型、单位、来源，以及用过它的精确规则——包括并不适用的 NET 30 规则。这里要放慢；这就是本体那一页变成实物的时刻，也是房间里的人明白“一个定义”能换来什么的时刻。

5. 在一个账户上确认结果。然后打开 Cascade Freight，用另一个动作和一条理由替换结果，并展示它落入历史、再回到队列里显示为已完成。

6. 回到工作清单，让队列状态在继续之前可见。

若出了问题——继续往下走，并说出来。页面上的确定性证据才是产品；这是目标体验的示意，不是生产系统。
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

讲稿 — 演示二

“故事的另一半是：当问题出在规则本身时，会发生什么。”

先把场景说清楚：这就是方案页里的规则中心，从 credit analyst 刚才用的同一条工具栏就能进。政策负责人不用提单、也不用等发布。

1. 打开 Configure rules。指一下当前有效政策版本芯片。“每一个候选都对照一个具名基线比较。这就是版本在起作用。”

2. 用收紧 NET 30 的示例意图，加载它的候选。展示结构化差异：范围不变，阈值从百分之八改到百分之五，政策句子被重述。

3. 跑验证。再跑兼容性，并把结果读出来：兼容细化，有效百分之八到候选百分之五，对照全局上限百分之十。

4. 跑 Review impact。在由十二条边界记录组成的 Policy Impact Cohort 中，新增三条需要人工复核的记录，而且发生变化的记录都已列明。“这曾经是一个意见问题。”

5. 可选但很有力：改加载百分之八放到百分之十五的放宽，展示它在兼容性处作为冲突停下，根本不产生影响数字。“被挡住的候选是控制在工作，不是缺陷。”

6. 回到工作清单，展示候选预览横幅。然后明确说：有效政策没有改，也没有任何东西被批准。

把两个数字分开——Policy Impact Cohort 的计数和工作清单预览来自两次独立的确定性比较。工作台故意不把一个投射到另一个上，你也不该这么做。
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

IF ASKED — who owns the threshold? Threshold ownership is part of policy governance; the approval role must be named before activation.

讲稿

把两次演示合在一起，复核就开始自我改进。

credit analyst 替换一条建议结果，并记录原因。这是第一步，几分钟前你们已经看见了。

当同一种替换反复出现，那不是 credit analyst 的问题。那是关于阈值的问题。

第三步是测试这次变更——候选、验证、兼容性和影响，对照运行复核的同一套引擎。不是电子表格，也不是猜测。

第四步，你在队列里看到哪些账户会变动，而且是在任何批准之前。

业务因此得到：更少对经销商的重复索要，更少手工比对，产能不必跟着人头涨，以及一套可度量、有版本、可审计的复核过程。它也能跨地区复用，因为即使阈值不同，本体和规则范围仍是共享的。

若被问到——一次替换就能证明阈值错了吗？不能。它是值得调查的证据。影响评估才会把它变成有人能负责的决定。

若被问到——阈值归谁管？阈值归属属于政策治理的一部分；激活前必须明确批准角色。
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

讲稿

最后一页，讲的是信任。它故意放在这里而不是开头——你们已经看到了价值，所以这一页回答的是“我们能不能信它”，而不是抢先回答一个还没人问的问题。

左边是它有用的原因。证据组装成一份案卷。规则、Finding 和建议额度由确定性计算得出。证据再被转成带驱动因素的可读理由。

右边是永远不动的部分。权威事实及其共享含义。做验证、比较和解析的控制。以及选择本身——复核决定，以及任何政策批准。

我想留给你们的一句话是：可信的解释不是证明。权威证据始终在那段文字上方的页面上，正因为如此，credit analyst 可以核对，而不必相信。

要再往前走，我们需要这些。和真正做 customer review 的人谈半小时。对已映射属性背后的源系统做只读核实。以及写上谁负责阈值、例外和回滚。

收束句——“这次演示里的技术是能跑的。接下来我们需要的是你们的领域知识，而不是更多工程。”
-->

---

<p class="kicker">Appendix · Evidence</p>

# Every finding is traceable

<div class="trace-card">
  <header><code>credit-1.4.0/CRITICAL_RESTRICTION@1</code><b>FINDING</b></header>
  <div class="trace-policy"><small>Policy</small><strong>An unrestricted customer with more than 10% past due, negative operating cash flow, and a current ratio below 1 requires restriction.</strong></div>
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

讲稿 — 若被问到 Finding 如何成立再用

这是你们前面看到的 Ironclad 建议背后的规则评估轨迹。

政策陈述在最上面，用的是人写的原话。下面是三个条件，每个都有实际值、运算符、阈值和单位——并且都标为匹配。

底部是原因码、动作提示，以及本体和解析器的钉住版本。

浏览器只是把带类型的原始值格式化出来。这里没有生成文本，所以它可以用来为一次决定辩护。

若被问到——缺值时会怎样？它会明确保持为不确定。它绝不会塌缩成猜出来的通过或失败。
-->

---

<p class="kicker">Appendix · Impact</p>

# How impact is calculated

<div class="impact-compare">
  <section><small>Active policy</small><b>NET 30 maximum: 8%</b><span>Evaluate 12 boundary records</span></section>
  <i>vs</i>
  <section class="candidate"><small>Candidate</small><b>NET 30 maximum: 5%</b><span>Evaluate the same records, compare</span></section>
  <div><strong>3</strong><b>additional records require review</b><small>Ratios at 6%, 7%, and 8% cross the new line</small></div>
</div>

<div class="completeness">evaluated · newly required · cleared · changed actions · added/resolved findings · indeterminate · errors · <b>complete</b></div>

<!--
SCRIPT — USE IF ASKED HOW THE IMPACT NUMBER IS PRODUCED

The same twelve boundary records are evaluated twice — once under the active policy, once under the candidate — and the outcomes are compared.

Three of them newly require review, and you can see exactly which: the records sitting at six, seven, and eight percent, which cross the new five percent line.

This is deterministic workload evidence, not a model estimate. Equality boundaries are explicit, and the changed records are listed first.

If any record comes back indeterminate or errors, the assessment is marked incomplete — and an incomplete assessment cannot reach evidence complete.

讲稿 — 若被问到影响数字如何得出再用

同一批十二条边界记录会被评估两次——一次用有效政策，一次用候选——然后比较结果。

其中三条新需要复核，而且你能精确看到是哪三条：落在百分之六、百分之七和百分之八的记录，它们越过了新的百分之五这条线。

这是确定性的工作量证据，不是模型估算。相等边界是明确的，变更记录会先列出来。

如果任何记录返回不确定或出错，评估就会标为不完整——不完整的评估到不了证据完整。
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

讲稿 — 若被问到什么阻止 AI 编造政策再用

操作正好三个。它可以在两个受支持的政策族里起草一条规则。它可以解释一次复核，并引用确定性证据。它也可以解释一次已完成的政策分析，依据的是汇总证据，而不是 customer 行。

没有通用补全接口，没有自由 SQL，没有模式探索，也没有任意规则编写。

每一条响应都会对照模式检查，引用也会被验证。不符合的输出会被整份拒绝——网关绝不会悄悄修补。

底部那一条才是重点：事实、验证结果、动作、批准、本体定义或决定，从来不会来自模型输出。
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

<p class="architecture-rule"><b>AI drafts. Deterministic systems verify. Authorized people approve.</b></p>

<!--
SCRIPT — USE IF ASKED ABOUT THE ARCHITECTURE

Start in the centre. CIS stays authoritative for the facts, the review workflow, the decision, the audit trail, and any change to customer state. We are not proposing to replace it.

To the right is the review-time runtime. It runs approved policies only, deterministically, and it is isolated from authoring.

Below that, the policy control plane — where a rule is drafted, validated, compiled, conflict-checked, impact-qualified, and then approved by a person. Only an immutable approved release crosses into the runtime.

The line worth saying out loud: AI never enters the review-time path. It assists at authoring time and at explanation time, and nowhere else.

The key invariant is that authoring and review-time execution stay separate, with only an immutable approved release crossing into runtime.

讲稿 — 被问到架构时再用

从中间开始。CIS 对事实、复核工作流、决定、审计轨迹，以及对 customer 状态的任何变更，仍然保持权威。我们不提议替换它。

右边是复核时运行时。它只运行已批准的政策，而且是确定性的，并与编写隔离。

再下面是政策控制面——规则在这里被起草、验证、编译、冲突检查、影响认定，然后由人批准。只有一份不可变的已批准发布会进入运行时。

值得大声说的一句：AI 从不进入复核时路径。它只在编写时和解释时辅助，别处都不进。

关键不变量是编写和复核时执行保持隔离，只有不可变的已批准发布能进入运行时。
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
SCRIPT — USE WHEN ASKED "WHAT DO YOU NEED FROM US"

These six questions align Customer Review with how your team runs a review.

Workflow first: what triggers a review, what analysts genuinely inspect, and what each action means operationally once it leaves the screen.

Segmentation is the commercially important one. The forty-eight thousand customers below fifty thousand dollars are unreviewed right now. Deciding what should run there is a policy decision, not a technical one.

Then sources, ownership, and existing controls — we would rather reuse identity, audit and approval than rebuild them.

And finally evidence: which representative cases validate the workflow end to end.

THE ASK — thirty minutes with the people who run customer reviews, then read-only verification of the source systems.

讲稿 — 被问到“你们需要我们做什么”时用

这六个问题用于让 Customer Review 与你们团队的实际复核方式对齐。

先谈工作流：什么触发一次复核，credit analyst 真正检查什么，以及每个动作离开屏幕之后在运营上意味着什么。

分段是商业上最重要的一项。现在五万美元以下的四万八千个 customer 没有被复核。决定那里该跑什么，是政策决定，不是技术决定。

然后是来源、归属和现有控制——我们更愿意复用身份、审计和批准，而不是重建它们。

最后是证据：哪些代表性个案可以端到端验证整个工作流。

具体请求——和做 customer review 的人谈三十分钟，然后对源系统做只读核实。
-->
