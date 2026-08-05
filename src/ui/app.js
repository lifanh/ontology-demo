import { createEvaluator, assessReviewImpact } from "../core/runtime.js";
import { parseRule, formatRule } from "../core/authoring.js";
import { Governance } from "../core/governance.js";
import { properties, derived, registry, creditPack, activeRules, compileCandidate, analyzeCandidate, scenarios, narrativeCustomers, policyImpactCohort, eligibleEvidenceTools, demoCustomer, release } from "../domains/credit/pack.js";
import { createDispositionStore, dispositionActions } from "../domains/credit/dispositions.js";

const $ = selector => document.querySelector(selector);
const escapeHtml = value => String(value ?? "—").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
const money = value => value == null ? "—" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
const number = value => new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);
const evaluate = createEvaluator(creditPack);
const actionOptions = dispositionActions;
const dispositionStore = createDispositionStore(sessionStorage);
const STUDIO_STORAGE_KEY = "customer-review:policy-studio:v1";
const PRODUCT_STORAGE_KEY = "customer-review:product:v1";
const POLICY_STATE_LABELS = { DRAFT: "Draft", VALIDATED: "Validated", ANALYZED: "Compatibility checked", BATCH_PASSED: "Impact assessed" };
const REVIEW_STATUS_LABELS = { UNASSIGNED: "Unassigned", IN_REVIEW: "In review", WAITING_INFORMATION: "Waiting for information", ESCALATED: "Escalated", COMPLETED: "Completed" };
const REVIEW_ASSIGNEES = { JORDAN_LEE: "Jordan Lee (you)", MAYA_CHEN: "Maya Chen", ANDRE_SILVA: "Andre Silva" };
const REVIEW_CASE_DEFAULTS = Object.freeze({
  2001: Object.freeze({ status: "UNASSIGNED", assignee: null, priority: "LOW", dueLabel: "Due in 3 days", dueRank: 3 }),
  2002: Object.freeze({ status: "IN_REVIEW", assignee: "JORDAN_LEE", priority: "HIGH", dueLabel: "Due today", dueRank: 0 }),
  2003: Object.freeze({ status: "WAITING_INFORMATION", assignee: "MAYA_CHEN", priority: "HIGH", dueLabel: "Due tomorrow", dueRank: 1 }),
  2004: Object.freeze({ status: "ESCALATED", assignee: "ANDRE_SILVA", priority: "CRITICAL", dueLabel: "Overdue 1 day", dueRank: -1 })
});
const PRIORITY_RANK = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };
const createReviewCases = () => Object.fromEntries(Object.entries(REVIEW_CASE_DEFAULTS).map(([customerNumber, value]) => [customerNumber, { ...value, draft: null, events: [] }]));
let reviewContext, reviewRequestVersion = 0;
let selected = "ratio5", selectedCustomerNumber = 2002, activeView = "review", activeCaseTab = "overview", governance, activeRuleSet, batch, draftRequestVersion = 0, policyExplanation, policyRequestVersion = 0, reviewExplanations = {}, policyExplanations = {}, stalePolicyExplanations = [], reviewCases = createReviewCases(), reviewQueueState = { query: "", view: "ALL", sort: "PRIORITY" };

const labels = { AUTO_REVIEW_PASS: "Auto review pass", NEED_CREDIT_MANAGER_REVIEW: "Credit manager review", REQUEST_UPDATED_FINANCIAL_STATEMENTS: "Request updated financial statements", NEED_TO_RESTRICT: "Restrict customer", NEED_MANUAL_REVIEW: "Manual review", RECOMMEND_CREDIT_LIMIT_REASSESSMENT: "Reassess credit limit" };
const operator = { "==": "is", "!=": "is not", ">": "is greater than", ">=": "is at least", "<": "is less than", "<=": "is at most" };
const policyNames = { NET30_PAST_DUE_MAX: "NET 30 past-due limit", HIGH_BALANCE_ADP_MAX: "High-balance payment limit" };

function reviewWorkflow(customerNumber) {
  return reviewCases[customerNumber] || reviewCases[String(customerNumber)];
}

function restoreReviewCases(value) {
  const restored = createReviewCases();
  if (!value || typeof value !== "object" || Array.isArray(value)) return restored;
  for (const customer of narrativeCustomers) {
    const candidate = value[customer.customer_number];
    const current = restored[customer.customer_number];
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) continue;
    if (Object.hasOwn(REVIEW_STATUS_LABELS, candidate.status)) current.status = candidate.status;
    if (candidate.assignee === null || Object.hasOwn(REVIEW_ASSIGNEES, candidate.assignee)) current.assignee = candidate.assignee;
    if (candidate.draft && typeof candidate.draft === "object" && ["ACCEPTED", "OVERRIDDEN", null].includes(candidate.draft.status)) {
      current.draft = {
        status: candidate.draft.status,
        action: dispositionActions.includes(candidate.draft.action) ? candidate.draft.action : null,
        reason: typeof candidate.draft.reason === "string" ? candidate.draft.reason.slice(0, 500) : ""
      };
    }
    if (Array.isArray(candidate.events)) current.events = candidate.events.slice(-20).flatMap(event => event && typeof event.label === "string" ? [{ label: event.label.slice(0, 120), detail: typeof event.detail === "string" ? event.detail.slice(0, 500) : "", at: typeof event.at === "string" ? event.at : "" }] : []);
  }
  return restored;
}

function queueRecords() {
  const query = reviewQueueState.query.trim().toLowerCase();
  const matchesView = workflow => reviewQueueState.view === "ALL"
    || (reviewQueueState.view === "MINE" && workflow.assignee === "JORDAN_LEE" && workflow.status !== "COMPLETED")
    || (reviewQueueState.view === "UNASSIGNED" && workflow.status === "UNASSIGNED")
    || (reviewQueueState.view === "DUE_SOON" && workflow.dueRank <= 1 && workflow.status !== "COMPLETED")
    || (reviewQueueState.view === "ESCALATED" && workflow.status === "ESCALATED")
    || (reviewQueueState.view === "COMPLETED" && workflow.status === "COMPLETED");
  const records = narrativeCustomers.map(customer => ({ customer, workflow: reviewWorkflow(customer.customer_number), result: governance ? evaluate(customer, activeRuleSet, governance.activeRelease) : evaluate(customer) }))
    .filter(({ customer, workflow }) => matchesView(workflow) && (!query || customer.name.toLowerCase().includes(query) || String(customer.customer_number).includes(query)));
  records.sort((left, right) => reviewQueueState.sort === "CUSTOMER"
    ? left.customer.name.localeCompare(right.customer.name)
    : reviewQueueState.sort === "DUE"
      ? left.workflow.dueRank - right.workflow.dueRank
      : PRIORITY_RANK[right.workflow.priority] - PRIORITY_RANK[left.workflow.priority] || left.workflow.dueRank - right.workflow.dueRank);
  return records;
}

function renderReviewQueue(selectedCustomer) {
  const allRecords = narrativeCustomers.map(customer => {
    const result = governance ? evaluate(customer, activeRuleSet, governance.activeRelease) : evaluate(customer);
    return { customer, result, workflow: reviewWorkflow(customer.customer_number) };
  });
  const records = queueRecords();
  $("#customerSwitcher").innerHTML = records.map(({ customer, result, workflow }) => {
    const selected = customer.customer_number === selectedCustomer.customer_number;
    const action = labels[result.action.primary] || result.action.primary;
    return `<tr><td><button class="queue-customer-button" data-customer="${customer.customer_number}" aria-pressed="${selected}"><strong>${escapeHtml(customer.name)}</strong><small>#${customer.customer_number} · ${escapeHtml(customer.payment_terms.replace("_", " "))}</small></button></td><td><span class="queue-badges"><em class="priority-${workflow.priority.toLowerCase()}">${escapeHtml(workflow.priority)}</em><em class="status-${workflow.status.toLowerCase().replaceAll("_", "-")}">${escapeHtml(REVIEW_STATUS_LABELS[workflow.status])}</em></span></td><td>${escapeHtml(workflow.assignee ? REVIEW_ASSIGNEES[workflow.assignee] : "Unassigned")}</td><td class="${workflow.dueRank < 0 ? "overdue" : ""}">${escapeHtml(workflow.dueLabel)}</td><td><span class="queue-action ${result.action.primary === "AUTO_REVIEW_PASS" ? "cleared" : "attention"}">${escapeHtml(action)}</span><small>${result.findings.length} ${result.findings.length === 1 ? "finding" : "findings"}</small></td></tr>`;
  }).join("");
  $("#reviewQueueCount").textContent = `${records.length} ${records.length === 1 ? "case" : "cases"}`;
  $("#reviewQueueEmpty").classList.toggle("hidden", records.length !== 0);
  $("#reviewOpenCount").textContent = String(allRecords.filter(({ workflow }) => workflow.status !== "COMPLETED").length);
  $("#reviewAttentionCount").textContent = String(allRecords.filter(({ result, workflow }) => workflow.status !== "COMPLETED" && result.action.primary !== "AUTO_REVIEW_PASS").length);
  $("#reviewUnassignedCount").textContent = String(allRecords.filter(({ workflow }) => workflow.status === "UNASSIGNED").length);
}

function sessionEventTime(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "This session" : new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(date);
}

function renderDecisionPanel(result, saved, workflow) {
  const draft = workflow.draft || (saved ? { status: saved.status, action: saved.action, reason: saved.reason || "" } : { status: null, action: null, reason: "" });
  const assigned = Boolean(workflow.assignee);
  const completed = workflow.status === "COMPLETED";
  const ownerOptions = [`<option value="" ${workflow.assignee ? "" : "selected"}>Unassigned</option>`, ...Object.entries(REVIEW_ASSIGNEES).map(([id, name]) => `<option value="${id}" ${workflow.assignee === id ? "selected" : ""}>${escapeHtml(name)}</option>`)].join("");
  const ownerControl = `<section class="workflow-owner"><label>Assignee<select id="reviewAssignee" ${completed ? "disabled" : ""}>${ownerOptions}</select></label>${!completed && workflow.assignee !== "JORDAN_LEE" ? `<button class="secondary-button" id="assignReviewToMe">Assign to me</button>` : ""}</section>`;
  if (completed) {
    return `${ownerControl}<section class="completed-decision"><span>Completed</span><h3>${escapeHtml(saved?.status === "OVERRIDDEN" ? "Recommendation replaced" : "Recommendation accepted")}</h3><p>${escapeHtml(labels[saved?.action] || saved?.action || result.action.primary)}${saved?.reason ? ` · ${escapeHtml(saved.reason)}` : ""}</p><button class="secondary-button" id="reopenReview">Reopen review</button></section>`;
  }
  const overrideHidden = draft.status === "OVERRIDDEN" ? "" : " hidden";
  return `${ownerControl}<div class="workflow-actions"><button class="secondary-button" id="requestReviewInformation" ${assigned && workflow.status !== "WAITING_INFORMATION" ? "" : "disabled"}>Request information</button><button class="secondary-button danger-button" id="escalateReview" ${assigned && workflow.status !== "ESCALATED" ? "" : "disabled"}>Escalate</button></div>${assigned ? "" : `<p class="workflow-notice">Assign this case before recording a decision.</p>`}<fieldset class="disposition-controls" ${assigned ? "" : "disabled"}><legend>Decision outcome</legend><label><input type="radio" name="reviewDisposition" value="ACCEPTED" ${draft.status === "ACCEPTED" ? "checked" : ""}> Accept deterministic recommendation</label><label><input type="radio" name="reviewDisposition" value="OVERRIDDEN" ${draft.status === "OVERRIDDEN" ? "checked" : ""}> Replace with another allowed action</label><div class="override-fields${overrideHidden}" id="reviewOverrideFields"><label>Replacement action<select id="reviewOverrideAction">${actionOptions.filter(action => action !== result.action.primary).map(action => `<option value="${action}" ${draft.action === action ? "selected" : ""}>${escapeHtml(labels[action] || action)}</option>`).join("")}</select></label><label>Reason (10–500 characters)<textarea id="reviewOverrideReason" rows="3" maxlength="500">${escapeHtml(draft.reason || "")}</textarea></label></div><div class="decision-actions"><button id="saveReviewDraft" class="secondary-button">Save draft</button><button id="completeReview" class="primary-button">Complete review</button></div></fieldset>${workflow.draft ? `<p class="saved-draft"><b>Draft saved</b> · Browser session</p>` : saved ? `<p class="saved-disposition"><b>Previous completed decision</b> · ${escapeHtml(labels[saved.action] || saved.action)}</p>` : ""}`;
}

function renderCaseActivity(result, saved, workflow) {
  const events = workflow.events.slice().reverse().map(event => `<div><dt>${escapeHtml(event.label)}</dt><dd>${escapeHtml(event.detail)}<small>${escapeHtml(sessionEventTime(event.at))}</small></dd></div>`).join("");
  return `<dl class="activity-list">${events}<div><dt>Policy evaluation</dt><dd>${escapeHtml(result.release.id)} · ${result.traces.length} rule traces · ${result.findings.length} findings<small>Case baseline</small></dd></div><div><dt>Decision</dt><dd>${saved ? `${escapeHtml(saved.status === "ACCEPTED" ? "Accepted" : "Replaced")} · ${escapeHtml(labels[saved.action] || saved.action)}${saved.reason ? `<small>${escapeHtml(saved.reason)}</small>` : ""}` : workflow.draft ? "Draft decision saved." : "No completed decision."}</dd></div></dl>`;
}

function renderReview(customer = narrativeCustomers[0]) {
  reviewRequestVersion += 1;
  const result = governance ? evaluate(customer, activeRuleSet, governance.activeRelease) : evaluate(customer);
  renderReviewQueue(customer);
  const facts = new Map();
  for (const trace of result.traces) for (const observation of trace.observations) facts.set(observation.factId, { ref: `fact:${customer.customer_number}/${observation.factId}`, factId: observation.factId, value: formatFact(observation.factId, observation.actual.value) });
  reviewContext = {
    customerNumber: customer.customer_number, releaseId: result.release.id, evaluationRefs: result.traces.map(trace => trace.evaluationRef), deterministicAction: result.action.primary,
    request: { schemaVersion: "1", customer: { number: customer.customer_number, name: customer.name }, release: { id: result.release.id }, action: result.action.primary, traces: result.traces.map(trace => ({ evaluationRef: trace.evaluationRef, outcome: trace.outcome, reasonCode: trace.finding?.reasonCode || null, policyStatement: trace.policy.statement, factRefs: trace.observations.map(observation => `fact:${customer.customer_number}/${observation.factId}`) })), facts: [...facts.values()] }
  };
  const saved = dispositionStore.load(reviewContext);
  const workflow = reviewWorkflow(customer.customer_number);
  const tools = eligibleEvidenceTools(result.findings);
  document.querySelectorAll("[data-customer]").forEach(button => {
    const selected = Number(button.dataset.customer) === customer.customer_number;
    button.classList.toggle("active", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
  $("#caseRecordLabel").textContent = `Customer ${customer.customer_number} · ${customer.payment_terms.replace("_", " ")}`;
  $("#caseCustomerName").textContent = customer.name;
  $("#caseRelease").textContent = result.release.id;
  $("#caseStatus").textContent = REVIEW_STATUS_LABELS[workflow.status];
  $("#caseStatus").className = `workflow-status status-${workflow.status.toLowerCase().replaceAll("_", "-")}`;
  $("#caseWorkflowMeta").innerHTML = `<span class="priority-${workflow.priority.toLowerCase()}">${escapeHtml(workflow.priority)} priority</span><span>${escapeHtml(workflow.assignee ? REVIEW_ASSIGNEES[workflow.assignee] : "Unassigned")}</span><span class="${workflow.dueRank < 0 ? "overdue" : ""}">${escapeHtml(workflow.dueLabel)}</span>`;
  $("#caseFindingCount").textContent = String(result.traces.length);
  $("#topbarRelease").textContent = result.release.id;
  $("#customerSummary").textContent = `${money(customer.credit_limit)} credit limit`;
  $("#actionOutput").innerHTML = `<p class="eyebrow">Deterministic decision · Policy ${escapeHtml(result.release.id)}</p><h2 id="actionTitle">${escapeHtml(labels[result.action.primary] || result.action.primary)}</h2><div class="reason-codes"><b>Policy reasons</b> ${result.findings.map(trace => escapeHtml(trace.policy.title)).join(" · ") || "No findings"}</div>${result.action.supporting.length ? `<p><b>Supporting:</b> ${result.action.supporting.map(value => escapeHtml(labels[value] || value)).join(" · ")}</p>` : ""}`;
  $("#traceOutput").innerHTML = `<div class="table-scroll"><table class="data-table policy-check-table"><thead><tr><th>Policy</th><th>Evaluation</th><th>Outcome</th><th>Reason</th></tr></thead><tbody>${result.traces.map(trace => `<tr class="${trace.outcome.toLowerCase().replace("_", "-")}"><td><strong>${escapeHtml(trace.policy.title)}</strong><span>${escapeHtml(trace.policy.statement)}</span><code title="${escapeHtml(trace.evaluationRef)}">${escapeHtml(trace.evaluationRef.split("/").at(-1))}</code></td><td>${trace.observations.map(observation => `<span class="table-observation"><b>${escapeHtml(observation.role === "APPLICABILITY" ? "Applies when" : observation.factLabel)}</b>${escapeHtml(formatFact(observation.factId, observation.actual.value))} ${escapeHtml(operator[observation.comparison.operator] || observation.comparison.operator)} ${escapeHtml(formatFact(observation.factId, observation.comparison.value))}<em>${escapeHtml(observation.result.replace("_", " "))}</em></span>`).join("")}</td><td><span class="table-status">${escapeHtml(trace.outcome.replace("_", " "))}</span></td><td><code>${escapeHtml(trace.finding?.reasonCode || "—")}</code></td></tr>`).join("")}</tbody></table></div>`;
  const aiEnabled = document.documentElement.dataset.aiEnabled === "true";
  $("#aiPlaceholder").innerHTML = `<div class="assistant-empty"><p class="eyebrow">Review rationale</p><h3>${aiEnabled ? "Generate an AI-drafted case summary" : "AI features disabled"}</h3><p><b>Available evidence:</b> ${tools.length ? tools.map(value => escapeHtml(value.replaceAll("_", " "))).join(" · ") : "No additional evidence sources"}</p><button id="generateReviewRationale" class="primary-button" ${aiEnabled ? "" : "disabled"}>Generate rationale</button></div>`;
  $("#dispositionOutput").innerHTML = renderDecisionPanel(result, saved, workflow);
  $("#sessionActivityOutput").innerHTML = renderCaseActivity(result, saved, workflow);
  $("#calculatorOutput").innerHTML = `<dl><div><dt>Status</dt><dd>${escapeHtml(result.calculation.status.replaceAll("_", " "))}</dd></div><div><dt>Current limit</dt><dd>${money(result.calculation.current)}</dd></div><div><dt>Recommended limit</dt><dd>${money(result.calculation.recommended)}</dd></div>${result.calculation.delta == null ? "" : `<div><dt>Difference</dt><dd>${money(result.calculation.delta)}</dd></div>`}</dl>`;
  selectedCustomerNumber = customer.customer_number;
  const explanationKey = reviewExplanationKey(reviewContext.request);
  const savedExplanation = reviewExplanations[explanationKey];
  if (savedExplanation && !isReviewExplanation(savedExplanation)) {
    delete reviewExplanations[explanationKey];
    persistProduct();
  }
  else if (savedExplanation) renderReviewExplanation(savedExplanation);
  setCaseTab(activeCaseTab);
  persistProduct();
  if (governance) renderPolicySummary();
}

const reviewExplanationKey = request => `${request.customer.number}::${request.release.id}::${request.traces.map(trace => trace.evaluationRef).join("|")}`;
const isPoints = value => Array.isArray(value) && value.every(point => point && typeof point.text === "string" && Array.isArray(point.references) && point.references.every(reference => typeof reference === "string"));
const isReviewExplanation = value => value && value.rationale && typeof value.rationale.summary === "string" && isPoints(value.rationale.points) && Array.isArray(value.evidenceResults) && value.toolTrace && Array.isArray(value.toolTrace.eligible) && Array.isArray(value.toolTrace.called);
const isPolicyExplanation = value => value && typeof value.summary === "string" && isPoints(value.points);

function selectedReviewCustomer() {
  return narrativeCustomers.find(customer => customer.customer_number === reviewContext.customerNumber);
}

function updateReviewWorkflow(changes, event) {
  const customerNumber = reviewContext.customerNumber;
  const workflow = reviewWorkflow(customerNumber);
  const events = event ? [...workflow.events, { ...event, at: new Date().toISOString() }].slice(-20) : workflow.events;
  reviewCases[customerNumber] = { ...workflow, ...changes, events };
  renderReview(selectedReviewCustomer());
}

function readReviewDraft() {
  const status = document.querySelector('input[name="reviewDisposition"]:checked')?.value || null;
  return {
    status,
    action: status === "ACCEPTED" ? reviewContext.deterministicAction : $("#reviewOverrideAction")?.value || null,
    reason: status === "OVERRIDDEN" ? $("#reviewOverrideReason")?.value || "" : ""
  };
}

function persistProduct() {
  sessionStorage.setItem(PRODUCT_STORAGE_KEY, JSON.stringify({ selectedCustomerNumber, activeView, activeCaseTab, reviewExplanations, reviewCases, reviewQueueState }));
}

function setCaseTab(tab) {
  activeCaseTab = ["overview", "findings", "evidence", "activity"].includes(tab) ? tab : "overview";
  document.querySelectorAll("[data-case-tab]").forEach(button => {
    const active = button.dataset.caseTab === activeCaseTab;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
    button.tabIndex = active ? 0 : -1;
  });
  document.querySelectorAll("[data-case-panel]").forEach(panel => panel.classList.toggle("hidden", panel.dataset.casePanel !== activeCaseTab));
}

function setProductView(view) {
  activeView = ["review", "studio"].includes(view) ? view : "review";
  document.querySelectorAll("[data-view]").forEach(button => button.classList.toggle("active", button.dataset.view === activeView));
  document.querySelectorAll(".product-view").forEach(productView => productView.classList.toggle("hidden", productView.id !== `${activeView}View`));
  if (activeView === "studio" && governance.current.state !== "DRAFT") renderGovernance();
  window.scrollTo({ top: 0, behavior: "instant" });
  persistProduct();
}

function renderReviewExplanation(result) {
  const evidence = result.evidenceResults.map(item => `<article class="trace-card"><p class="eyebrow">Fictional evidence · ${escapeHtml(item.asOfDate)}</p><h3>${escapeHtml(item.toolName.replaceAll("_", " "))}</h3><code>${escapeHtml(item.evidenceRef)}</code><pre>${escapeHtml(JSON.stringify(item.records, null, 2))}</pre></article>`).join("");
  $("#aiPlaceholder").innerHTML = `<section class="generated-rationale"><p class="eyebrow">AI-drafted rationale</p><h3>${escapeHtml(result.rationale.summary)}</h3><ul>${result.rationale.points.map(point => `<li>${escapeHtml(point.text)} <small>${point.references.map(escapeHtml).join(" · ")}</small></li>`).join("")}</ul></section>${evidence ? `<section><h3>Evidence</h3>${evidence}</section>` : ""}<button id="generateReviewRationale" class="secondary-button">Generate again</button>`;
}

async function generateReviewRationale() {
  const snapshot = reviewContext.request, version = ++reviewRequestVersion;
  $("#aiPlaceholder").innerHTML = `<p class="ai-loading" role="status"><span class="ai-spinner" aria-hidden="true"></span><b>Generating rationale with GitHub Copilot…</b></p><small>The deterministic review and Disposition remain available.</small>`;
  try {
    const response = await fetch("/api/ai/explain_review", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify(snapshot) });
    const payload = await readAiResponse(response);
    if (!response.ok) throw new Error(`${payload.error?.message || "Rationale unavailable"} · ${payload.error?.correlationId || "no correlation ID"}`);
    const current = reviewContext.request;
    if (version !== reviewRequestVersion || current.customer.number !== snapshot.customer.number || current.release.id !== snapshot.release.id || JSON.stringify(current.traces.map(item => item.evaluationRef)) !== JSON.stringify(snapshot.traces.map(item => item.evaluationRef))) return;
    reviewExplanations[reviewExplanationKey(snapshot)] = payload.result;
    persistProduct();
    renderReviewExplanation(payload.result);
  } catch (error) {
    if (version !== reviewRequestVersion) return;
    $("#aiPlaceholder").innerHTML = `<p role="alert"><b>AI rationale unavailable.</b> ${escapeHtml(error instanceof Error ? error.message : "Request failed")}</p><button id="generateReviewRationale" class="primary-button">Retry rationale</button><small>The deterministic action, Rule Evaluation Traces, and Disposition are unchanged.</small>`;
  }
}

async function readAiResponse(response) {
  const payload = await response.json();
  if (response.status === 401) window.dispatchEvent(new Event("demo-auth-required"));
  return payload;
}

function renderPolicySummary() {
  const current = governance.current;
  const active = activeRuleSet.find(rule => rule.id === current.logicalId);
  $("#topbarRelease").textContent = governance.activeRelease.id;
  $("#studioActiveRelease").textContent = governance.activeRelease.id;
  $("#workbenchBaseline").textContent = governance.activeRelease.id;
  $("#workbenchActiveRevision").textContent = active?.revision ?? "—";
  $("#policyWorkbenchTitle").textContent = policyNames[current.logicalId] || current.logicalId;
  $("#policyWorkbenchMeta").textContent = `Stable ID ${current.logicalId} · candidate revision ${current.revision}`;
  const provenance = current.provenance === "AI" ? "AI-drafted candidate" : current.provenance === "HUMAN_EDIT" ? "Human-edited candidate" : "Example candidate";
  $("#candidateProvenance").textContent = `${provenance} · ${current.state === "DRAFT" ? current.provenance === "HUMAN_EDIT" ? "Requires validation" : "Unvalidated" : "Deterministically validated"}`;
  $("#candidateState").textContent = policyOverallState();
  $("#diffState").textContent = `Active vs candidate · ${current.state === "DRAFT" ? "Unvalidated" : "Validated"}`;
  renderPolicyDiff();
  renderEvidenceSpine();
}

function policyOverallState() {
  const { current, evidence } = governance;
  if (governance.evidenceComplete()) return "Evidence complete";
  if (evidence.batch && !evidence.batch.complete) return "Impact incomplete";
  if (evidence.analysis?.status === "CONFLICT") return "Conflict";
  if (evidence.analysis?.status === "INDETERMINATE") return "Analysis indeterminate";
  if (evidence.analysis?.status) return policyStatusLabel(evidence.analysis.status);
  if (evidence.validation?.valid === false) return "Validation blocked";
  return POLICY_STATE_LABELS[current.state] || "Draft";
}

function normalizedScope(scope) {
  return scope.map(item => ({ fact: item.fact, op: item.op, value: item.value, unit: item.unit || registry.definition(item.fact)?.unit || null }));
}

function scopeText(scope) {
  return normalizedScope(scope).map(item => `${item.fact} ${item.op} ${item.value}${item.unit ? ` ${item.unit}` : ""}`).join(" AND ");
}

function renderPolicyDiff() {
  const current = governance.current, active = activeRuleSet.find(rule => rule.id === current.logicalId);
  if (!active) return;
  try {
    const ast = current.ast || parseRule(current.sourceDsl, registry, { root: "customer" });
    if (ast.id !== current.logicalId) throw new Error(`RULE_ID_MISMATCH\nExpected stable ID ${current.logicalId}; received ${ast.id}.`);
    const candidate = compileCandidate(ast, current.revision);
    const unit = candidate.constraint.type === "SET_MAX_RATIO" ? "% of accounts receivable" : candidate.constraint.unit;
    const display = value => candidate.constraint.type === "SET_MAX_RATIO" ? `${number(value * 100)}%` : `${number(value)} ${unit}`;
    const direction = candidate.constraint.value === active.constraint.value ? "Unchanged" : candidate.constraint.value < active.constraint.value ? "Lower threshold · tightening" : "Higher threshold · relaxation";
    const sameScope = JSON.stringify(normalizedScope(active.scope)) === JSON.stringify(normalizedScope(candidate.scope));
    $("#policyDiff").innerHTML = `<div class="diff-identity"><b>${escapeHtml(current.logicalId)}</b><span>Active revision ${active.revision} → candidate revision ${current.revision}</span></div><dl class="structured-diff"><div><dt>Scope</dt><dd><span>Active</span>${escapeHtml(scopeText(active.scope))}<br><span>Candidate</span>${escapeHtml(scopeText(candidate.scope))}<br><b>${sameScope ? "Unchanged scope" : "Changed scope"}</b></dd></div><div><dt>Threshold / effect</dt><dd><del>${escapeHtml(display(active.constraint.value))}</del> → <ins>${escapeHtml(display(candidate.constraint.value))}</ins><br><b>${escapeHtml(direction)}</b></dd></div><div><dt>Policy statement</dt><dd><span>Active</span>${escapeHtml(active.policy.statement)}<br><span>Candidate</span>${escapeHtml(candidate.policy.statement)}</dd></div></dl>`;
  } catch (error) {
    $("#policyDiff").innerHTML = `<p role="alert"><b>Candidate diff unavailable.</b> ${escapeHtml(error.message)} Open Edit source to correct it.</p>`;
  }
}

function renderEvidenceSpine() {
  const current = governance.current, evidence = governance.evidence;
  const state = (kind, ready) => evidence[kind] ? (kind === "validation" ? evidence[kind].valid ? "Passed" : "Blocked" : kind === "analysis" ? ["CONFLICT", "INDETERMINATE"].includes(evidence[kind].status) ? evidence[kind].status === "CONFLICT" ? "Blocked · conflict" : "Indeterminate" : "Passed" : evidence[kind].complete ? "Passed" : "Incomplete") : ready ? "Not run" : "Not run · prerequisite unmet";
  const detail = kind => kind === "validation" ? evidence.validation?.valid === false ? evidence.validation.error : "Parser, stable ID, property, datatype, enum, unit, domain, and supported-family checks passed."
    : kind === "analysis" ? evidence.analysis?.summary : evidence.batch?.headline;
  const item = (title, kind, ready, prerequisite, action) => `<section class="evidence-item"><h3>${title}</h3><strong>${state(kind, ready)}</strong>${evidence[kind] ? `<small>Candidate revision ${evidence[kind].revision} · Active Policy Version ${escapeHtml(evidence[kind].releaseId)}</small><p>${escapeHtml(detail(kind))}</p>` : `<p>${escapeHtml(prerequisite)}</p>`}${action && !evidence[kind] ? `<button class="${ready ? "secondary-button" : "primary-button"}" id="${action.id}" ${ready ? "" : "disabled"}>${escapeHtml(action.label)}</button>` : ""}</section>`;
  const stale = governance.staleEvidence.length ? `<details class="evidence-history"><summary>Stale evidence snapshots (${governance.staleEvidence.length})</summary>${governance.staleEvidence.map(snapshot => `<details><summary>Stale · ${escapeHtml(snapshot.logicalId)} · candidate revision ${snapshot.candidateRevision} · ${escapeHtml(snapshot.activeReleaseId)}</summary><p>Read-only and excluded from current readiness.</p><pre>${escapeHtml(JSON.stringify(snapshot.evidence, null, 2))}</pre></details>`).join("")}</details>` : "";
  const staleAi = stalePolicyExplanations.length ? `<details class="evidence-history"><summary>Stale generated summaries (${stalePolicyExplanations.length})</summary><p>Generated prose—not deterministic evidence or current qualification.</p>${stalePolicyExplanations.map(item => `<details><summary>Stale · ${escapeHtml(item.logicalId)} · candidate revision ${item.candidateRevision} · ${escapeHtml(item.activeReleaseId)}</summary><p>${escapeHtml(item.result.summary)}</p></details>`).join("")}</details>` : "";
  $("#evidenceSpine").innerHTML = item("1. Validation", "validation", true, "Run deterministic validation for this candidate source.", { id: "openValidation", label: "Open source and validate" })
    + item("2. Compatibility", "analysis", current.state === "VALIDATED", evidence.validation?.valid === false ? "Fix validation issues and validate a new revision first." : "Validation must pass first.", { id: "analyzeEvidence", label: "Check compatibility" })
    + item("3. Review impact", "batch", current.state === "ANALYZED", evidence.analysis?.status === "CONFLICT" ? `Blocked by conflict: ${evidence.analysis.summary}` : evidence.analysis?.status === "INDETERMINATE" ? "Blocked because the deterministic reasoner could not classify compatibility." : "A non-blocking compatibility result is required first.", { id: "runBatch", label: "Assess Review impact" })
    + stale + staleAi;
}

function persistStudio() {
  sessionStorage.setItem(STUDIO_STORAGE_KEY, JSON.stringify({ selected, governance: governance.snapshot(), policyExplanations, stalePolicyExplanations, policyInput: $("#policyInput").value, dslInput: $("#dslInput").value }));
}

function clearReviewWorkspace() {
  dispositionStore.clear();
  sessionStorage.removeItem(PRODUCT_STORAGE_KEY);
  reviewExplanations = {};
  reviewCases = createReviewCases();
  reviewQueueState = { query: "", view: "ALL", sort: "PRIORITY" };
}

function clearDemoStorage() {
  clearReviewWorkspace();
  sessionStorage.removeItem(STUDIO_STORAGE_KEY);
  policyExplanations = {};
}

function showToast(message) {
  $("#toast").textContent = message;
  $("#toast").classList.add("show");
  setTimeout(() => $("#toast").classList.remove("show"), 1800);
}

function resetState() {
  const scenario = scenarios[selected], sourceDsl = formatRule(scenario.ast, { root: "customer" });
  activeRuleSet = [...activeRules];
  governance = new Governance({ activeRelease: release, candidate: { logicalId: scenario.logicalId, revision: scenario.revision, sourcePolicy: scenario.policy, sourceDsl, ast: null, provenance: "EXAMPLE" } });
  batch = null;
  stalePolicyExplanations = [];
  invalidatePolicyExplanation();
}

function invalidatePolicyExplanation() {
  policyExplanation = null;
  policyRequestVersion += 1;
}

function staleCurrentPolicyExplanation() {
  if (policyExplanation?.status === "ready") stalePolicyExplanations.push({ logicalId: governance.current.logicalId, candidateRevision: governance.current.revision, activeReleaseId: governance.activeRelease.id, result: policyExplanation.result });
  invalidatePolicyExplanation();
}

function nextRuleRevision(logicalId) {
  const revisions = [...governance.releaseHistory.flatMap(item => item.rules.filter(rule => rule.id === logicalId).map(rule => rule.revision)), ...governance.revisions.filter(item => item.logicalId === logicalId).map(item => item.revision), ...governance.staleEvidence.filter(item => item.logicalId === logicalId).map(item => item.candidateRevision)];
  return Math.max(0, ...revisions) + 1;
}

function formatFact(id, value) {
  const definition = registry.definition(id);
  if (value == null) return "Not available";
  if (definition.format === "CURRENCY") return money(value);
  if (definition.format === "DAYS") return `${number(value)} days`;
  if (definition.format === "PERCENT") return `${(value * 100).toFixed(1)}%`;
  if (definition.format === "NUMBER") return number(value);
  return String(value).replaceAll("_", " ");
}

function formatBusinessFact(id, value) {
  if (["restricted_status", "discontinued_status"].includes(id)) return value === "Y" ? "Yes" : value === "N" ? "No" : "Not available";
  return formatFact(id, value);
}

function policyThreshold(rule) {
  if (rule.constraint?.type === "SET_MAX_RATIO") return `Maximum ${number(rule.constraint.value * 100)}% past due`;
  if (rule.constraint?.type === "SET_MAX") return `Maximum ${number(rule.constraint.value)} ${String(rule.constraint.unit || "").toLowerCase()}`;
  return "See policy statement";
}

function policyOutcome(result, logicalId) {
  const outcome = result.traces.find(trace => trace.policyRef.ruleId === logicalId)?.outcome;
  return { FINDING: "Threshold exceeded", PASS: "Within threshold", NOT_APPLICABLE: "Policy does not apply", INDETERMINATE: "Could not determine" }[outcome] || "Not evaluated";
}

function renderImpactRecord(record, row) {
  const context = registry.context(record);
  const logicalId = governance.current.logicalId;
  const keyFacts = logicalId === "HIGH_BALANCE_ADP_MAX"
    ? ["ar_balance", "adp_days", "restricted_status", "payment_terms", "past_due_amount", "past_due_ratio"]
    : ["payment_terms", "ar_balance", "past_due_amount", "past_due_ratio", "adp_days", "restricted_status"];
  const factList = ids => `<dl class="impact-fact-grid">${ids.map(id => `<div><dt>${escapeHtml(registry.definition(id).displayName)}</dt><dd>${escapeHtml(formatBusinessFact(id, context.get(id)))}</dd></div>`).join("")}</dl>`;
  const boundary = logicalId === "HIGH_BALANCE_ADP_MAX"
    ? `This record tests ${formatBusinessFact("adp_days", context.get("adp_days"))} for an ${formatBusinessFact("restricted_status", context.get("restricted_status")) === "No" ? "unrestricted" : "restricted"} customer with ${formatBusinessFact("ar_balance", context.get("ar_balance"))} in accounts receivable.`
    : `This record tests a ${formatBusinessFact("past_due_ratio", context.get("past_due_ratio"))} past-due ratio for a ${formatBusinessFact("payment_terms", context.get("payment_terms"))} customer.`;
  let outcome;
  if (row.error) {
    outcome = `<p class="impact-callout"><b>Evaluation could not complete.</b> This record is included so the input and failure remain inspectable.</p>`;
  } else {
    const candidateSet = candidateRules();
    const activeResult = evaluate(record, activeRuleSet, governance.activeRelease);
    const candidateResult = evaluate(record, candidateSet, candidateRelease(candidateSet));
    const activeRule = activeRuleSet.find(rule => rule.id === logicalId);
    const candidateRule = candidateSet.find(rule => rule.id === logicalId);
    const actionChanged = row.baselineAction !== row.candidateAction;
    const findingChanged = row.addedFindingDetails.length || row.resolvedFindingDetails.length;
    const impact = actionChanged
      ? `The candidate changes the recommended review action from ${labels[row.baselineAction] || row.baselineAction} to ${labels[row.candidateAction] || row.candidateAction}.`
      : findingChanged
        ? `The recommended review action remains ${labels[row.candidateAction] || row.candidateAction}, but the candidate changes the policy findings.`
        : `The candidate produces no change for this record; the recommended action remains ${labels[row.candidateAction] || row.candidateAction}.`;
    outcome = `<div class="impact-comparison" role="region" aria-label="Active and candidate policy comparison"><table><thead><tr><th></th><th>Active policy</th><th>Candidate policy</th></tr></thead><tbody><tr><th>Threshold</th><td>${escapeHtml(policyThreshold(activeRule))}</td><td>${escapeHtml(policyThreshold(candidateRule))}</td></tr><tr><th>Policy result</th><td>${escapeHtml(policyOutcome(activeResult, logicalId))}</td><td>${escapeHtml(policyOutcome(candidateResult, logicalId))}</td></tr><tr><th>Review action</th><td>${escapeHtml(labels[row.baselineAction] || row.baselineAction)}</td><td>${escapeHtml(labels[row.candidateAction] || row.candidateAction)}</td></tr></tbody></table></div><p class="impact-callout"><b>Candidate impact:</b> ${escapeHtml(impact)}</p>`;
  }
  const groupedInputs = Object.entries(properties).filter(([id]) => !["customer_number", "name"].includes(id)).reduce((groups, [id, definition]) => ((groups[definition.group] ||= []).push(id), groups), {});
  return `<p class="impact-fictional">Fictional boundary record · Customer ${record.customer_number}</p><p>${escapeHtml(boundary)}</p><section class="impact-section"><h4>Policy-relevant facts</h4>${factList(keyFacts)}</section><section class="impact-section"><h4>Dry-run outcome</h4>${outcome}</section><details class="impact-inputs"><summary>All input facts</summary>${Object.entries(groupedInputs).map(([group, ids]) => `<section><h4>${escapeHtml(group)}</h4>${factList(ids)}</section>`).join("")}</details><details><summary>Technical fixture details</summary><pre>${escapeHtml(JSON.stringify(record, null, 2))}</pre></details>`;
}

function policyStatusLabel(status) {
  return POLICY_STATE_LABELS[status] || status.toLowerCase().replaceAll("_", " ").replace(/^./, character => character.toUpperCase());
}

function renderOntology() {
  const context = registry.context(demoCustomer), all = { ...properties, ...derived };
  const groups = Object.groupBy ? Object.groupBy(Object.entries(all), ([, definition]) => definition.group) : Object.entries(all).reduce((result, entry) => ((result[entry[1].group] ||= []).push(entry), result), {});
  $("#ontologyGrid").innerHTML = `<div class="table-scroll"><table class="data-table ontology-table"><thead><tr><th>Fact</th><th>Current value</th></tr></thead><tbody>${Object.entries(groups).map(([group, entries]) => `<tr class="table-group"><th colspan="2">${escapeHtml(group)}</th></tr>${entries.map(([id, definition]) => `<tr><td><button class="ontology-property" data-property="${escapeHtml(id)}"><strong>${escapeHtml(definition.displayName)}</strong><small>customer.${escapeHtml(id)} · ${escapeHtml(definition.type)}${definition.unit ? ` · ${definition.unit}` : ""}</small></button></td><td><em>${escapeHtml(formatFact(id, context.get(id)))}</em>${derived[id] ? `<small>Derived from ${escapeHtml(definition.dependencies.join(", "))}</small>` : ""}</td></tr>`).join("")}`).join("")}</tbody></table></div>`;
}

async function generateDraft() {
  const button = $("#generatePrompt");
  const requestedRelease = governance.activeRelease.id;
  const policyText = $("#policyInput").value.trim();
  const requestVersion = ++draftRequestVersion;
  button.disabled = true;
  $("#promptOutput").innerHTML = `<span class="ai-loading" role="status"><span class="ai-spinner" aria-hidden="true"></span><span>Drafting with GitHub Copilot…</span></span>`;
  $("#promptSection").classList.remove("hidden");
  try {
    const response = await fetch("/api/ai/draft_rule", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ schemaVersion: "1", policyText, activeReleaseId: requestedRelease }) });
    const payload = await readAiResponse(response);
    if (!response.ok) {
      const failure = new Error(`${payload.error?.message || "Drafting failed"} · ${payload.error?.correlationId || "no correlation ID"}`);
      failure.retryable = payload.error?.retryable;
      throw failure;
    }
    if (draftRequestVersion !== requestVersion || governance.activeRelease.id !== requestedRelease || $("#policyInput").value.trim() !== policyText) throw new Error("The rule intent or active policy changed while drafting. Retry against the current state.");
    const result = payload.result;
    $("#draftBadge").textContent = result.outcome.replaceAll("_", " ");
    if (result.outcome === "CANDIDATE") {
      $("#promptOutput").textContent = result.summary;
      $("#dslInput").value = result.dsl;
      const activeRevision = activeRuleSet.find(rule => rule.id === result.family)?.revision;
      if (!Number.isInteger(activeRevision)) throw new Error("The rule family is not present in the active policy version.");
      selected = result.family === "NET30_PAST_DUE_MAX" ? "ratio5" : "adp20";
      document.querySelectorAll(".scenario").forEach(item => { const active = item.dataset.scenario === selected; item.classList.toggle("active", active); item.setAttribute("aria-pressed", String(active)); });
      staleCurrentPolicyExplanation();
      const candidate = { logicalId: result.family, revision: nextRuleRevision(result.family), sourcePolicy: policyText, sourceDsl: result.dsl, ast: null, provenance: "AI" };
      if (governance.current.logicalId === result.family) governance.edit(candidate);
      else governance.startDraft(candidate);
      batch = null;
      $("#resultSection").classList.add("hidden");
      $("#editorSection").open = true;
      persistStudio();
      renderPolicySummary();
    } else if (result.outcome === "NEEDS_CLARIFICATION") {
      $("#promptOutput").textContent = `${result.question}\n\nMissing: ${result.missingFields.join(", ")}`;
    } else {
      $("#promptOutput").textContent = result.summary;
    }
  } catch (error) {
    if (requestVersion !== draftRequestVersion) return;
    $("#draftBadge").textContent = "Draft unavailable";
    $("#promptOutput").textContent = error instanceof Error ? error.message : "Drafting failed";
    button.textContent = error?.retryable ? "Retry draft candidate →" : "Draft candidate →";
  } finally { if (requestVersion === draftRequestVersion) button.disabled = false; }
}

function invalidateDraftRequest() {
  draftRequestVersion += 1;
  $("#generatePrompt").disabled = false;
}

function updateDraft(changes, { material = false } = {}) {
  staleCurrentPolicyExplanation();
  if (material || governance.current.state !== "DRAFT") governance.edit(changes);
  else governance.updateDraft(changes);
  batch = null;
  renderPolicySummary();
}

function candidateRules() {
  if (!governance.current.ast) throw new Error("Validate the current DSL before evaluation");
  const replacement = compileCandidate(governance.current.ast, governance.current.revision);
  return activeRuleSet.map(existing => existing.id === replacement.id ? replacement : existing);
}

function candidateRelease(rules) {
  return {
    id: `${governance.activeRelease.id}-candidate-r${governance.current.revision}`,
    ontologyVersion: governance.activeRelease.ontologyVersion,
    actionPolicyVersion: governance.activeRelease.actionPolicyVersion,
    calculatorVersion: governance.activeRelease.calculatorVersion,
    status: "CANDIDATE_PREVIEW",
    rules: rules.map(({ id, revision }) => ({ id, revision }))
  };
}

function restoreStudio(saved) {
  if (saved.governance?.releaseHistory || saved.governance?.revisions?.some(item => item.state === "APPROVED_AND_ACTIVATED")) throw new Error("Legacy activation or release state cannot be restored by the Policy Change workbench");
  const expected = structuredClone(saved.governance?.revisions?.at(-1));
  const storedEvidence = structuredClone(saved.governance?.evidence || {});
  governance.restore(saved.governance);
  activeRuleSet = [...activeRules];
  batch = null;
  if (!Object.keys(storedEvidence).length) {
    if (expected.state !== "DRAFT") throw new Error("Stored candidate state has no current deterministic evidence");
    return;
  }

  let ast;
  try {
    ast = parseRule(expected.sourceDsl, registry, { root: "customer" });
    if (ast.id !== expected.logicalId) throw new Error(`RULE_ID_MISMATCH\nExpected stable ID ${expected.logicalId}; received ${ast.id}.`);
    compileCandidate(ast, expected.revision);
  } catch (error) {
    if (storedEvidence.validation?.valid !== false || expected.state !== "DRAFT" || storedEvidence.analysis || storedEvidence.batch) throw new Error("Stored validation evidence disagrees with the current candidate source");
    const message = error instanceof Error ? error.message : String(error);
    governance.record("validation", { valid: false, error: message, category: message.split("\n", 1)[0] });
    return;
  }
  if (storedEvidence.validation?.valid !== true) throw new Error("Stored validation evidence disagrees with the current candidate source");
  governance.updateDraft({ ast, sourceDsl: expected.sourceDsl });
  governance.record("validation", { valid: true, ast });

  if (storedEvidence.analysis) {
    const analysis = analyzeCandidate(ast, activeRuleSet);
    if (analysis.status !== storedEvidence.analysis.status) throw new Error("Stored compatibility evidence disagrees with deterministic analysis");
    governance.record("analysis", analysis);
  }
  if (storedEvidence.batch) {
    if (governance.current.state !== "ANALYZED") throw new Error("Stored Review impact has no compatible deterministic analysis");
    const candidateSet = candidateRules();
    const impact = assessReviewImpact(policyImpactCohort, customer => evaluate(customer, activeRuleSet, governance.activeRelease), customer => evaluate(customer, candidateSet, candidateRelease(candidateSet)));
    const comparable = value => JSON.stringify({ summary: value.summary, headline: value.headline, changedRows: value.changedRows, rows: value.rows, complete: value.complete });
    if (comparable(impact) !== comparable(storedEvidence.batch)) throw new Error("Stored Review impact disagrees with deterministic reassessment");
    governance.record("batch", impact);
    batch = governance.evidence.batch;
  }
  if (governance.current.state !== expected.state) throw new Error("Stored candidate state disagrees with reconstructed deterministic evidence");
}

function renderAuthoringError(error) {
  const message = error instanceof Error ? error.message : String(error);
  if (governance.current.state === "DRAFT") governance.record("validation", { valid: false, error: message, category: message.split("\n", 1)[0] });
  $("#resultSection").className = "result-section";
  $("#resultSection").innerHTML = `<div class="error-result" role="alert"><p class="eyebrow">Deterministic validation blocked</p><h2>${escapeHtml(message.split("\n", 1)[0])}</h2><pre>${escapeHtml(message)}</pre><p>Compatibility and Review impact cannot run until a new candidate revision passes validation.</p></div>`;
  $("#resultSection").classList.remove("hidden");
  renderPolicySummary();
  persistStudio();
}

function singleResult() {
  const rules = candidateRules();
  const releaseContext = candidateRelease(rules);
  const result = evaluate(demoCustomer, rules, releaseContext), calculation = result.calculation;
  const findingCodes = result.findings.map(trace => trace.finding.reasonCode);
  return `<section class="runtime-panel"><p class="eyebrow">Rule preview · ${escapeHtml(releaseContext.id)}</p><h3>${escapeHtml(labels[result.action.primary] || result.action.primary.replaceAll("_", " "))}</h3>
    <p>${findingCodes.map(escapeHtml).join(" · ") || "No policy findings"}</p>
    <p><b>Supporting actions:</b> ${result.action.supporting.map(action => escapeHtml(labels[action] || action.replaceAll("_", " "))).join(" · ") || "None"}</p>
    <div class="metric-grid"><div><small>Calculator status</small><b>${escapeHtml(calculation.status)}</b></div><div><small>Current / recommended</small><b>${money(calculation.current)} → ${money(calculation.recommended)}</b></div><div><small>Financial / payment</small><b>${escapeHtml(calculation.financialGrade || "—")} / ${escapeHtml(calculation.paymentGrade || "—")}</b></div><div><small>Review range</small><b>${calculation.acceptableRange ? `${money(calculation.acceptableRange[0])}–${money(calculation.acceptableRange[1])}` : "—"}</b></div></div>
    ${calculation.demand ? `<details><summary>Calculation details</summary><pre>${escapeHtml(JSON.stringify({ unconstrained: calculation.unconstrained, guarded: calculation.recommended, delta: calculation.delta, demand: calculation.demand, capacityCap: calculation.capacityCap, bindingConstraint: calculation.bindingConstraint, contributions: calculation.contributions }, null, 2))}</pre></details>` : ""}</section>`;
}

function renderBatch() {
  const summary = batch.summary;
  const metrics = [
    ["Newly Required Reviews", summary.newlyRequiredReviews],
    ["Reviews Cleared", summary.reviewsCleared],
    ["Changed Primary Actions", summary.changedPrimaryActions],
    ["Added Findings", summary.addedFindings],
    ["Resolved Findings", summary.resolvedFindings],
    ["Complete", summary.complete ? "Yes" : "No"],
    ["Indeterminate Evaluations", summary.indeterminateEvaluations],
    ["Errors", summary.errors],
    ["Cohort Size", summary.evaluated]
  ];
  const priorityIds = new Set(batch.changedRows.map(row => row.customerId));
  const orderedRows = [...batch.rows.filter(row => priorityIds.has(row.customerId)), ...batch.rows.filter(row => !priorityIds.has(row.customerId))];
  const rows = orderedRows.map(row => row.error
    ? `<tr class="batch-error"><td><button class="batch-record" data-impact-record="${row.customerId}">${escapeHtml(row.label)}</button></td><td colspan="3"><b>Evaluation error:</b> ${escapeHtml(row.error)}</td></tr>`
    : `<tr><td><button class="batch-record" data-impact-record="${row.customerId}">${escapeHtml(row.label)}</button></td><td>${escapeHtml(labels[row.baselineAction] || row.baselineAction)}</td><td>${escapeHtml(labels[row.candidateAction] || row.candidateAction)}</td><td><b>Added:</b> ${row.addedFindingDetails.map(item => `${escapeHtml(item.policyTitle)} <small>(${escapeHtml(item.reasonCode)})</small>`).join(" · ") || "none"}<br><b>Resolved:</b> ${row.resolvedFindingDetails.map(item => `${escapeHtml(item.policyTitle)} <small>(${escapeHtml(item.reasonCode)})</small>`).join(" · ") || "none"}<br><small>${row.evidenceRefs.map(escapeHtml).join(" · ")}</small></td></tr>`).join("");
  const baselineReleaseId = governance.evidence.batch?.releaseId || governance.activeRelease.id;
  return `<section class="batch-panel"><p class="eyebrow">Review impact · Baseline ${escapeHtml(baselineReleaseId)}</p><h3>${escapeHtml(batch.headline)}</h3><p><b>Fixed fictional boundary cohort—not a production portfolio, forecast, or workload estimate.</b></p><div class="metric-grid">${metrics.map(([label, value]) => `<div><small>${escapeHtml(label)}</small><b>${escapeHtml(value)}</b></div>`).join("")}</div><div class="batch-table" role="region" aria-label="Review impact records" tabindex="0"><table><thead><tr><th>Record</th><th>Baseline action</th><th>Candidate action</th><th>Finding changes and evidence</th></tr></thead><tbody>${rows}</tbody></table></div><details><summary>Full cohort output and raw JSON (${summary.evaluated} records)</summary><pre>${escapeHtml(JSON.stringify(batch.rows, null, 2))}</pre></details></section>`;
}

function policyExplanationRequest() {
  const analysis = governance.evidence.analysis;
  const impact = governance.evidence.batch;
  if (!analysis || !batch?.summary.complete || governance.current.state !== "BATCH_PASSED" || analysis.revision !== governance.current.revision || impact?.revision !== governance.current.revision || analysis.releaseId !== governance.activeRelease.id || impact.releaseId !== governance.activeRelease.id) throw new Error("Complete deterministic analysis and Review impact first.");
  const base = `${governance.activeRelease.id}/${governance.current.logicalId}@${governance.current.revision}`;
  return {
    schemaVersion: "1",
    activeReleaseId: governance.activeRelease.id,
    candidateRevision: governance.current.revision,
    analysisStatus: analysis.status,
    analysisSummary: analysis.summary,
    impactHeadline: batch.headline,
    impactComplete: true,
    evidenceRefs: [`analysis:${base}`, `impact:${policyImpactCohort.id}/${base}`]
  };
}

function renderPolicyExplanation() {
  if (policyExplanation?.status === "ready") return `<section class="runtime-panel" id="policyExplanation"><p class="eyebrow">AI change summary</p><h3>${escapeHtml(policyExplanation.result.summary)}</h3><ul>${policyExplanation.result.points.map(point => `<li>${escapeHtml(point.text)} <small>${point.references.map(escapeHtml).join(" · ")}</small></li>`).join("")}</ul><button id="generatePolicyExplanation" class="secondary-button">Generate again</button></section>`;
  if (policyExplanation?.status === "loading") return `<section class="runtime-panel" id="policyExplanation"><p class="eyebrow">AI change summary</p><h3 class="ai-loading" role="status"><span class="ai-spinner" aria-hidden="true"></span><span>Generating summary…</span></h3></section>`;
  if (policyExplanation?.status === "error") return `<section class="runtime-panel" id="policyExplanation"><p class="eyebrow">AI change summary</p><h3 role="alert">Summary unavailable</h3><p>${escapeHtml(policyExplanation.message)}</p><button id="generatePolicyExplanation" class="secondary-button">Retry</button></section>`;
  let ready = false;
  try { policyExplanationRequest(); ready = true; } catch {}
  return `<section class="runtime-panel" id="policyExplanation"><p class="eyebrow">AI change summary</p><h3>${ready ? "Summarize the compatibility and impact results" : "Complete compatibility and impact analysis"}</h3><button id="generatePolicyExplanation" class="secondary-button" ${ready && document.documentElement.dataset.aiEnabled === "true" ? "" : "disabled"}>Generate summary</button></section>`;
}

const policyExplanationKey = request => JSON.stringify(request);

async function generatePolicyExplanation() {
  let snapshot;
  try { snapshot = policyExplanationRequest(); } catch (error) { return showToast(error.message); }
  const version = ++policyRequestVersion;
  policyExplanation = { status: "loading" };
  renderGovernance();
  try {
    const response = await fetch("/api/ai/explain_policy_analysis", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify(snapshot) });
    const payload = await readAiResponse(response);
    if (!response.ok) throw new Error(`${payload.error?.message || "Explanation unavailable"} · ${payload.error?.correlationId || "no correlation ID"}`);
    if (!isPolicyExplanation(payload.result)) throw new Error("AI explanation response was invalid. Deterministic evidence is unchanged.");
    let current;
    try { current = policyExplanationRequest(); } catch { return; }
    if (version !== policyRequestVersion || JSON.stringify(current) !== JSON.stringify(snapshot)) return;
    policyExplanation = { status: "ready", result: payload.result };
    policyExplanations[policyExplanationKey(snapshot)] = payload.result;
    persistStudio();
  } catch (error) {
    if (version !== policyRequestVersion) return;
    policyExplanation = { status: "error", message: error instanceof Error ? error.message : "Request failed" };
  }
  renderGovernance();
}

function renderGovernance(message = "") {
  const current = governance.current, analysis = governance.evidence.analysis;
  if (!policyExplanation) {
    try {
      const saved = policyExplanations[policyExplanationKey(policyExplanationRequest())];
      if (saved && isPolicyExplanation(saved)) policyExplanation = { status: "ready", result: saved };
    } catch {}
  }
  const expectedAnalysis = current.ast ? analyzeCandidate(current.ast, activeRuleSet) : null;
  const headline = policyOverallState();
  const conflict = analysis?.status === "CONFLICT";
  const activeRevision = activeRuleSet.find(rule => rule.id === current.logicalId)?.revision;
  $("#resultSection").className = `result-section governance-panel${conflict ? " conflict" : ""}`;
  $("#candidateState").textContent = headline;
  $("#resultSection").innerHTML = `<div class="result-hero"><div class="result-icon">${conflict ? "!" : "✓"}</div><div><span class="result-label">Rule analysis</span><h2>${escapeHtml(headline)}</h2><p>Active revision ${activeRevision} · candidate revision ${current.revision}${expectedAnalysis ? ` · ${escapeHtml(expectedAnalysis.summary)}` : ""}</p></div></div>
    <div class="governance-body">
    ${message ? `<p class="notice">${escapeHtml(message)}</p>` : ""}
    ${current.ast ? singleResult() : `<section class="runtime-panel"><p class="eyebrow">Draft revision ${current.revision}</p><h3>Validation required</h3><p>Regenerate or edit the DSL, then validate it before deterministic preview or compatibility analysis.</p></section>`}
    ${batch ? renderBatch() : ""}
    ${current.state === "BATCH_PASSED" ? `<p class="evidence-boundary"><b>Evidence complete for candidate revision ${current.revision} against ${escapeHtml(governance.activeRelease.id)}.</b> Governed review, approval, publication, and activation happen outside this POC.</p>${renderPolicyExplanation()}` : ""}
    <details><summary>Raw revision and evidence output</summary><pre>${escapeHtml(JSON.stringify({ revisions: governance.revisions, evidence: governance.evidence }, null, 2))}</pre></details></div>`;
  $("#resultSection").classList.remove("hidden");
  renderPolicySummary();
}

function setScenario(id, { resetReleases = false } = {}) {
  const target = scenarios[id];
  const targetDsl = formatRule(target.ast, { root: "customer" });
  const exactlyCurrent = governance && governance.current.logicalId === target.logicalId && governance.current.sourcePolicy === target.policy && governance.current.sourceDsl === targetDsl && $("#policyInput").value === target.policy && $("#dslInput").value === targetDsl;
  if (!resetReleases && exactlyCurrent) return showToast("The current candidate already matches this example");
  const replacingMaterialWork = governance && (governance.revisions.length > 1 || Object.keys(governance.evidence).length || ["AI", "HUMAN_EDIT"].includes(governance.current.provenance));
  const hasUnappliedChanges = governance && ($("#policyInput").value !== governance.current.sourcePolicy || $("#dslInput").value !== governance.current.sourceDsl);
  if (!resetReleases && (replacingMaterialWork || hasUnappliedChanges) && !window.confirm("Replace the current session Policy Change? Candidate edits and evidence for this change will be cleared.")) return;
  invalidateDraftRequest();
  selected = id;
  resetState();
  document.querySelectorAll(".scenario").forEach(button => { const active = button.dataset.scenario === id; button.classList.toggle("active", active); button.setAttribute("aria-pressed", String(active)); });
  $("#candidateState").textContent = "Draft";
  $("#policyInput").value = scenarios[id].policy;
  $("#charCount").textContent = `${scenarios[id].policy.length} characters`;
  $("#dslInput").value = formatRule(scenarios[id].ast, { root: "customer" });
  $("#promptSection").classList.add("hidden");
  $("#editorSection").open = false;
  $("#resultSection").classList.add("hidden");
  renderPolicySummary();
  if (!resetReleases) persistStudio();
}

document.addEventListener("click", event => {
  if (event.target.closest("#generateReviewRationale") && document.documentElement.dataset.aiEnabled === "true") generateReviewRationale();
  if (event.target.closest("#generatePolicyExplanation") && document.documentElement.dataset.aiEnabled === "true") generatePolicyExplanation();
  const caseTab = event.target.closest("[data-case-tab]");
  if (caseTab) { setCaseTab(caseTab.dataset.caseTab); persistProduct(); }
  if (event.target.closest("#assignReviewToMe")) {
    updateReviewWorkflow({ assignee: "JORDAN_LEE", status: reviewWorkflow(reviewContext.customerNumber).status === "UNASSIGNED" ? "IN_REVIEW" : reviewWorkflow(reviewContext.customerNumber).status }, { label: "Case assigned", detail: "Assigned to Jordan Lee." });
    showToast("Case assigned to you");
  }
  if (event.target.closest("#requestReviewInformation")) {
    updateReviewWorkflow({ status: "WAITING_INFORMATION" }, { label: "Information requested", detail: "Case moved to waiting for information." });
    showToast("Case is waiting for information");
  }
  if (event.target.closest("#escalateReview")) {
    updateReviewWorkflow({ status: "ESCALATED" }, { label: "Case escalated", detail: "Escalated for additional review." });
    showToast("Case escalated");
  }
  if (event.target.closest("#saveReviewDraft")) {
    const draft = readReviewDraft();
    updateReviewWorkflow({ draft }, { label: "Decision draft saved", detail: draft.status ? `${draft.status === "ACCEPTED" ? "Acceptance" : "Replacement"} saved as a draft.` : "Incomplete decision saved as a draft." });
    showToast("Decision draft saved");
  }
  if (event.target.closest("#completeReview")) {
    try {
      const draft = readReviewDraft();
      const saved = dispositionStore.save({ ...reviewContext, ...draft });
      updateReviewWorkflow({ status: "COMPLETED", draft }, { label: "Review completed", detail: `${saved.status === "ACCEPTED" ? "Accepted" : "Replaced"} with ${labels[saved.action] || saved.action}.` });
      showToast("Review completed");
    } catch (error) { showToast(error instanceof Error ? error.message : String(error)); }
  }
  if (event.target.closest("#reopenReview")) {
    const workflow = reviewWorkflow(reviewContext.customerNumber);
    updateReviewWorkflow({ status: "IN_REVIEW", assignee: workflow.assignee || "JORDAN_LEE" }, { label: "Review reopened", detail: "Case returned to in review." });
    showToast("Review reopened");
  }
  const scenario = event.target.closest(".scenario");
  if (scenario) setScenario(scenario.dataset.scenario);
  if (event.target.closest("#openValidation")) { $("#editorSection").open = true; $("#validateButton").focus(); }
  if (event.target.closest("#generatePrompt")) {
    if (document.documentElement.dataset.aiEnabled === "true") generateDraft();
    else showToast("AI is disabled. Use the example candidate or edit source manually.");
  }
  if (event.target.closest("#simulateResponse")) {
    const sourceDsl = formatRule(scenarios[selected].ast, { root: "customer" });
    $("#dslInput").value = sourceDsl;
    const changes = { sourcePolicy: $("#policyInput").value, sourceDsl, ast: null, provenance: "EXAMPLE" };
    const material = changes.sourcePolicy !== governance.current.sourcePolicy || changes.sourceDsl !== governance.current.sourceDsl;
    if (!material) { $("#editorSection").open = true; return showToast("The current candidate already matches this example"); }
    updateDraft(changes, { material });
    $("#editorSection").open = true;
    persistStudio();
  }
  if (event.target.closest("#applySourceEdit")) {
    const sourceDsl = $("#dslInput").value;
    const sourcePolicy = $("#policyInput").value;
    if (sourceDsl === governance.current.sourceDsl && sourcePolicy === governance.current.sourcePolicy) return showToast("No material source or intent change to apply");
    updateDraft({ sourcePolicy, sourceDsl, ast: null, provenance: "HUMAN_EDIT" }, { material: true });
    renderGovernance("Source edit applied as a material candidate revision. Prior evidence is stale.");
    persistStudio();
  }
  if (event.target.closest("#validateButton")) {
    try {
      if ($("#dslInput").value !== governance.current.sourceDsl || $("#policyInput").value !== governance.current.sourcePolicy) updateDraft({ sourcePolicy: $("#policyInput").value, sourceDsl: $("#dslInput").value, ast: null, provenance: "HUMAN_EDIT" }, { material: true });
      if (governance.current.state !== "DRAFT") throw new Error("Edit the DSL to create a new draft revision before validating again.");
      const ast = parseRule($("#dslInput").value, registry, { root: "customer" });
      if (ast.id !== governance.current.logicalId) throw new Error(`RULE_ID_MISMATCH\nExpected stable ID ${governance.current.logicalId}; received ${ast.id}.`);
      compileCandidate(ast, governance.current.revision);
      governance.updateDraft({ ast, sourceDsl: $("#dslInput").value });
      governance.record("validation", { valid: true, ast });
      renderGovernance("Ontology, types, enums, units, and bounded DSL syntax validated for this exact revision.");
      persistStudio();
    } catch (error) { renderAuthoringError(error); }
  }
  if (event.target.closest("#analyzeEvidence")) {
    try { invalidatePolicyExplanation(); const analysis = analyzeCandidate(governance.current.ast, activeRuleSet); governance.record("analysis", analysis); renderGovernance(analysis.status === "CONFLICT" ? "This change conflicts with the active policy." : `${policyStatusLabel(analysis.status)} against the active policy.`); persistStudio(); }
    catch (error) { renderGovernance(error.message); }
  }
  if (event.target.closest("#runBatch")) {
    try {
      const candidateSet = candidateRules();
      const candidateBatch = assessReviewImpact(policyImpactCohort, customer => evaluate(customer, activeRuleSet, governance.activeRelease), customer => evaluate(customer, candidateSet, candidateRelease(candidateSet)));
      governance.record("batch", candidateBatch);
      batch = governance.evidence.batch;
      invalidatePolicyExplanation();
      renderGovernance(candidateBatch.summary.complete ? "Customer impact assessment complete." : "Impact assessment incomplete: errors or indeterminate evaluations block a definitive result.");
      persistStudio();
    } catch (error) { renderGovernance(error.message); }
  }
  if (event.target.closest("#resetButton")) {
    if (!window.confirm("Reset this browser workspace and clear session changes?")) return;
    clearDemoStorage();
    setScenario("ratio5", { resetReleases: true });
    activeCaseTab = "overview";
    selectedCustomerNumber = 2002;
    $("#reviewSearch").value = "";
    $("#reviewQueueView").value = "ALL";
    $("#reviewSort").value = "PRIORITY";
    setCaseTab(activeCaseTab);
    setProductView("review");
    renderReview(narrativeCustomers.find(customer => customer.customer_number === selectedCustomerNumber));
    showToast("Workspace reset");
  }
  const impactRecordButton = event.target.closest("[data-impact-record]");
  if (impactRecordButton) {
    const record = policyImpactCohort.records.find(item => item.customer_number === Number(impactRecordButton.dataset.impactRecord));
    if (record) {
      const row = batch?.rows.find(item => item.customerId === record.customer_number);
      $("#propertyDialog").classList.add("impact-dialog");
      $("#dialogTitle").textContent = record.name;
      $("#dialogBody").innerHTML = renderImpactRecord(record, row);
      $("#propertyDialog").showModal();
    }
  }
  const property = event.target.closest("[data-property]");
  if (property) { const id = property.dataset.property, definition = registry.definition(id), value = registry.context(demoCustomer).get(id); $("#propertyDialog").classList.remove("impact-dialog"); $("#dialogTitle").textContent = definition.displayName; $("#dialogBody").textContent = JSON.stringify({ id: `customer.${id}`, ...definition, exampleValue: value }, null, 2); $("#propertyDialog").showModal(); }
  if (event.target.closest("#browseActivePolicy")) { $("#propertyDialog").classList.remove("impact-dialog"); $("#dialogTitle").textContent = `Active Policy Version ${governance.activeRelease.id}`; $("#dialogBody").innerHTML = activeRuleSet.map(rule => `<article><h4>${escapeHtml(rule.policy.title)} · ${escapeHtml(rule.id)}@${rule.revision}</h4><p>${escapeHtml(rule.policy.statement)}</p></article>`).join(""); $("#propertyDialog").showModal(); }
  if (event.target.closest("#browseFactCatalog")) { $("#propertyDialog").classList.remove("impact-dialog"); $("#dialogTitle").textContent = "Fact catalog · fictional illustrative values"; $("#dialogBody").innerHTML = $("#ontologyGrid").innerHTML; $("#propertyDialog").showModal(); }
  if (event.target.closest(".dialog-close")) $("#propertyDialog").close();
  if (event.target.closest("#runDmnDemo")) { const result = evaluate(demoCustomer, activeRuleSet, governance.activeRelease); $("#dmnDryRunResult").innerHTML = `<div class="decision-result-heading"><div><span>Ontology-backed runtime · ${escapeHtml(result.release.id)}</span><h5>${escapeHtml(result.action.primary.replaceAll("_", " "))}</h5><p>${result.findings.length} findings · recommended ${money(result.calculation.recommended)}</p></div></div><pre class="artifact-code">${escapeHtml(JSON.stringify({ action: result.action, calculation: result.calculation, traces: result.traces }, null, 2))}</pre>`; }
});

document.addEventListener("change", event => {
  if (event.target.matches('input[name="reviewDisposition"]')) $("#reviewOverrideFields")?.classList.toggle("hidden", event.target.value !== "OVERRIDDEN");
  if (event.target.matches("#reviewAssignee")) {
    const assignee = event.target.value || null;
    const workflow = reviewWorkflow(reviewContext.customerNumber);
    updateReviewWorkflow({ assignee, status: assignee ? workflow.status === "UNASSIGNED" ? "IN_REVIEW" : workflow.status : "UNASSIGNED" }, { label: assignee ? "Case reassigned" : "Case unassigned", detail: assignee ? `Assigned to ${REVIEW_ASSIGNEES[assignee]}.` : "Case returned to the unassigned queue." });
    showToast(assignee ? "Assignee updated" : "Case unassigned");
  }
});

$("#policyInput").addEventListener("input", () => { invalidateDraftRequest(); $("#charCount").textContent = `${$("#policyInput").value.length} characters`; });
document.querySelectorAll("[data-view]").forEach(button => button.addEventListener("click", () => setProductView(button.dataset.view)));
$(".case-tabs").addEventListener("keydown", event => {
  if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
  const tabs = [...document.querySelectorAll("[data-case-tab]")];
  const current = tabs.findIndex(tab => tab.dataset.caseTab === activeCaseTab);
  const next = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (current + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
  event.preventDefault();
  setCaseTab(tabs[next].dataset.caseTab);
  persistProduct();
  tabs[next].focus();
});
$("#customerSwitcher").addEventListener("click", event => {
  const button = event.target.closest("[data-customer]");
  if (button) renderReview(narrativeCustomers.find(customer => customer.customer_number === Number(button.dataset.customer)));
});
$("#reviewSearch").addEventListener("input", event => {
  reviewQueueState.query = event.target.value.slice(0, 100);
  renderReviewQueue(selectedReviewCustomer());
  persistProduct();
});
$("#reviewQueueView").addEventListener("change", event => {
  reviewQueueState.view = event.target.value;
  renderReviewQueue(selectedReviewCustomer());
  persistProduct();
});
$("#reviewSort").addEventListener("change", event => {
  reviewQueueState.sort = event.target.value;
  renderReviewQueue(selectedReviewCustomer());
  persistProduct();
});
renderOntology();
setScenario("ratio5", { resetReleases: true });
let resetReleaseBoundReviews = false;
try {
  const product = JSON.parse(sessionStorage.getItem(PRODUCT_STORAGE_KEY) || "null");
  if (product) {
    selectedCustomerNumber = narrativeCustomers.some(item => item.customer_number === product.selectedCustomerNumber) ? product.selectedCustomerNumber : 2002;
    activeView = ["review", "studio"].includes(product.activeView) ? product.activeView : "review";
    activeCaseTab = ["overview", "findings", "evidence", "activity"].includes(product.activeCaseTab) ? product.activeCaseTab : "overview";
    reviewExplanations = product.reviewExplanations && typeof product.reviewExplanations === "object" && !Array.isArray(product.reviewExplanations) ? Object.fromEntries(Object.entries(product.reviewExplanations).filter(([, value]) => isReviewExplanation(value))) : {};
    reviewCases = restoreReviewCases(product.reviewCases);
    reviewQueueState = {
      query: typeof product.reviewQueueState?.query === "string" ? product.reviewQueueState.query.slice(0, 100) : "",
      view: ["ALL", "MINE", "UNASSIGNED", "DUE_SOON", "ESCALATED", "COMPLETED"].includes(product.reviewQueueState?.view) ? product.reviewQueueState.view : "ALL",
      sort: ["PRIORITY", "DUE", "CUSTOMER"].includes(product.reviewQueueState?.sort) ? product.reviewQueueState.sort : "PRIORITY"
    };
  }
  const saved = JSON.parse(sessionStorage.getItem(STUDIO_STORAGE_KEY) || "null");
  if (saved) {
    resetReleaseBoundReviews = Boolean(saved.governance?.activeReleaseId && (saved.governance.activeReleaseId !== release.id || saved.governance.releaseHistory?.length > 1));
    selected = Object.hasOwn(scenarios, saved.selected) ? saved.selected : "ratio5";
    resetState();
    restoreStudio(saved);
    policyExplanations = saved.policyExplanations && typeof saved.policyExplanations === "object" && !Array.isArray(saved.policyExplanations) ? Object.fromEntries(Object.entries(saved.policyExplanations).filter(([, value]) => isPolicyExplanation(value))) : {};
    stalePolicyExplanations = Array.isArray(saved.stalePolicyExplanations) ? saved.stalePolicyExplanations.filter(item => item?.logicalId && Number.isInteger(item.candidateRevision) && item.activeReleaseId === release.id && isPolicyExplanation(item.result)) : [];
    $("#policyInput").value = saved.policyInput || governance.current.sourcePolicy || scenarios[selected].policy;
    $("#dslInput").value = governance.current.sourceDsl || "";
    renderPolicySummary();
  }
  document.querySelectorAll(".scenario").forEach(button => { const active = button.dataset.scenario === selected; button.classList.toggle("active", active); button.setAttribute("aria-pressed", String(active)); });
  $("#charCount").textContent = `${$("#policyInput").value.length} characters`;
} catch {
  sessionStorage.removeItem(STUDIO_STORAGE_KEY);
  if (resetReleaseBoundReviews) clearReviewWorkspace();
  setScenario("ratio5", { resetReleases: true });
}
$("#reviewSearch").value = reviewQueueState.query;
$("#reviewQueueView").value = reviewQueueState.view;
$("#reviewSort").value = reviewQueueState.sort;
setProductView(activeView);
renderReview(narrativeCustomers.find(item => item.customer_number === selectedCustomerNumber) || narrativeCustomers[0]);
