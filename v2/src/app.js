/* Version 2 Customer Review UI. Structure and style follow docs/prototypes/customer_review_prototype.html
   (SE vision, 2026-08). Review facts and R1-R6 controls come from the v2-owned deterministic
   domain in ./review-pack.js; the evaluator, authoring, governance, and dispositions runtime remains
   shared with ../../src. AI proposes the review result of every account; credit analysts decide.
   Seeded Tier-2 context (territories, reviewers, history, NACM/D&B style data) lives in ./context.js. */
import { createEvaluator } from "../../src/core/runtime.js";
import { narrativeCustomers, registry, reviewPack } from "./review-pack.js";
import { createDispositionStore, dispositionActions, DISPOSITION_STORAGE_KEY } from "../../src/domains/credit/dispositions.js";
import { actionLabels, reviewMeta } from "./context.js";
import { createPolicyWorkbench } from "./policy.js";

const evaluate = createEvaluator(reviewPack);

/* Dispositions are session-scoped and isolated from v1 by a key prefix. */
const v2Storage = {
  getItem: key => sessionStorage.getItem(`v2:${key}`),
  setItem: (key, value) => sessionStorage.setItem(`v2:${key}`, value),
  removeItem: key => sessionStorage.removeItem(`v2:${key}`)
};
const store = createDispositionStore(v2Storage);
const SESSION_HISTORY_STORAGE_KEY = "customer-review:history:v1";
let assessedCandidateImpact = null;

document.getElementById("activePolicyVersion").textContent = reviewPack.release.id;

function allSessionEvents() {
  try {
    const value = JSON.parse(v2Storage.getItem(SESSION_HISTORY_STORAGE_KEY) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function sessionEvents(record) {
  return allSessionEvents().filter(event =>
    event.customerNumber === record.customer.customer_number && event.releaseId === record.result.release.id
  );
}

function appendSessionEvent(record, event) {
  v2Storage.setItem(SESSION_HISTORY_STORAGE_KEY, JSON.stringify([...allSessionEvents(), {
    ...event,
    customerNumber: record.customer.customer_number,
    releaseId: record.result.release.id,
    at: new Date().toISOString()
  }]));
}

function removeDisposition(context) {
  /* The store intentionally has no single-record delete; "reopen" removes the saved
     record using the store's documented key format (customerNumber::releaseId). */
  const all = JSON.parse(v2Storage.getItem(DISPOSITION_STORAGE_KEY) || "{}");
  delete all[`${context.customerNumber}::${context.releaseId}`];
  v2Storage.setItem(DISPOSITION_STORAGE_KEY, JSON.stringify(all));
}

/* ---------- formatting ---------- */
const escapeHtml = value => String(value).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const money = value => value == null ? "—" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
const pct = value => value == null ? "—" : `${(value * 100).toFixed(1).replace(/\.0$/, "")}%`;
const num2 = value => value == null ? "—" : String(Math.round(value * 100) / 100);
const termsLabel = terms => terms ? terms.replace("_", " ") : "—";
function fmtPart(part) {
  if (part.value == null) return "—";
  switch (part.format) {
    case "CURRENCY": return money(part.value);
    case "PERCENT": return pct(part.value);
    case "DAYS": return `${part.value}d`;
    case "NUMBER": return num2(part.value);
    default: return String(part.value);
  }
}

/* ---------- engine-driven review records ---------- */
const gradePoints = { strong: 1, acceptable: 2, watch: 3, weak: 4, severe: 4 };
function riskProfile(calc) {
  if (!calc.contributions) return { band: "Not rated", num: null, factors: [] };
  const factors = [
    ["Current ratio", calc.contributions.currentRatio],
    ["Debt / equity", calc.contributions.debtToEquity],
    ["EBITDA margin", calc.contributions.ebitdaMargin],
    ["Operating cash-flow margin", calc.contributions.ocfMargin],
    ["Net income margin", calc.contributions.netMargin],
    ["Payment behavior", calc.paymentGrade]
  ];
  const financial = Object.values(calc.contributions).reduce((n, g) => n + gradePoints[g], 0) / 5;
  const score = 0.6 * financial + 0.4 * gradePoints[calc.paymentGrade];
  const band = score < 1.5 ? "Low Risk" : score < 2.25 ? "Moderate Risk" : score < 3 ? "Elevated Risk" : "High Risk";
  return { band, num: score.toFixed(2), factors };
}
const bandColor = band => band.includes("High") || band.includes("Elevated") ? "var(--high)" : band.includes("Moderate") ? "var(--soft)" : band.includes("Low") ? "#4f8a3d" : "var(--faint)";
const proposalTone = { AUTO_REVIEW_PASS: "pass", REQUEST_UPDATED_FINANCIAL_STATEMENTS: "soft", RECOMMEND_CREDIT_LIMIT_REASSESSMENT: "soft", NEED_MANUAL_REVIEW: "high", NEED_CREDIT_MANAGER_REVIEW: "high", NEED_TO_RESTRICT: "high" };

const records = narrativeCustomers.map(customer => {
  const result = evaluate(customer);
  const meta = reviewMeta[customer.customer_number];
  const risk = riskProfile(result.calculation);
  return { id: String(customer.customer_number), customer, result, meta, risk };
});
const recordById = id => records.find(record => record.id === String(id));
const dispositionContext = record => ({
  customerNumber: record.customer.customer_number,
  releaseId: record.result.release.id,
  evaluationRefs: record.result.traces.map(trace => trace.evaluationRef),
  deterministicAction: record.result.action.primary
});
const savedDisposition = record => store.load(dispositionContext(record));
const isAuto = record => record.result.action.primary === "AUTO_REVIEW_PASS";
const statusOf = record => savedDisposition(record) ? "Completed" : isAuto(record) ? "Auto-cleared" : "AI proposal · awaiting decision";

/* ---------- AI proposal ---------- */
function proposal(record) {
  const { result, meta } = record;
  const facts = result.facts, calc = result.calculation, primary = result.action.primary;
  const tone = proposalTone[primary];
  const hold = `holding the limit at ${money(facts.credit_limit)}`;
  const materialFindings = result.findings.filter(trace => trace.finding.material);
  const manualReasons = materialFindings.map(trace => trace.policy.title).join("; ");
  const text = {
    AUTO_REVIEW_PASS: () => `No deterministic control requires intervention and the calculator recommends no limit change. Proposed result: auto review pass — keep the limit at ${money(facts.credit_limit)} on ${termsLabel(facts.payment_terms)}. View only; no analyst action required.`,
    REQUEST_UPDATED_FINANCIAL_STATEMENTS: () => `Financial statements on file are ${facts.financial_statement_status} and policy requires current statements above $50,000; the limit calculator is blocked until they arrive. AI proposes requesting updated financial statements and ${hold}. Analyst decision required.`,
    NEED_CREDIT_MANAGER_REVIEW: () => `Deterministic findings require credit-manager review: ${manualReasons}. AI proposes ${hold}. Analyst decision required.`,
    NEED_MANUAL_REVIEW: () => `Deterministic findings require manual review: ${manualReasons}.${result.action.supporting.includes("REQUEST_UPDATED_FINANCIAL_STATEMENTS") ? " Updated financial statements are also required." : ""} AI proposes ${hold}. Analyst decision required.`,
    RECOMMEND_CREDIT_LIMIT_REASSESSMENT: () => `No deterministic control requires manual intervention. The advisory calculator supports an increase from ${money(calc.current)} to ${money(calc.recommended)}, capped by ${calc.bindingConstraint === "REQUESTED_LIMIT" ? "the requested limit" : calc.bindingConstraint === "DEMAND" ? "order demand" : "financial capacity"}. AI proposes a credit-limit reassessment. Analyst decision required.`,
    NEED_TO_RESTRICT: () => `A deterministic restriction control requires intervention. AI proposes restricting the customer and ${hold}. Analyst decision required.`
  }[primary]();

  const drivers = result.findings.map(trace => {
    const match = trace.observations.find(o => o.role === "CONDITION" && o.result === "MATCH");
    return [trace.finding.material ? "neg" : "neu", `${trace.finding.material ? "Deterministic finding" : "Visibility signal"} · ${trace.policy.title}: ${match ? `${match.factLabel} ${fmtPart(match.actual)} vs ${match.comparison.operator} ${fmtPart(match.comparison)}` : trace.finding.reasonCode}`];
  });
  if (calc.material) drivers.push([calc.delta < 0 ? "neg" : "neu", `Calculator: ${calc.direction.toLowerCase()} to ${money(calc.recommended)} (${pct(calc.deltaPercent)})`]);
  if (calc.status === "BLOCKED_FINANCIALS_REQUIRED") drivers.push(["neu", "Calculator blocked — current financial statements required"]);
  if (!drivers.length) drivers.push(["pos", "No deterministic control requires intervention"], ["pos", `Calculator: no limit change recommended (${money(calc.recommended)})`]);

  const paymentReasonCodes = new Set(["ADP_W_THRESHOLD_EXCEEDED", "LOW_ADP_DELINQUENT_INVOICES", "RECENT_PAYMENT_EXCEPTION"]);
  const paymentFindings = result.findings.filter(trace => paymentReasonCodes.has(trace.finding.reasonCode));
  const paymentWarn = paymentFindings.some(trace => trace.finding.material) || ["watch", "severe"].includes(calc.paymentGrade);
  const maxBalanceFinding = result.findings.find(trace => trace.finding.reasonCode === "MAX_BALANCE_VISIBILITY");
  const relationshipFindings = result.findings.filter(trace => ["FINANCIAL_GROUP_RESTRICTED", "AUTO_REVIEW_LIMIT_REACHED"].includes(trace.finding.reasonCode));
  const secs = [
    ["Payment behavior", paymentWarn ? "warn" : "ok",
      `Deterministic ${paymentFindings.length ? "finding" : "result"}: ADP-W ${facts.adp_w_90d}d versus ${facts.weighted_terms_days} weighted-term days; ${money(facts.open_invoices_over_39_days)} in invoices at least 39 days old; past due ${money(facts.past_due_amount)} (${pct(facts.past_due_ratio)} of AR); ${facts.nsf_count_90d} NSF and ${facts.chargeback_count_90d} chargeback events.${paymentFindings.length ? ` Controls: ${paymentFindings.map(trace => trace.policy.title).join(", ")}.` : ""}`],
    ["Financials", facts.financial_statement_status === "CURRENT" ? "ok" : "warn",
      `Deterministic ${facts.financial_statement_status === "CURRENT" ? "result" : "finding"}: statements ${facts.financial_statement_status}; revenue ${money(facts.annual_revenue)}, EBITDA margin ${pct(facts.ebitda_margin)}, current ratio ${num2(facts.current_ratio)}.${calc.financialGrade ? ` Financial grade ${calc.financialGrade}.` : " The advisory calculator is blocked until statements are refreshed."}`],
    ["External signals", meta.ext.flag[0] === "warn" ? "warn" : "neu",
      `Corroborating context: ${meta.ext.summary} External signals explain the proposal but do not add a finding or change the deterministic action.`],
    ["Relationship and exposure", relationshipFindings.length ? "warn" : maxBalanceFinding ? "neu" : "ok",
      `Deterministic ${relationshipFindings.length ? "finding" : "result"}: ${facts.relationship_type === "FINANCIAL_MASTER" ? "financial master" : "single account"}; total exposure ${money(facts.total_exposure)}; maximum 90-day balance ${money(facts.max_balance_90d)} (${pct(facts.max_balance_percent_of_limit)} of limit); sharing-group restriction ${facts.sharing_group_restricted}; automatic review count ${facts.auto_review_count} of ${facts.auto_review_limit}.${maxBalanceFinding ? " R3 is a visibility signal only and does not determine the action." : ""}${relationshipFindings.length ? ` Controls: ${relationshipFindings.map(trace => trace.policy.title).join(", ")}.` : ""}`]
  ];
  const rec = [
    ["New limit", calc.recommended == null ? money(calc.current) : money(calc.recommended), calc.recommended == null || calc.direction === "NO_CHANGE" ? "hold" : calc.direction === "INCREASE" ? "up" : "down"],
    ["Terms", termsLabel(facts.payment_terms), ""],
    ["Next review", meta.nextReviewDelta, ""]
  ];
  return { tone, text, drivers, secs, rec };
}

/* ---------- KPIs, tabs, queue ---------- */
let activeTab = "mine";
let filterState = { query: "", status: "All" };

const pending = record => !isAuto(record) && !savedDisposition(record);
const tabFilters = {
  mine: pending,
  all: () => true,
  auto: isAuto,
  done: record => Boolean(savedDisposition(record))
};

function matchesFilters(record) {
  const query = filterState.query.trim().toLowerCase();
  if (query && !record.id.includes(query) && !record.customer.name.toLowerCase().includes(query)) return false;
  if (filterState.status !== "All" && statusOf(record) !== filterState.status) return false;
  return true;
}

function renderKpis() {
  const awaiting = records.filter(pending).length;
  const escalations = records.filter(record => pending(record) && record.result.action.primary === "NEED_MANUAL_REVIEW").length;
  const visibilitySignals = records.filter(record => record.result.findings.some(trace => trace.finding.reasonCode === "MAX_BALANCE_VISIBILITY")).length;
  const auto = records.filter(isAuto).length;
  document.querySelector("#queueWrap .kpis").innerHTML = `
    <div class="kpi acc-ai"><div class="k-l"><span class="dot ai"></span>AI proposal, awaiting decision</div><div class="k-v">${awaiting}</div><div class="k-s">Proposal ready for analyst decision</div></div>
    <div class="kpi acc-high"><div class="k-l"><span class="dot high"></span>Manual review proposed</div><div class="k-v">${escalations}</div><div class="k-s">One or more R1–R6 gates require a person</div></div>
    <div class="kpi acc-soft"><div class="k-l"><span class="dot soft"></span>R3 visibility signal</div><div class="k-v">${visibilitySignals}</div><div class="k-s">Peak balance ≥150% of limit · non-actioning</div></div>
    <div class="kpi acc-pass"><div class="k-l"><span class="dot pass"></span>Auto-cleared</div><div class="k-v">${auto}</div><div class="k-s">No deterministic intervention required</div></div>
    <div class="kpi"><div class="k-l">Due this cycle</div><div class="k-v">${records.length}</div><div class="k-s">Active policy · ${escapeHtml(reviewPack.release.id)}</div></div>`;
}

function renderTabs() {
  const count = key => records.filter(tabFilters[key]).length;
  const tabs = [["mine", "My worklist"], ["all", "All due"], ["auto", "Auto-cleared"], ["done", "Completed"]];
  document.querySelector("#queueWrap .tabs").innerHTML = tabs.map(([key, label]) =>
    `<button class="tab" role="tab" aria-selected="${activeTab === key}" data-tab="${key}">${label} <span class="n">${count(key)}</span></button>`).join("");
}

function candidateImpactFor(record) {
  const row = assessedCandidateImpact?.rows.find(item => String(item.customerId) === record.id);
  if (!row || row.error || row.indeterminate) return null;
  const actionChanged = row.baselineAction !== row.candidateAction;
  const findingsChanged = row.addedFindings.length || row.resolvedFindings.length;
  if (!actionChanged && !findingsChanged) return null;
  const label = row.baselineAction === "AUTO_REVIEW_PASS" && row.candidateAction !== "AUTO_REVIEW_PASS"
    ? "Candidate Would Require Review"
    : row.baselineAction !== "AUTO_REVIEW_PASS" && row.candidateAction === "AUTO_REVIEW_PASS"
      ? "Candidate Would Clear Review"
      : actionChanged
        ? "Candidate Review Path Change"
        : row.addedFindings.length && !row.resolvedFindings.length
          ? "Candidate Finding Added"
          : row.resolvedFindings.length && !row.addedFindings.length
            ? "Candidate Finding Resolved"
            : "Candidate Findings Changed";
  return { label, row };
}

const amtCell = (value, ratio) => {
  const atOrAboveTenPercent = ratio >= 0.10;
  const tier = atOrAboveTenPercent ? "high" : value > 0 ? "soft" : "";
  const sub = atOrAboveTenPercent ? `<span class="s">≥ 10% of AR</span>` : value > 0 ? `<span class="s">&lt; 10% of AR</span>` : `<span class="s">no past due</span>`;
  return `<div class="amt ${tier}">${money(value)}${sub}</div>`;
};

function rowHtml(record) {
  const facts = record.result.facts, meta = record.meta;
  const auto = isAuto(record), done = Boolean(savedDisposition(record));
  const tone = proposalTone[record.result.action.primary];
  const candidateImpact = candidateImpactFor(record);
  return `<div class="row p-${tone === "soft" ? "soft" : tone}">
  <div class="cust"><div class="name">${escapeHtml(record.customer.name)} <span class="rel-tag">${facts.relationship_type === "FINANCIAL_MASTER" ? "FINANCIAL MASTER" : "SINGLE"}</span>${candidateImpact ? `<span class="candidate-impact-badge" title="Candidate preview; active policy remains ${escapeHtml(reviewPack.release.id)}">${escapeHtml(candidateImpact.label)}</span>` : ""}</div>
    <div class="sub"><span class="mono">#${record.id}</span><span>${escapeHtml(meta.territory)}</span><span>Terms ${termsLabel(facts.payment_terms)}</span></div></div>
  <div><div class="amt">${money(facts.credit_limit)}</div></div>
  <div>${amtCell(facts.past_due_amount, facts.past_due_ratio)}</div>
  <div class="risk-wrap"><span class="risk-band" style="color:${bandColor(record.risk.band)}">${record.risk.band}</span><span class="risk-num">${record.risk.num ?? "—"}</span></div>
  <div class="mode-cell"><span class="pill ${done ? "pass" : auto ? "pass" : "ai"}">${done ? "Completed" : auto ? "Auto-cleared" : "AI proposal"}</span><span class="conf">${done ? "analyst decided" : auto ? "no actioning finding · view only" : `proposes: ${escapeHtml(actionLabels[record.result.action.primary])}`}</span></div>
  <div class="nrd">${meta.nrd.slice(0, 5)}<span>${meta.nrd.slice(6)}</span></div>
  <div><button class="open-btn ${auto ? "ghost" : ""}" onclick="openDetail('${record.id}')">${auto || done ? "View" : "Review"}</button></div>
</div>`;
}

function renderQueue() {
  renderKpis();
  renderTabs();
  const impactNotice = document.getElementById("candidateImpactNotice");
  if (assessedCandidateImpact) {
    const changed = records.filter(candidateImpactFor).length;
    impactNotice.classList.remove("hidden");
    impactNotice.innerHTML = changed
      ? `<b>Candidate preview:</b> ${changed} worklist ${changed === 1 ? "account has" : "accounts have"} a changed finding or review path under candidate revision ${escapeHtml(assessedCandidateImpact.revision)}. Active policy remains ${escapeHtml(assessedCandidateImpact.activeReleaseId)}.`
      : `<b>Candidate preview:</b> no findings or review paths change for accounts 2001–2004. Active policy remains ${escapeHtml(assessedCandidateImpact.activeReleaseId)}.`;
  } else {
    impactNotice.classList.add("hidden");
    impactNotice.textContent = "";
  }
  const visible = records.filter(tabFilters[activeTab]).filter(matchesFilters);
  document.getElementById("list").innerHTML = visible.length
    ? visible.map(rowHtml).join("")
    : `<div style="padding:22px;font-size:13px;color:var(--faint)">No accounts match the current tab and filters.</div>`;
}

/* ---------- detail sections (engine-driven) ---------- */
function jump(sec) {
  const el = document.getElementById(sec);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
  el.classList.add("flash");
  setTimeout(() => el.classList.remove("flash"), 1200);
}

function showFact(factId) {
  const record = recordById(openId);
  const definition = registry.definition(factId);
  const dialog = document.getElementById("factDialog");
  if (!record || !definition || !dialog) return;
  const dependencies = definition.dependencies || [];
  const direct = Object.hasOwn(registry.properties, factId);
  const provenance = direct
    ? "Customer review record."
    : `Deterministically derived from ${dependencies.map(id => registry.definition(id).displayName).join(" and ")}.`;
  const links = record.result.traces.flatMap(trace => trace.observations
    .filter(observation => observation.factId === factId || observation.supportingFactIds.includes(factId))
    .map(observation => ({ trace, observation })));
  const traceRows = links.map(({ trace, observation }) => `<tr>
    <td><code>${escapeHtml(trace.evaluationRef)}</code></td>
    <td>${escapeHtml(trace.policy.title)}</td>
    <td>${escapeHtml(observation.factId === factId ? observation.role.toLowerCase() : `supports ${observation.factLabel}`)}</td>
    <td><span class="rule ${trace.outcome === "PASS" ? "ok" : trace.outcome === "FINDING" ? "fail" : "view"}">${escapeHtml(trace.outcome.replace("_", " "))}</span></td>
  </tr>`).join("");
  document.getElementById("factDialogTitle").textContent = definition.displayName;
  document.getElementById("factDialogBody").innerHTML = `
    <dl class="fact-definition">
      <div><dt>Fact reference</dt><dd><code>fact:${record.id}/${escapeHtml(factId)}</code></dd></div>
      <div><dt>Ontology ID</dt><dd><code>customer.${escapeHtml(factId)}</code></dd></div>
      <div><dt>Shared meaning</dt><dd>${escapeHtml(definition.displayName)} · ${escapeHtml(definition.group)}</dd></div>
      <div><dt>Type</dt><dd>${escapeHtml(definition.type)}</dd></div>
      <div><dt>Unit</dt><dd>${escapeHtml(definition.unit || "unitless")}</dd></div>
      <div><dt>Format</dt><dd>${escapeHtml(definition.format || "TEXT")}</dd></div>
    </dl>
    <p class="fact-provenance"><b>Value provenance:</b> ${escapeHtml(provenance)}</p>
    <h4>Active policy use and exact evaluation traces</h4>
    ${traceRows
      ? `<div class="fact-traces"><table><tr><th>Evaluation reference</th><th>Policy</th><th>Use</th><th>Outcome</th></tr>${traceRows}</table></div>`
      : `<p class="fact-empty">No active policy-rule trace references this fact in this evaluation. It remains available to the deterministic calculator or display context.</p>`}`;
  dialog.showModal();
}

function coreSnapshot(record) {
  const facts = record.result.facts, calc = record.result.calculation;
  const rows = [
    ["Current credit limit", money(facts.credit_limit), "sec-rules", "credit_limit"],
    ["Recommended limit", calc.recommended == null ? "Blocked" : money(calc.recommended), "sec-rules"],
    ["Total exposure", money(facts.total_exposure), "sec-rel", "total_exposure"],
    ["AR balance", money(facts.ar_balance), "sec-aging", "ar_balance"],
    ["Past due", money(facts.past_due_amount), "sec-aging", "past_due_amount"],
    ["Past due %", pct(facts.past_due_ratio), "sec-aging", "past_due_ratio"],
    ["Exposure utilization", pct(facts.credit_utilization), "sec-adp", "credit_utilization"],
    ["Terms", termsLabel(facts.payment_terms), "sec-adp", "payment_terms"],
    ["ADP-W · 90 days", `${facts.adp_w_90d}d`, "sec-adp", "adp_w_90d"],
    ["Weighted terms", `${facts.weighted_terms_days}d`, "sec-adp", "weighted_terms_days"],
    ["Maximum balance · 90 days", money(facts.max_balance_90d), "sec-rel", "max_balance_90d"],
    ["Statement status", facts.financial_statement_status, "sec-fs", "financial_statement_status"],
    ["Monthly run rate", money(facts.monthly_net_sales_run_rate), "sec-fs", "monthly_net_sales_run_rate"],
    ["Sales trend (180/360)", num2(facts.net_sales_trend_ratio), "sec-fs", "net_sales_trend_ratio"],
    ["Risk band", record.risk.band, "sec-risk"],
    ["Findings", `${record.result.findings.length} of ${record.result.traces.length} rules`, "sec-rules"],
    ["Policy release", record.result.release.id, "sec-rules"],
    ["Next review date", record.meta.nrd, "sec-hist"]
  ];
  return `<div class="kv">${rows.map(x => x[3]
    ? `<button type="button" class="kv-i jump fact-link" data-fact="${x[3]}" onclick="showFact('${x[3]}')"><div class="kv-l">${x[0]}</div><div class="kv-v">${x[1]}</div></button>`
    : `<div class="kv-i jump" onclick="jump('${x[2]}')"><div class="kv-l">${x[0]}</div><div class="kv-v">${x[1]}</div></div>`).join("")}</div>
    <div class="jump-note">Ontology facts open their shared definition, provenance, and exact evaluation traces. Other figures jump to supporting detail.</div>`;
}

function exposureBlock(record) {
  const facts = record.result.facts, calc = record.result.calculation;
  const utilCls = facts.credit_utilization >= 0.85 ? "high" : facts.credit_utilization >= 0.65 ? "soft" : "pass";
  const items = [
    ["AR + pending exposure", money(facts.total_exposure), "sec-aging"],
    ["Utilization of limit", `<span class="util ${utilCls}">${pct(facts.credit_utilization)}</span>`, "sec-aging"],
    ["Maximum balance · 90d", money(facts.max_balance_90d), "sec-rel"],
    ["Maximum balance / limit", pct(facts.max_balance_percent_of_limit), "sec-rel"],
    ["Net sales · 180d", money(facts.net_sales_180d), "sec-fs"],
    ["Net sales · 360d", money(facts.net_sales_360d), "sec-fs"],
    ["Monthly run rate", money(facts.monthly_net_sales_run_rate), "sec-fs"],
    ["Sales trend (180/360)", num2(facts.net_sales_trend_ratio), "sec-fs"],
    ["Payment terms", termsLabel(facts.payment_terms), "sec-adp"]
  ];
  const anchor = calc.demand
    ? `${money(calc.demand.monthlyRunRate)}/mo × ${calc.demand.termDays}d / 30 = <b>${money(calc.demand.termExposure)}</b> term exposure; × 1.10 buffer = <b>${money(calc.demand.demandBasis)}</b> demand basis`
    : `<b>Blocked</b> — the deterministic calculator requires current financial statements`;
  return `<div class="kv" style="grid-template-columns:repeat(4,1fr)">${items.map(x => `<div class="kv-i jump" onclick="jump('${x[2]}')"><div class="kv-l">${x[0]}</div><div class="kv-v">${x[1]}</div></div>`).join("")}</div>
    <div class="implied">Limit-sizing anchor: ${anchor} <span>(deterministic calculator demand basis)</span></div>`;
}

function creditProfile(record) {
  const facts = record.result.facts, calc = record.result.calculation, meta = record.meta;
  const grid = [
    ["Segment", escapeHtml(meta.segment), "sec-hist"], ["Security", escapeHtml(meta.security), "sec-hist"],
    ["Statement status", facts.financial_statement_status, "sec-fs"],
    ["Financial grade", calc.financialGrade || "Not rated", "sec-risk"],
    ["Payment grade", calc.paymentGrade || "Not rated", "sec-risk"],
    ["Capacity cap", calc.capacityCap == null ? "—" : money(calc.capacityCap), "sec-rules"],
    ["Binding constraint", calc.bindingConstraint ? (calc.bindingConstraint === "DEMAND" ? "Order demand" : "Financial capacity") : "—", "sec-rules"],
    ["Acceptable range", calc.acceptableRange ? `${money(calc.acceptableRange[0])}–${money(calc.acceptableRange[1])}` : "—", "sec-rules"]
  ];
  const line = (label, value, jmp) => `<tr class="jump" onclick="jump('${jmp}')"><td class="l">${label}</td><td>${value}</td></tr>`;
  return `
    <div class="sig" style="grid-template-columns:repeat(2,1fr)">${grid.map(x => `<div class="s-item jump" onclick="jump('${x[2]}')"><div class="l">${x[0]}</div><div class="v">${x[1]}</div></div>`).join("")}</div>
    <table class="tbl" style="margin-top:12px"><tr><th class="l">Financial fact</th><th>Value</th></tr>
      ${line("Annual revenue", money(facts.annual_revenue), "sec-fs")}
      ${line("EBITDA", `${money(facts.ebitda)} (${pct(facts.ebitda_margin)})`, "sec-fs")}
      ${line("Net income", `${money(facts.net_income)} (${pct(facts.net_income_margin)})`, "sec-fs")}
      ${line("Operating cash flow", `${money(facts.operating_cash_flow)} (${pct(facts.operating_cash_flow_margin)})`, "sec-fs")}
      ${line("Current ratio", num2(facts.current_ratio), "sec-fs")}
      ${line("Debt / equity", num2(facts.debt_to_equity_ratio), "sec-fs")}
    </table>`;
}

function filesTbl(record) {
  const body = record.meta.files.map(f => `<tr><td class="fn">${escapeHtml(f[0])}</td><td>${escapeHtml(f[1])}</td><td>${escapeHtml(f[2])}</td><td>${escapeHtml(f[3])}</td><td class="del">🗑</td></tr>`).join("");
  return `<table class="atbl"><tr><th>File name</th><th>Category</th><th>Uploaded by</th><th>Date</th><th></th></tr>${body}</table>`;
}

function sessionEventTime(value) {
  if (!value) return "This session";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "This session";
  return new Intl.DateTimeFormat("en-US", { month: "2-digit", day: "2-digit", year: "numeric", hour: "numeric", minute: "2-digit" }).format(date);
}

function historySection(record) {
  const events = sessionEvents(record);
  const saved = savedDisposition(record);
  if (saved && events.at(-1)?.kind !== "DECISION_RECORDED") {
    events.push({ kind: "DECISION_RECORDED", status: saved.status, action: saved.action, reason: saved.reason, at: null });
  }
  const liveRows = events.reverse().map(event => {
    const action = actionLabels[event.action] || event.action;
    const note = event.kind === "REVIEW_REOPENED"
      ? `Review reopened — previous ${event.status === "ACCEPTED" ? "confirmation" : "adjusted result"}: ${action}.${event.reason ? ` Reason: ${event.reason}` : ""}`
      : `Decision recorded — ${event.status === "ACCEPTED" ? "confirmed proposed result" : "recorded adjusted result"}: ${action}.${event.reason ? ` Reason: ${event.reason}` : ""} Policy ${record.result.release.id}.`;
    return `<tr class="session-history"><td class="l">${escapeHtml(sessionEventTime(event.at))}</td><td>${money(record.result.facts.credit_limit)}</td><td>—</td><td style="text-align:center"><span class="hchg session">${event.kind === "REVIEW_REOPENED" ? "reopen" : "decision"}</span></td><td class="l">Customer Review</td><td class="l note">${escapeHtml(note)}</td></tr>`;
  }).join("");
  const priorRows = record.meta.history.map(x => `<tr><td class="l">${x[0]}</td><td>${x[1]}</td><td>${x[2]}</td><td style="text-align:center"><span class="hchg ${x[3] === "hold" ? "hold" : "up"}">${x[3]}</span></td><td class="l">${escapeHtml(x[4])}</td><td class="l note">${escapeHtml(x[5])}</td></tr>`).join("");
  return `<table class="hist-tbl"><tr><th class="l">Date</th><th>Old limit</th><th>New limit</th><th>Δ</th><th class="l">By</th><th class="l">Comments / rationale</th></tr>${liveRows}${priorRows}</table>`;
}

function riskSection(record) {
  const { risk, result } = record;
  if (!risk.factors.length) return `<div class="ai-concl soft"><b>Not rated:</b> financial statements are ${result.facts.financial_statement_status}, so the deterministic calculator produced no factor grades. Request updated statements to restore the risk profile.</div>`;
  const rows = risk.factors.map(([label, grade]) => {
    const points = gradePoints[grade];
    return `<div class="risk-line"><span class="rl-n">${label}</span><div class="score-bar"><i class="s${points}" style="width:${points / 4 * 100}%"></i></div><span class="rl-v">${grade}</span></div>`;
  }).join("");
  const facts = result.facts;
  const signals = [
    ["Past due ratio", pct(facts.past_due_ratio)], ["Utilization", pct(facts.credit_utilization)],
    ["ADP-W vs weighted terms", `${facts.adp_w_90d}d / ${facts.weighted_terms_days}d`], ["Sales trend", num2(facts.net_sales_trend_ratio)],
    ["Financial grade", result.calculation.financialGrade], ["Payment grade", result.calculation.paymentGrade]
  ];
  return `<div class="grid2">
    <div>${rows}<div class="risk-total"><span class="rt-l">Blended risk band</span><span class="rt-band" style="color:${bandColor(risk.band)}">${risk.band} · ${risk.num}/4</span></div></div>
    <div><div class="sig">${signals.map(s => `<div class="s-item"><div class="l">${s[0]}</div><div class="v">${s[1]}</div></div>`).join("")}</div>
    <div style="font-size:11px;color:var(--faint);margin-top:10px">Factor grades come from the deterministic calculator (strong → weak). The blended band is a v2 display weighting: 60% financial factors, 40% payment behavior.</div></div>
  </div>`;
}

function extSection(record) {
  const e = record.meta.ext;
  const nacmAging = e.nacm.aging.map(x => `<div class="s-item"><div class="l">${x[0]}</div><div class="v">${x[1]}</div></div>`).join("");
  const tradeRows = e.nacm.trades.map(t => `<tr><td class="l">${t[0]}</td><td>${t[1]}</td><td>${t[2]}</td><td class="l">${t[3]}</td><td class="l">${t[4]}</td></tr>`).join("");
  const dbRow = (m, v, a) => `<tr><td class="l"><b>${m}</b></td><td>${v}</td><td class="l">${a}</td></tr>`;
  return `
  <div class="ext-flag ${e.flag[0]}">Overall external assessment: <b>${e.flag[1]}</b> — ${e.summary}</div>
  <div class="ext-grid2">
    <div class="ext-card">
      <div class="ext-h">NACM <span class="ext-badge ${e.nacm.scoreA.includes("✓") ? "ok" : "warn"}">${e.nacm.scoreA.replace("⚠️ ", "").replace("✓ ", "")}</span></div>
      <table class="ext-tbl"><tr><th class="l">Metric</th><th>Value</th><th class="l">Assessment</th></tr>
        ${dbRow("NACM Risk Score", e.nacm.score, e.nacm.scoreA)}
        ${dbRow("NACM DBT", e.nacm.dbt, e.nacm.dbtA)}
      </table>
      <div class="ext-sub">Trade-group aging · ${e.nacm.lines} tradelines</div>
      <div class="sig" style="grid-template-columns:repeat(5,1fr)">${nacmAging}</div>
      <div class="ext-sub" style="margin-top:12px">Tradeline detail</div>
      <table class="ext-tbl"><tr><th class="l">Reporting member</th><th>High credit</th><th>Balance</th><th class="l">Terms</th><th class="l">Manner</th></tr>${tradeRows}</table>
      <div class="ext-note">${e.nacm.note}</div>
    </div>
    <div class="ext-card">
      <div class="ext-h">D&amp;B <span class="ext-badge ${e.db.paydex[1].includes("✓") ? "ok" : "warn"}">PAYDEX ${e.db.paydex[0]}</span></div>
      <table class="ext-tbl"><tr><th class="l">Metric</th><th>Value</th><th class="l">Assessment</th></tr>
        ${dbRow("Rating", e.db.rating[0], e.db.rating[1])}
        ${dbRow("PAYDEX", e.db.paydex[0], e.db.paydex[1])}
        ${dbRow("Delinquency Score", e.db.delinq[0], e.db.delinq[1])}
        ${dbRow("Failure Score", e.db.failure[0], e.db.failure[1])}
      </table>
      <div class="ext-kvlist">
        <div><span>Tradelines</span><b>${e.db.tradelines}</b></div>
        <div><span>D&amp;B max credit recommendation</span><b>${e.db.maxCredit}</b></div>
        <div><span>Derogatory remarks</span><b>${e.db.derog}</b></div>
        <div><span>Establishment</span><b>${e.db.estab}</b></div>
      </div>
      <div class="ext-note">${e.db.trend}</div>
    </div>
  </div>`;
}

function rulesDetail(record) {
  const outcomeChip = { PASS: ["ok", "PASS"], FINDING: ["fail", "FINDING"], NOT_APPLICABLE: ["view", "N/A"], INDETERMINATE: ["view", "INDET."] };
  const rows = record.result.traces.map(trace => {
    const [cls, label] = outcomeChip[trace.outcome];
    const detail = trace.observations.map(o => `${o.role === "APPLICABILITY" ? "applies when " : ""}${o.factLabel} ${fmtPart(o.actual)} ${o.comparison.operator} ${fmtPart(o.comparison)} → ${o.result.replace("_", " ")}`).join("; ");
    return `<tr><td class="l"><b>${escapeHtml(trace.policy.title)}</b><br><code style="font-size:10px">${escapeHtml(trace.evaluationRef)}</code></td><td class="l">${escapeHtml(trace.policy.statement)}</td>
      <td><span class="rule ${cls}">${label}</span></td><td class="l">${escapeHtml(detail)}${trace.finding ? `<br><code style="font-size:10px">${escapeHtml(trace.finding.reasonCode)}</code>` : ""}</td></tr>`;
  }).join("");
  return `<table class="rule-tbl"><tr><th class="l">Rule</th><th class="l">Policy statement</th><th>Result</th><th class="l">Evaluation detail</th></tr>${rows}</table>`;
}

function adpDetail(record) {
  const facts = record.result.facts, calc = record.result.calculation;
  const items = [
    ["ADP-W · 90 days", `${facts.adp_w_90d}d`], ["Weighted terms", `${facts.weighted_terms_days}d`],
    ["ADP-W vs weighted terms", `${facts.adp_w_90d - facts.weighted_terms_days >= 0 ? "+" : ""}${num2(facts.adp_w_90d - facts.weighted_terms_days)}d`],
    ["Invoices ≥39 days old", money(facts.open_invoices_over_39_days)],
    ["Past due ratio", pct(facts.past_due_ratio)], ["Past due amount", money(facts.past_due_amount)],
    ["NSF events · 90 days", facts.nsf_count_90d], ["Chargebacks · 90 days", facts.chargeback_count_90d],
    ["Payment grade", calc.paymentGrade || "Not rated"]
  ];
  return `<div class="sig" style="grid-template-columns:repeat(4,1fr)">${items.map(x => `<div class="s-item"><div class="l">${x[0]}</div><div class="v">${x[1]}</div></div>`).join("")}</div>`;
}

/* Allocate the engine's single past-due total across aging buckets (50/30/20). */
function agingBuckets(facts) {
  const pastDue = facts.past_due_amount ?? 0;
  const b30 = Math.round(pastDue * 0.5), b60 = Math.round(pastDue * 0.3);
  return { current: (facts.ar_balance ?? 0) - pastDue, b30, b60, b90: pastDue - b30 - b60 };
}

function agingRegion(record) {
  const facts = record.result.facts, b = agingBuckets(facts);
  const head = ["Region", "Company", "Cust#", "AR Balance", "Current", "1–30", "31–60", "61–90", "90+"];
  const cell = value => `<td class="${value > 0 ? "warn" : ""}">${money(value)}</td>`;
  return `<table class="gtbl" style="min-width:760px"><tr>${head.map((h, i) => `<th class="${i < 3 ? "l" : ""}">${h}</th>`).join("")}</tr>
    <tr><td class="l"><span class="rgn">US</span></td><td class="l">100</td><td class="l">${record.id}</td><td>${money(facts.ar_balance)}</td><td>${money(b.current)}</td>${cell(b.b30)}${cell(b.b60)}${cell(b.b90)}<td>$0</td></tr></table>`;
}

function relTblRegion(record) {
  const facts = record.result.facts;
  const head = ["Region", "Company", "Cust#", "Cust Name", "Relationship", "Share", "Restriction", "Own Limit", "Total exposure", "Max balance · 90d"];
  return `<table class="gtbl" style="min-width:760px"><tr>${head.map((h, i) => `<th class="${i < 5 ? "l" : ""}">${h}</th>`).join("")}</tr>
    <tr class="master-row"><td class="l"><span class="rgn">US</span></td><td class="l">100</td><td class="l">${record.id}</td><td class="l">${escapeHtml(record.customer.name)}</td><td class="l">${facts.relationship_type === "FINANCIAL_MASTER" ? "Financial master" : "Single"}</td><td class="l">${facts.relationship_type === "FINANCIAL_MASTER" ? "Group" : "—"}</td><td class="l">${facts.sharing_group_restricted === "Y" ? '<span class="flag">Y</span>' : "N"}</td><td>${money(facts.credit_limit)}</td><td>${money(facts.total_exposure)}</td><td class="${facts.max_balance_percent_of_limit >= 1.5 ? "warn" : ""}">${money(facts.max_balance_90d)} · ${pct(facts.max_balance_percent_of_limit)}</td></tr></table>
    <div style="font-size:11px;color:var(--faint);margin-top:9px">Relationship snapshot used by deterministic R3 and R4 controls.</div>`;
}

function fsSection(record) {
  const facts = record.result.facts;
  const statementFile = record.meta.files.find(file => file[1] === "Financial Stmt");
  const fiscalYear = statementFile?.[0].match(/FY\d{4}/)?.[0].replace("FY", "FY ");
  const meta = [["Statement status", facts.financial_statement_status], ["Fiscal year", fiscalYear || "Not available"], ["Reporting currency", "USD"], ["Source", "Customer provided"], ["Fact source", "Shared deterministic engine"]];
  const rows = [
    ["Annual revenue", money(facts.annual_revenue)],
    ["EBITDA", `${money(facts.ebitda)} · margin ${pct(facts.ebitda_margin)}`],
    ["Net income", `${money(facts.net_income)} · margin ${pct(facts.net_income_margin)}`],
    ["Operating cash flow", `${money(facts.operating_cash_flow)} · margin ${pct(facts.operating_cash_flow_margin)}`],
    ["Current ratio", num2(facts.current_ratio)],
    ["Debt / equity ratio", num2(facts.debt_to_equity_ratio)]
  ];
  return `
    <div class="fs-tabs"><button aria-current="true">Financial summary</button></div>
    <div class="fs-bar"><div class="fs-sel"><span>Values from the shared engine fact snapshot</span></div><div class="spacer"></div><span class="ro-tag">view only</span></div>
    <div class="fs-meta">${meta.map(x => `<div class="fm"><span>${x[0]}</span><b>${x[1]}</b></div>`).join("")}</div>
    <table class="fs-tbl">${rows.map(x => `<tr><td class="l">${x[0]}</td><td>${x[1]}</td></tr>`).join("")}</table>`;
}

/* ---------- decision zone ---------- */
let adjustOpenFor = null;

function decisionZone(record) {
  const auto = isAuto(record);
  const saved = savedDisposition(record);
  const prop = proposal(record);
  const primary = record.result.action.primary;
  if (saved) {
    return `<div class="actzone">
      <div class="az-h">✔ Decision recorded — ${saved.status === "ACCEPTED" ? "AI proposal confirmed" : "adjusted result recorded"}</div>
      <p style="font-size:13px;margin:8px 0"><b>${escapeHtml(actionLabels[saved.action] || saved.action)}</b>${saved.reason ? ` — ${escapeHtml(saved.reason)}` : ""}</p>
      <p style="font-size:11px;color:var(--faint);margin:0 0 10px">Recorded against policy ${escapeHtml(saved.releaseId)} · deterministic proposal was ${escapeHtml(actionLabels[saved.deterministicAction])}.</p>
      <div class="dactions"><button class="btn ghost" data-act="reopen">Reopen review</button></div>
    </div>`;
  }
  const shortcuts = [
    ["REQUEST_UPDATED_FINANCIAL_STATEMENTS", "Request Financial Statements", "ghost"],
    ["NEED_CREDIT_MANAGER_REVIEW", "Forward to credit manager", "ghost"],
    ["NEED_TO_RESTRICT", "Restrict customer", "danger"]
  ].filter(([action]) => action !== primary);
  const adjustOptions = dispositionActions.filter(action => action !== primary);
  return `<div class="actzone">
    <div class="az-h">✨ ${auto ? "Auto-cleared result — view only" : "Proposed limit, terms, and date — view only"}</div>
    <div class="dfields">
      <div class="field"><label>Proposed credit limit</label><input id="proposedCreditLimit" value="${prop.rec[0][1]}" disabled/><div class="hint ai-fill">deterministic calculator · not recorded as an edit</div></div>
      <div class="field"><label>Proposed terms</label><input id="proposedTerms" value="${termsLabel(record.result.facts.payment_terms)}" disabled/></div>
      <div class="field"><label>Proposed next review</label><input id="proposedNextReview" value="${prop.rec[2][1]}" disabled/><div class="hint ai-fill">display context only · not recorded as an edit</div></div>
      <div class="field wide"><label>${auto ? "System commentary" : "Override reason (recorded only when replacing the proposed result)"}</label><textarea id="commentary" ${auto ? "disabled" : 'maxlength="500" placeholder="Required for an adjusted result (10–500 characters)"'}>${auto ? "Auto-cleared by deterministic rules — no commentary required." : ""}</textarea></div>
      ${adjustOpenFor === record.id ? `<div class="field wide"><label>Replacement review result</label><select id="adjAction">${adjustOptions.map(action => `<option value="${action}">${escapeHtml(actionLabels[action])}</option>`).join("")}</select><div class="hint">Allowed action vocabulary · deterministic proposal stays on record</div></div>` : ""}
    </div>
    <div class="scope-note">🎯 <b>Decision scope:</b> ${escapeHtml(record.meta.scope)}</div>
    <div class="dactions">
      ${auto ? `<button class="btn ghost" disabled>View only (auto-cleared)</button>` :
      adjustOpenFor === record.id
        ? `<button class="btn primary" data-act="adjust-confirm">Confirm adjusted result</button>
           <button class="btn ghost" data-act="adjust-cancel">Cancel</button>`
        : `<button class="btn primary" data-act="confirm">Confirm review result</button>
           <button class="btn adjust" data-act="adjust-open">Adjust &amp; confirm</button>
           ${shortcuts.map(([action, label, cls]) => `<button class="btn ${cls}" data-act="override" data-action="${action}">${label}</button>`).join("\n")}`}
    </div>
    <div id="decisionMsg" style="display:none;margin-top:9px;font-size:12px;font-weight:600;color:var(--high)"></div>
  </div>`;
}

/* ---------- detail page ---------- */
function detailHtml(record) {
  const { result, meta, risk } = record;
  const facts = result.facts, calc = result.calculation;
  const auto = isAuto(record);
  const prop = proposal(record);
  const trigger = result.findings.length ? result.findings.map(trace => trace.policy.title).join(" · ") : "Cycle review — no deterministic intervention required";
  const recTone = prop.tone === "pass" ? "pass" : prop.tone === "soft" ? "soft" : "high";
  return `
  <div class="dbanner slim">
    <div class="dtop">
      <h2><span class="num">${record.id}</span> — ${escapeHtml(record.customer.name)}</h2>
      <span class="status-tag">${statusOf(record)}</span>
      <span class="rel-tag" style="margin-left:4px">${facts.relationship_type === "FINANCIAL_MASTER" ? "Financial master" : "Single account"}</span>
      <div class="spacer"></div>
    </div>
    <div class="dmeta5">
      <div class="m"><div class="l">Review trigger</div><div class="v" style="font-size:13.5px">${escapeHtml(trigger)}</div>${meta.ask ? `<div class="s ask">💬 ${escapeHtml(meta.ask)}</div>` : ""}</div>
      <div class="m"><div class="l">Recommended limit</div><div class="v">${calc.recommended == null ? "Blocked" : money(calc.recommended)}</div><div class="s">Current ${money(facts.credit_limit)}${calc.recommended == null ? " · statements required" : ""}</div></div>
      <div class="m"><div class="l">Terms</div><div class="v">${termsLabel(facts.payment_terms)}</div><div class="s">no change proposed</div></div>
      <div class="m"><div class="l">AI proposal</div><div class="v rec-${recTone}">${escapeHtml(actionLabels[result.action.primary])}</div><div class="s">Risk ${risk.band}${risk.num ? ` · ${risk.num}/4` : ""}</div></div>
      <div class="m"><div class="l">Current reviewer</div><div class="v" style="font-size:14px">${auto ? "— (auto)" : "You"}</div><div class="s">Next review ${meta.nrd}</div></div>
    </div>
  </div>

  <div class="subnav" id="subnav">
    <button onclick="jump('sec-ai')">🧠 AI Proposal</button>
    <button onclick="jump('sec-hist')">🕘 History</button>
    <button onclick="jump('sec-risk')">⚖️ Risk</button>
    <button onclick="jump('sec-ext')">🌐 External</button>
    <button onclick="jump('sec-rules')">📋 Rules</button>
    <button onclick="jump('sec-adp')">🧮 Payment</button>
    <button onclick="jump('sec-rel')">🔗 Relationship</button>
    <button onclick="jump('sec-aging')">📊 AR Aging</button>
    <button onclick="jump('sec-fs')">📄 Financials</button>
    <button onclick="jump('sec-files')">📎 Files</button>
  </div>

  <div class="upper">
    <div class="ucol">
      <div class="section"><div class="s-h">👤 Customer Review Snapshot</div><div class="s-b">${coreSnapshot(record)}</div></div>
      <div class="section"><div class="s-h">💰 Exposure &amp; Purchases</div><div class="s-b">${exposureBlock(record)}</div></div>
      <div class="section"><div class="s-h">📈 Credit &amp; Financial Profile</div><div class="s-b">${creditProfile(record)}</div></div>
      <div class="panel" id="sec-files"><div class="p-h">📎 <span class="t">Attachments</span><div class="spacer"></div><button class="upl">⤒ Upload file</button></div>
        <div class="p-b">${filesTbl(record)}<div class="dropzone">Drag &amp; drop FS / supporting files, or <b>browse</b>. Saved as <span class="mono">Cust#+Type+FY+Period</span>.</div></div></div>
    </div>

    <div class="ucol">
      <div class="panel ai-panel" id="sec-ai">
        <div class="p-h">🧠 <span class="t">AI Proposed Review Result</span></div>
        <div class="p-b">
          <div class="ai-concl ${prop.tone === "pass" ? "pass" : prop.tone === "soft" ? "soft" : ""}"><b>Proposal:</b> ${escapeHtml(prop.text)}</div>
          <div class="drivers">${prop.drivers.map(d => `<span class="drv ${d[0]}">${d[0] === "pos" ? "▲" : d[0] === "neg" ? "▼" : "●"} ${escapeHtml(d[1])}</span>`).join("")}</div>
          <div class="ai-secs">
            ${prop.secs.map(s => `<div class="ai-sec"><div class="ai-sec-h"><span class="ai-dot ${s[1]}"></span>${s[0]}</div><div class="ai-sec-b">${escapeHtml(s[2])}</div></div>`).join("")}
          </div>
          <div class="ai-body"><p>${escapeHtml(meta.persona)}</p></div>
          <div class="ai-rec">${prop.rec.map(rc => `<div class="rc"><div class="l">${rc[0]}</div><div class="v">${rc[2] === "up" ? `<span class="up">${rc[1]} ▲</span>` : rc[2] === "down" ? `<span style="color:var(--high)">${rc[1]} ▼</span>` : rc[2] === "hold" ? `${rc[1]} <span class="hold">hold</span>` : rc[1]}</div></div>`).join("")}</div>
          ${decisionZone(record)}
        </div>
      </div>
    </div>
  </div>

  <div class="section" id="sec-hist"><div class="s-h">🕘 Review History &amp; Notes</div><div class="s-b">${historySection(record)}</div></div>

  <div class="section" id="sec-risk">
    <div class="s-h">⚖️ Risk Profile <span class="tag" style="color:${bandColor(risk.band)}">${risk.num ?? "—"}</span></div>
    <div class="s-b">${riskSection(record)}</div>
  </div>

  <div class="section" id="sec-ext"><div class="s-h">🌐 External Data — NACM · D&amp;B</div><div class="s-b">${extSection(record)}</div></div>

  <div class="section" id="sec-rules"><div class="s-h">📋 Review Rules — deterministic evaluation · ${escapeHtml(result.release.id)}</div><div class="s-b">${rulesDetail(record)}</div></div>

  <div class="section" id="sec-adp"><div class="s-h">🧮 Payment Behavior Detail</div><div class="s-b">${adpDetail(record)}</div></div>

  <div class="section" id="sec-rel">
    <div class="s-h">🔗 Financial Relationship Roll-up
      <div class="s-ctrl"><div class="seg-toggle sm"><button aria-current="true">Current region</button><button disabled>All regions</button></div></div>
    </div>
    <div class="s-b"><div class="gv-scroll">${relTblRegion(record)}</div></div>
  </div>

  <div class="section" id="sec-aging">
    <div class="s-h">📊 AR Aging
      <div class="s-ctrl"><div class="seg-toggle sm"><button aria-current="true">Current region</button><button disabled>All regions</button></div></div>
    </div>
    <div class="s-b"><div class="gv-scroll">${agingRegion(record)}</div></div>
  </div>

  <div class="section" id="sec-fs"><div class="s-h">📄 Financial Statement <span style="margin-left:auto;font-size:11px;font-weight:600;color:var(--faint)">view only</span></div><div class="s-b">${fsSection(record)}</div></div>

  <dialog class="fact-dialog" id="factDialog" aria-labelledby="factDialogTitle">
    <button class="dialog-close" aria-label="Close fact definition" onclick="this.closest('dialog').close()">×</button>
    <div class="env">CUSTOMER REVIEW ONTOLOGY</div>
    <h3 id="factDialogTitle"></h3>
    <div id="factDialogBody"></div>
  </dialog>

  <div style="margin-top:6px"><a onclick="showQueue()">← Back to worklist</a></div>
  `;
}

let openId = null;
function openDetail(id) {
  openId = String(id);
  adjustOpenFor = null;
  renderDetail();
  document.getElementById("policyWorkbench").classList.remove("show");
  document.getElementById("queue").classList.add("hide");
  document.getElementById("detail").classList.add("show");
  document.getElementById("crumb").style.display = "flex";
  document.getElementById("crumbCurrent").textContent = "Review Detail";
  document.getElementById("configureRulesButton").setAttribute("aria-pressed", "false");
  document.querySelector(".topbar .search").classList.remove("hidden");
  window.scrollTo(0, 0);
}
function renderDetail() {
  const record = recordById(openId);
  if (record) document.getElementById("detailBody").innerHTML = detailHtml(record);
}
function showQueue() {
  openId = null;
  document.getElementById("policyWorkbench").classList.remove("show");
  document.getElementById("detail").classList.remove("show");
  document.getElementById("queue").classList.remove("hide");
  document.getElementById("crumb").style.display = "none";
  document.getElementById("configureRulesButton").setAttribute("aria-pressed", "false");
  document.querySelector(".topbar .search").classList.remove("hidden");
  renderQueue();
  window.scrollTo(0, 0);
}

function showPolicyWorkbench() {
  openId = null;
  document.getElementById("queue").classList.add("hide");
  document.getElementById("detail").classList.remove("show");
  document.getElementById("policyWorkbench").classList.add("show");
  document.getElementById("crumb").style.display = "flex";
  document.getElementById("crumbCurrent").textContent = "Policy Change";
  document.getElementById("configureRulesButton").setAttribute("aria-pressed", "true");
  document.querySelector(".topbar .search").classList.add("hidden");
  window.scrollTo(0, 0);
}

/* ---------- decision handling ---------- */
function showDecisionMessage(message) {
  const el = document.getElementById("decisionMsg");
  if (!el) return;
  el.style.display = "block";
  el.textContent = message;
}
function saveDecision(record, input) {
  try {
    const saved = store.save({ ...dispositionContext(record), ...input });
    appendSessionEvent(record, { kind: "DECISION_RECORDED", status: saved.status, action: saved.action, reason: saved.reason });
    adjustOpenFor = null;
    renderDetail();
    renderQueue();
  } catch (error) {
    showDecisionMessage(error instanceof Error ? error.message : String(error));
  }
}
document.addEventListener("click", event => {
  const actEl = event.target.closest("[data-act]");
  if (actEl) {
    const record = recordById(openId);
    if (!record) return;
    const act = actEl.dataset.act;
    if (act === "confirm") saveDecision(record, { status: "ACCEPTED" });
    if (act === "adjust-open") {
      const reason = document.getElementById("commentary")?.value || "";
      adjustOpenFor = record.id;
      renderDetail();
      document.getElementById("commentary").value = reason;
    }
    if (act === "adjust-cancel") { adjustOpenFor = null; renderDetail(); }
    if (act === "adjust-confirm") {
      const action = document.getElementById("adjAction")?.value;
      const reason = document.getElementById("commentary")?.value?.trim() || "";
      saveDecision(record, { status: "OVERRIDDEN", action, reason });
    }
    if (act === "override") {
      const reason = document.getElementById("commentary")?.value?.trim() || "";
      saveDecision(record, { status: "OVERRIDDEN", action: actEl.dataset.action, reason });
    }
    if (act === "reopen") {
      const saved = savedDisposition(record);
      if (saved) appendSessionEvent(record, { kind: "REVIEW_REOPENED", status: saved.status, action: saved.action, reason: saved.reason });
      removeDisposition(dispositionContext(record));
      renderDetail();
      renderQueue();
    }
    return;
  }
  const tab = event.target.closest("[data-tab]");
  if (tab) { activeTab = tab.dataset.tab; renderQueue(); }
});

/* ---------- view toggle: Current Region vs Global ---------- */
function setView(view) {
  const region = view === "region";
  document.getElementById("vw-region").setAttribute("aria-current", region);
  document.getElementById("vw-global").setAttribute("aria-current", !region);
  document.getElementById("queueWrap").style.display = region ? "" : "none";
  document.getElementById("filterbar").style.display = region ? "" : "none";
  document.getElementById("globalWrap").style.display = region ? "none" : "";
  document.getElementById("viewNote").innerHTML = region
    ? "Worklist &amp; review for the current region."
    : "🔗 Portfolio relationship and aging overview. Review actions are managed from the regional worklist.";
  if (!region) renderGlobal();
  window.scrollTo(0, 0);
}

/* ---------- GLOBAL VIEW (reference only, derived from engine facts) ---------- */
function renderGlobal() {
  const relHead = ["Region", "Company", "Cust#", "Cust Name", "Relationship", "Restr.", "Terms", "Ccy", "Credit Limit", "Total exposure", "Past Due", "ADP-W", "Auto reviews", "Since"];
  const sum = selector => records.reduce((total, record) => total + (selector(record.result.facts) ?? 0), 0);
  const relBody = records.map(record => {
    const facts = record.result.facts;
    return `<tr><td class="l"><span class="rgn">US</span></td><td class="l">100</td><td class="l">${record.id}</td><td class="l">${escapeHtml(record.customer.name)}</td>
      <td class="l">${facts.relationship_type === "FINANCIAL_MASTER" ? "Financial master" : "Single"}</td><td class="l">${facts.sharing_group_restricted === "Y" ? '<span class="flag">Y</span>' : "—"}</td>
      <td class="l">${termsLabel(facts.payment_terms)}</td><td class="l">USD</td>
      <td>${money(facts.credit_limit)}</td><td>${money(facts.total_exposure)}</td><td class="${facts.past_due_amount > 0 ? "warn" : ""}">${money(facts.past_due_amount)}</td><td class="${facts.adp_w_90d > 38 ? "warn" : ""}">${facts.adp_w_90d}d</td><td>${facts.auto_review_count}/${facts.auto_review_limit}</td><td>${record.meta.since}</td></tr>`;
  }).join("");
  const relTot = `<tr class="tot"><td class="l">TOTAL (USD)</td><td class="l" colspan="7"></td>
    <td>${money(sum(f => f.credit_limit))}</td><td>${money(sum(f => f.total_exposure))}</td><td class="warn">${money(sum(f => f.past_due_amount))}</td><td></td><td></td><td></td></tr>`;
  const relTbl = `<table class="gtbl"><tr>${relHead.map((h, i) => `<th class="${i < 9 ? "l" : ""}">${h}</th>`).join("")}</tr>${relBody}${relTot}</table>`;

  const ageHead = ["Region", "Company", "Cust#", "AR Balance", "Current", "1–30", "31–60", "61–90", "90+"];
  const ageBody = records.map(record => {
    const facts = record.result.facts, b = agingBuckets(facts);
    const cell = value => `<td class="${value > 0 ? "warn" : ""}">${money(value)}</td>`;
    return `<tr><td class="l"><span class="rgn">US</span></td><td class="l">100</td><td class="l">${record.id}</td><td>${money(facts.ar_balance)}</td><td>${money(b.current)}</td>${cell(b.b30)}${cell(b.b60)}${cell(b.b90)}<td>$0</td></tr>`;
  }).join("");
  const buckets = records.map(record => agingBuckets(record.result.facts));
  const bucketSum = key => buckets.reduce((total, bucket) => total + bucket[key], 0);
  const ageTot = `<tr class="tot"><td class="l">TOTAL (USD)</td><td class="l"></td><td class="l"></td>
    <td>${money(sum(f => f.ar_balance))}</td><td>${money(bucketSum("current"))}</td><td class="warn">${money(bucketSum("b30"))}</td><td class="warn">${money(bucketSum("b60"))}</td><td class="warn">${money(bucketSum("b90"))}</td><td>$0</td></tr>`;
  const ageTbl = `<table class="gtbl" style="min-width:860px"><tr>${ageHead.map((h, i) => `<th class="${i < 3 ? "l" : ""}">${h}</th>`).join("")}</tr>${ageBody}${ageTot}</table>`;

  document.getElementById("globalBody").innerHTML = `
    <div class="gv-card"><div class="gc-h">🌐 Relationship detail — all accounts <span class="note">deterministic R1–R6 facts · current region</span></div>
      <div class="gv-scroll">${relTbl}</div></div>
    <div class="gv-card"><div class="gc-h">📊 AR Aging — all accounts</div>
      <div class="gv-scroll">${ageTbl}</div></div>`;
}

/* ---------- filters & search ---------- */
document.getElementById("topSearch").addEventListener("input", event => {
  filterState = { ...filterState, query: event.target.value };
  renderQueue();
});
document.querySelector("#filterbar .fapply").addEventListener("click", () => {
  filterState = { query: document.getElementById("fCust").value, status: document.getElementById("fStatus").value };
  document.getElementById("topSearch").value = filterState.query;
  renderQueue();
});
document.querySelector("#filterbar .fclear").addEventListener("click", () => {
  filterState = { query: "", status: "All" };
  document.getElementById("fCust").value = "";
  document.getElementById("fStatus").value = "All";
  document.getElementById("topSearch").value = "";
  renderQueue();
});

Object.assign(window, { openDetail, showQueue, setView, jump, showFact });
createPolicyWorkbench({
  onOpen: showPolicyWorkbench,
  onClose: showQueue,
  onImpactAssessed: impact => {
    assessedCandidateImpact = impact;
    renderQueue();
  }
});
renderQueue();
