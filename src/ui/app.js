import { createEvaluator, assessReviewImpact } from "../core/runtime.js";
import { parseRule, formatRule } from "../core/authoring.js";
import { Governance, STATES } from "../core/governance.js";
import { properties, derived, registry, creditPack, activeRules, compileCandidate, analyzeCandidate, nextReleaseId, scenarios, narrativeCustomers, policyImpactCohort, eligibleEvidenceTools, demoCustomer, release, illustrativeOverrideHistory } from "../domains/credit/pack.js";
import { createDispositionStore, dispositionActions } from "../domains/credit/dispositions.js";

const $ = selector => document.querySelector(selector);
const escapeHtml = value => String(value ?? "—").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
const money = value => value == null ? "—" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
const number = value => new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);
const evaluate = createEvaluator(creditPack);
const actionOptions = dispositionActions;
const dispositionStore = createDispositionStore(sessionStorage);
const STUDIO_STORAGE_KEY = "customer-review:policy-studio:v1";
let reviewContext, reviewRequestVersion = 0;
let selected = "ratio5", governance, activeRuleSet, batch, disposition, releaseRuleSets = {}, draftRequestVersion = 0, policyExplanation, policyRequestVersion = 0;

const labels = { AUTO_REVIEW_PASS: "Auto review pass", NEED_CREDIT_MANAGER_REVIEW: "Credit manager review", REQUEST_UPDATED_FINANCIAL_STATEMENTS: "Request updated financial statements", NEED_TO_RESTRICT: "Restrict customer", NEED_MANUAL_REVIEW: "Manual review", RECOMMEND_CREDIT_LIMIT_REASSESSMENT: "Reassess credit limit" };
const operator = { "==": "is", "!=": "is not", ">": "is greater than", ">=": "is at least", "<": "is less than", "<=": "is at most" };
const narrativeBands = ["Green", "Yellow", "Orange", "Red"];

function renderReview(customer = narrativeCustomers[0]) {
  reviewRequestVersion += 1;
  const result = governance ? evaluate(customer, activeRuleSet, governance.activeRelease) : evaluate(customer);
  const facts = new Map();
  for (const trace of result.traces) for (const observation of trace.observations) facts.set(observation.factId, { ref: `fact:${customer.customer_number}/${observation.factId}`, factId: observation.factId, value: formatFact(observation.factId, observation.actual.value) });
  reviewContext = {
    customerNumber: customer.customer_number, releaseId: result.release.id, evaluationRefs: result.traces.map(trace => trace.evaluationRef), deterministicAction: result.action.primary,
    request: { schemaVersion: "1", customer: { number: customer.customer_number, name: customer.name }, release: { id: result.release.id }, action: result.action.primary, traces: result.traces.map(trace => ({ evaluationRef: trace.evaluationRef, outcome: trace.outcome, reasonCode: trace.finding?.reasonCode || null, policyStatement: trace.policy.statement, factRefs: trace.observations.map(observation => `fact:${customer.customer_number}/${observation.factId}`) })), facts: [...facts.values()] }
  };
  const saved = dispositionStore.load(reviewContext);
  const tools = eligibleEvidenceTools(result.findings);
  document.querySelectorAll("[data-customer]").forEach(button => {
    const selected = Number(button.dataset.customer) === customer.customer_number;
    button.classList.toggle("active", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
  $("#customerSummary").textContent = `Customer ${customer.customer_number} · ${customer.payment_terms.replace("_", " ")} · ${money(customer.credit_limit)} credit limit`;
  $("#actionOutput").innerHTML = `<p class="eyebrow">Deterministic · Demo Release ${escapeHtml(result.release.id)}</p><h2 id="actionTitle">${escapeHtml(labels[result.action.primary] || result.action.primary)}</h2><div class="reason-codes"><b>Reason codes</b> ${result.action.basedOn.map(escapeHtml).join(" · ") || "No findings"}</div>${result.action.supporting.length ? `<p><b>Supporting:</b> ${result.action.supporting.map(value => escapeHtml(labels[value] || value)).join(" · ")}</p>` : ""}`;
  $("#traceOutput").innerHTML = result.traces.map(trace => `<article class="trace-card ${trace.outcome.toLowerCase().replace("_", "-")}"><header><div><p class="eyebrow">${escapeHtml(trace.outcome.replace("_", " "))}</p><h3>${escapeHtml(trace.policy.title)}</h3></div><code>${escapeHtml(trace.evaluationRef)}</code></header><p>${escapeHtml(trace.policy.statement)}</p>${trace.observations.map(observation => `<div class="observation"><b>${escapeHtml(observation.role === "APPLICABILITY" ? "Applies when" : observation.factLabel)}</b><span>${escapeHtml(formatFact(observation.factId, observation.actual.value))} ${escapeHtml(operator[observation.comparison.operator] || observation.comparison.operator)} ${escapeHtml(formatFact(observation.factId, observation.comparison.value))}</span><em>${escapeHtml(observation.result.replace("_", " "))}</em></div>`).join("")}${trace.finding ? `<footer>${escapeHtml(trace.finding.reasonCode)}</footer>` : ""}</article>`).join("");
  const aiEnabled = document.documentElement.dataset.aiEnabled === "true";
  $("#aiPlaceholder").innerHTML = `<p><b>${aiEnabled ? "Generate a grounded rationale on request." : "AI features are disabled in static mode."}</b> The deterministic action and traces above remain complete and usable.</p><p><b>Eligible Tier-2 Evidence:</b> ${tools.length ? tools.map(value => escapeHtml(value.replaceAll("_", " "))).join(" · ") : "No evidence tools are eligible for these findings."}</p><button id="generateReviewRationale" class="primary-button" ${aiEnabled ? "" : "disabled"}>Generate rationale</button><small>AI-drafted prose may use simulated fictional lookups for context only; it cannot change Findings, action, calculation, or Disposition.</small>`;
  $("#dispositionOutput").innerHTML = `<fieldset class="disposition-controls"><legend>Record a choice for ${escapeHtml(customer.name)} · ${escapeHtml(result.release.id)}</legend><label><input type="radio" name="reviewDisposition" value="ACCEPTED" ${saved?.status === "ACCEPTED" ? "checked" : ""}> Accept deterministic action</label><label><input type="radio" name="reviewDisposition" value="OVERRIDDEN" ${saved?.status === "OVERRIDDEN" ? "checked" : ""}> Replace with another allowed action</label><label>Replacement action<select id="reviewOverrideAction">${actionOptions.filter(action => action !== result.action.primary).map(action => `<option value="${action}" ${saved?.action === action ? "selected" : ""}>${escapeHtml(labels[action] || action)}</option>`).join("")}</select></label><label>Reason (10–500 characters)<textarea id="reviewOverrideReason" rows="3" maxlength="500">${escapeHtml(saved?.reason || "")}</textarea></label><button id="saveReviewDisposition" class="primary-button">Save session-only Disposition</button></fieldset>${saved ? `<p class="saved-disposition"><b>${escapeHtml(saved.status === "ACCEPTED" ? "Accepted" : "Overridden")}</b> · ${escapeHtml(labels[saved.action] || saved.action)}${saved.reason ? ` · ${escapeHtml(saved.reason)}` : ""}</p>` : `<p class="disposition-empty">No Disposition recorded for this customer and release.</p>`}`;
  $("#calculatorOutput").innerHTML = `<dl><div><dt>Status</dt><dd>${escapeHtml(result.calculation.status.replaceAll("_", " "))}</dd></div><div><dt>Current limit</dt><dd>${money(result.calculation.current)}</dd></div><div><dt>Recommended limit</dt><dd>${money(result.calculation.recommended)}</dd></div>${result.calculation.delta == null ? "" : `<div><dt>Difference</dt><dd>${money(result.calculation.delta)}</dd></div>`}</dl>`;
  if (governance) renderReleaseSummary();
}

function renderReviewExplanation(result) {
  const evidence = result.evidenceResults.map(item => `<article class="trace-card"><p class="eyebrow">Simulated fictional Tier-2 Evidence · ${escapeHtml(item.asOfDate)}</p><h3>${escapeHtml(item.toolName.replaceAll("_", " "))}</h3><code>${escapeHtml(item.evidenceRef)}</code><pre>${escapeHtml(JSON.stringify(item.records, null, 2))}</pre></article>`).join("");
  $("#aiPlaceholder").innerHTML = `<section class="generated-rationale"><p class="eyebrow">AI-drafted rationale · non-authoritative</p><h3>${escapeHtml(result.rationale.summary)}</h3><ul>${result.rationale.points.map(point => `<li>${escapeHtml(point.text)} <small>${point.references.map(escapeHtml).join(" · ")}</small></li>`).join("")}</ul></section><section><h3>Deterministic fictional evidence results</h3>${evidence || "<p>No Tier-2 Evidence was requested.</p>"}</section><section><h3>Gateway tool trace</h3><p><b>Eligible:</b> ${result.toolTrace.eligible.map(escapeHtml).join(" · ") || "None"}</p><p><b>Called:</b> ${result.toolTrace.called.map(escapeHtml).join(" · ") || "None"}</p></section><button id="generateReviewRationale" class="secondary-button">Generate again</button>`;
}

async function generateReviewRationale() {
  const snapshot = reviewContext.request, version = ++reviewRequestVersion;
  $("#aiPlaceholder").innerHTML = `<p role="status"><b>Generating rationale with GPT-5.6 Luna…</b></p><small>The deterministic review and Disposition remain available.</small>`;
  try {
    const response = await fetch("/api/ai/explain_review", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify(snapshot) });
    const payload = await response.json();
    if (!response.ok) throw new Error(`${payload.error?.message || "Rationale unavailable"} · ${payload.error?.correlationId || "no correlation ID"}`);
    const current = reviewContext.request;
    if (version !== reviewRequestVersion || current.customer.number !== snapshot.customer.number || current.release.id !== snapshot.release.id || JSON.stringify(current.traces.map(item => item.evaluationRef)) !== JSON.stringify(snapshot.traces.map(item => item.evaluationRef))) return;
    renderReviewExplanation(payload.result);
  } catch (error) {
    if (version !== reviewRequestVersion) return;
    $("#aiPlaceholder").innerHTML = `<p role="alert"><b>AI rationale unavailable.</b> ${escapeHtml(error instanceof Error ? error.message : "Request failed")}</p><button id="generateReviewRationale" class="primary-button">Retry rationale</button><small>The deterministic action, Rule Evaluation Traces, and Disposition are unchanged.</small>`;
  }
}

function renderReleaseSummary() {
  $("#releaseSelector").innerHTML = governance.releaseHistory.map(item => `<option value="${escapeHtml(item.id)}" ${item.id === governance.activeRelease.id ? "selected" : ""}>${escapeHtml(item.id)}${item.id === release.id ? " · baseline" : ""}</option>`).join("");
  const ruleId = scenarios[selected].logicalId;
  const count = dispositionStore.list().filter(item => item.status === "OVERRIDDEN" && item.releaseId === governance.activeRelease.id && item.evaluationRefs.some(ref => ref.includes(`/${ruleId}@`))).length;
  $("#sessionOverrideCount").textContent = `${count} associated override${count === 1 ? "" : "s"}`;
  $("#illustrativeOverrideHistory").innerHTML = illustrativeOverrideHistory.map(item => `<li><b>${escapeHtml(labels[item.action] || item.action)}</b> — ${escapeHtml(item.reason)}</li>`).join("");
}

function persistStudio() {
  sessionStorage.setItem(STUDIO_STORAGE_KEY, JSON.stringify({ selected, governance: governance.snapshot(), releaseRuleSets, batch, policyInput: $("#policyInput").value, dslInput: $("#dslInput").value }));
}

function clearDemoStorage() {
  dispositionStore.clear();
  sessionStorage.removeItem(STUDIO_STORAGE_KEY);
}

function showToast(message) {
  $("#toast").textContent = message;
  $("#toast").classList.add("show");
  setTimeout(() => $("#toast").classList.remove("show"), 1800);
}

function setProgress(step) {
  document.querySelectorAll(".track-step").forEach((element, index) => element.classList.toggle("active", index < step));
  $("#progressLine").style.width = `${((step - 1) / 3) * 100}%`;
}

function resetState() {
  const scenario = scenarios[selected], sourceDsl = formatRule(scenario.ast, { root: "customer" });
  activeRuleSet = [...activeRules];
  releaseRuleSets = { [release.id]: activeRuleSet };
  governance = new Governance({ activeRelease: release, candidate: { logicalId: scenario.logicalId, revision: scenario.revision, sourcePolicy: scenario.policy, sourceDsl, ast: null } });
  batch = null;
  disposition = null;
  invalidatePolicyExplanation();
}

function invalidatePolicyExplanation() {
  policyExplanation = null;
  policyRequestVersion += 1;
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

function renderOntology() {
  const context = registry.context(demoCustomer), all = { ...properties, ...derived };
  const groups = Object.groupBy ? Object.groupBy(Object.entries(all), ([, definition]) => definition.group) : Object.entries(all).reduce((result, entry) => ((result[entry[1].group] ||= []).push(entry), result), {});
  $("#ontologyGrid").innerHTML = Object.entries(groups).map(([group, entries]) => `<section class="ontology-group"><h3>${escapeHtml(group)}</h3><div>${entries.map(([id, definition]) => `<button class="ontology-property" data-property="${escapeHtml(id)}"><strong>${escapeHtml(definition.displayName)}</strong><small>customer.${escapeHtml(id)} · ${escapeHtml(definition.type)}${definition.unit ? ` · ${definition.unit}` : ""}</small><em>${escapeHtml(formatFact(id, context.get(id)))}</em>${derived[id] ? `<span>Derived from ${escapeHtml(definition.dependencies.join(", "))}</span>` : ""}</button>`).join("")}</div></section>`).join("");
}

function promptText() {
  const ontology = Object.entries({ ...properties, ...derived }).map(([id, definition]) => `customer.${id}: ${definition.type}${definition.unit ? ` [${definition.unit}]` : ""}${definition.values ? ` {${definition.values.join("|")}}` : ""}`).join("\n");
  return `MOCKED TRANSLATION PROMPT — non-authoritative\nCreate one draft only. Never validate, calculate, approve, activate, or select a customer action.\n\nONTOLOGY v2.0\n${ontology}\n\nDSL\nRULE <STABLE_ID>\nSCOPE ALL | customer.<property> <operator> <typed value> [AND ...]\nSET_MAX customer.<numeric_property> = <value> [unit]\nSET_MIN customer.<numeric_property> = <value> [unit]\nSET_MAX_RATIO customer.<decimal_property>\n  TO customer.<decimal_property> = <ratio>\nEND\n\nBUSINESS POLICY\n${$("#policyInput").value.trim()}`;
}

async function generateDraft() {
  const button = $("#generatePrompt");
  const requestedRelease = governance.activeRelease.id;
  const policyText = $("#policyInput").value.trim();
  const requestVersion = ++draftRequestVersion;
  const scenario = scenarios[selected];
  governance.startDraft({ logicalId: scenario.logicalId, revision: (activeRuleSet.find(rule => rule.id === scenario.logicalId)?.revision || scenario.revision - 1) + 1, sourcePolicy: policyText, sourceDsl: "", ast: null });
  batch = null;
  disposition = null;
  button.disabled = true;
  $("#promptOutput").textContent = "Drafting with GPT-5.6 Luna…";
  $("#promptSection").classList.remove("hidden");
  $("#editorSection").classList.add("hidden");
  $("#resultSection").classList.add("hidden");
  try {
    const response = await fetch("/api/ai/draft_rule", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ schemaVersion: "1", policyText, activeReleaseId: requestedRelease }) });
    const payload = await response.json();
    if (!response.ok) {
      const failure = new Error(`${payload.error?.message || "Drafting failed"} · ${payload.error?.correlationId || "no correlation ID"}`);
      failure.retryable = payload.error?.retryable;
      throw failure;
    }
    if (draftRequestVersion !== requestVersion || governance.activeRelease.id !== requestedRelease || $("#policyInput").value.trim() !== policyText) throw new Error("The policy intent or active Demo Release changed while drafting. Retry against the current state.");
    const result = payload.result;
    $("#draftBadge").textContent = result.outcome.replaceAll("_", " ");
    if (result.outcome === "CANDIDATE") {
      $("#promptOutput").textContent = result.summary;
      $("#dslInput").value = result.dsl;
      const activeRevision = activeRuleSet.find(rule => rule.id === result.family)?.revision;
      if (!Number.isInteger(activeRevision)) throw new Error("The candidate family is not present in the active Demo Release.");
      selected = result.family === "NET30_PAST_DUE_MAX" ? "ratio5" : "adp20";
      document.querySelectorAll(".scenario").forEach(item => item.classList.toggle("active", item.dataset.scenario === selected));
      governance.startDraft({ logicalId: result.family, revision: activeRevision + 1, sourcePolicy: policyText, sourceDsl: result.dsl, ast: null });
      batch = null;
      disposition = null;
      $("#editorSection").classList.remove("hidden");
      setProgress(3);
    } else if (result.outcome === "NEEDS_CLARIFICATION") {
      $("#promptOutput").textContent = `${result.question}\n\nMissing: ${result.missingFields.join(", ")}`;
    } else {
      $("#promptOutput").textContent = result.summary;
    }
  } catch (error) {
    $("#draftBadge").textContent = "Draft unavailable";
    $("#promptOutput").textContent = error instanceof Error ? error.message : "Drafting failed";
    button.textContent = error?.retryable ? "Retry draft candidate →" : "Draft candidate →";
  } finally { button.disabled = false; }
}

function updateDraft(changes) {
  if (governance.current.state === "DRAFT") governance.updateDraft(changes);
  else governance.edit(changes);
  batch = null;
  disposition = null;
  invalidatePolicyExplanation();
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

function renderAuthoringError(error) {
  $("#resultSection").className = "result-section";
  $("#resultSection").innerHTML = `<div class="error-result"><p class="eyebrow">Deterministic validation failed</p><h2>INVALID RULE</h2><pre>${escapeHtml(error instanceof Error ? error.message : error)}</pre></div>`;
  $("#resultSection").classList.remove("hidden");
}

function singleResult() {
  const activated = governance.current.state === "APPROVED_AND_ACTIVATED";
  const rules = activated ? activeRuleSet : candidateRules();
  const releaseContext = activated ? governance.activeRelease : candidateRelease(rules);
  const result = evaluate(demoCustomer, rules, releaseContext), calculation = result.calculation;
  const findingCodes = result.findings.map(trace => trace.finding.reasonCode);
  return `<section class="runtime-panel"><p class="eyebrow">${activated ? "Active in this browser tab only" : "Candidate preview"} deterministic runtime · ${escapeHtml(releaseContext.id)}</p><h3>${escapeHtml(result.action.primary.replaceAll("_", " "))}</h3>
    <p>${findingCodes.map(escapeHtml).join(" · ") || "No policy findings"}</p>
    <p><b>Supporting actions:</b> ${result.action.supporting.map(action => escapeHtml(action.replaceAll("_", " "))).join(" · ") || "None"}</p>
    <div class="metric-grid"><div><small>Calculator status</small><b>${escapeHtml(calculation.status)}</b></div><div><small>Current / recommended</small><b>${money(calculation.current)} → ${money(calculation.recommended)}</b></div><div><small>Financial / payment</small><b>${escapeHtml(calculation.financialGrade || "—")} / ${escapeHtml(calculation.paymentGrade || "—")}</b></div><div><small>Review range</small><b>${calculation.acceptableRange ? `${money(calculation.acceptableRange[0])}–${money(calculation.acceptableRange[1])}` : "—"}</b></div></div>
    ${calculation.demand ? `<details><summary>Illustrative recommendation breakdown</summary><pre>${escapeHtml(JSON.stringify({ unconstrained: calculation.unconstrained, guarded: calculation.recommended, delta: calculation.delta, demand: calculation.demand, capacityCap: calculation.capacityCap, bindingConstraint: calculation.bindingConstraint, contributions: calculation.contributions }, null, 2))}</pre></details>` : ""}
    <aside class="llm-explanation"><div><span>Mocked output · LLM-polished explanation</span><b>Non-authoritative presentation only</b></div><p>The deterministic release produced ${escapeHtml(result.action.primary.replaceAll("_", " ").toLowerCase())} from ${findingCodes.length} finding${findingCodes.length === 1 ? "" : "s"}. The model did not calculate or select this result.</p></aside>
    <fieldset class="human-controls"><legend>Human result · session only</legend><label><input type="radio" name="disposition" value="accept"> Accept</label><label><input type="radio" name="disposition" value="override"> Override</label><select id="overrideAction" aria-label="Override recommended action">${actionOptions.map(action => `<option value="${action}">${escapeHtml(action.replaceAll("_", " "))}</option>`).join("")}</select><input id="overrideValue" type="number" min="0" step="5000" placeholder="Optional limit" aria-label="Override credit limit"><label><input type="radio" name="disposition" value="decline"> Decline</label><textarea id="overrideReason" rows="2" placeholder="Reason required for override" aria-label="Override reason"></textarea><button id="saveDisposition" class="primary-button">Save result</button></fieldset>
    ${disposition ? `<p class="saved-disposition"><b>Saved in memory:</b> ${escapeHtml(disposition.summary)}</p>` : ""}
    <p class="boundary-note"><b>Illustrative demo policy:</b> advisory only. Accepting or overriding never mutates customer facts, restriction state, or credit limit.</p></section>`;
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
  const rows = batch.changedRows.map(row => row.error
    ? `<tr class="batch-error"><td>${escapeHtml(row.label)}</td><td colspan="3"><b>Evaluation error:</b> ${escapeHtml(row.error)}</td></tr>`
    : `<tr><td>${escapeHtml(row.label)}</td><td>${escapeHtml(labels[row.baselineAction] || row.baselineAction)}</td><td>${escapeHtml(labels[row.candidateAction] || row.candidateAction)}</td><td><b>Added:</b> ${row.addedFindingDetails.map(item => `${escapeHtml(item.policyTitle)} <small>(${escapeHtml(item.reasonCode)})</small>`).join(" · ") || "none"}<br><b>Resolved:</b> ${row.resolvedFindingDetails.map(item => `${escapeHtml(item.policyTitle)} <small>(${escapeHtml(item.reasonCode)})</small>`).join(" · ") || "none"}<br><small>${row.evidenceRefs.map(escapeHtml).join(" · ")}</small></td></tr>`).join("");
  const baselineReleaseId = governance.evidence.batch?.releaseId || governance.activeRelease.id;
  return `<section class="batch-panel"><p class="eyebrow">Deterministic Review impact · illustrative Policy Impact Cohort · baseline ${escapeHtml(baselineReleaseId)}</p><h3>${escapeHtml(batch.headline)}</h3><p>Compared with the active release in this illustrative ${summary.evaluated}-record cohort.</p><div class="metric-grid">${metrics.map(([label, value]) => `<div><small>${escapeHtml(label)}</small><b>${escapeHtml(value)}</b></div>`).join("")}</div><div class="batch-table"><table><thead><tr><th>Record</th><th>Baseline action</th><th>Candidate action</th><th>Finding changes and evidence</th></tr></thead><tbody>${rows}</tbody></table></div><details><summary>Show all ${summary.evaluated}</summary><pre>${escapeHtml(JSON.stringify(batch.rows, null, 2))}</pre></details></section>`;
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
  if (policyExplanation?.status === "ready") return `<section class="runtime-panel" id="policyExplanation"><p class="eyebrow">AI policy explanation · non-authoritative</p><h3>${escapeHtml(policyExplanation.result.summary)}</h3><ul>${policyExplanation.result.points.map(point => `<li>${escapeHtml(point.text)} <small>${point.references.map(escapeHtml).join(" · ")}</small></li>`).join("")}</ul><button id="generatePolicyExplanation" class="secondary-button">Generate again</button><p class="boundary-note">This explanation does not qualify, approve, or activate the candidate.</p></section>`;
  if (policyExplanation?.status === "loading") return `<section class="runtime-panel" id="policyExplanation"><p class="eyebrow">AI policy explanation · non-authoritative</p><h3 role="status">Generating explanation with GPT-5.6 Luna…</h3><p>Deterministic qualification and activation remain available.</p></section>`;
  if (policyExplanation?.status === "error") return `<section class="runtime-panel" id="policyExplanation"><p class="eyebrow">AI policy explanation · non-authoritative</p><h3 role="alert">Explanation unavailable</h3><p>${escapeHtml(policyExplanation.message)}</p><button id="generatePolicyExplanation" class="secondary-button">Retry explanation</button><p class="boundary-note">This failure does not block an otherwise-qualified Demo Release activation.</p></section>`;
  let ready = false;
  try { policyExplanationRequest(); ready = true; } catch {}
  return `<section class="runtime-panel" id="policyExplanation"><p class="eyebrow">AI policy explanation · non-authoritative</p><h3>${ready ? "Deterministic evidence is ready to explain" : "Complete deterministic analysis and Review impact first"}</h3><p>The explanation supports deterministic evidence; it never validates or activates a candidate.</p><button id="generatePolicyExplanation" class="secondary-button" ${ready && document.documentElement.dataset.aiEnabled === "true" ? "" : "disabled"}>Generate explanation</button></section>`;
}

async function generatePolicyExplanation() {
  let snapshot;
  try { snapshot = policyExplanationRequest(); } catch (error) { return showToast(error.message); }
  const version = ++policyRequestVersion;
  policyExplanation = { status: "loading" };
  renderGovernance();
  try {
    const response = await fetch("/api/ai/explain_policy_analysis", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify(snapshot) });
    const payload = await response.json();
    if (!response.ok) throw new Error(`${payload.error?.message || "Explanation unavailable"} · ${payload.error?.correlationId || "no correlation ID"}`);
    let current;
    try { current = policyExplanationRequest(); } catch { return; }
    if (version !== policyRequestVersion || JSON.stringify(current) !== JSON.stringify(snapshot)) return;
    policyExplanation = { status: "ready", result: payload.result };
  } catch (error) {
    if (version !== policyRequestVersion) return;
    policyExplanation = { status: "error", message: error instanceof Error ? error.message : "Request failed" };
  }
  renderGovernance();
}

function renderGovernance(message = "") {
  const current = governance.current, analysis = governance.evidence.analysis;
  const expectedAnalysis = current.ast ? analyzeCandidate(current.ast, activeRuleSet) : null;
  const headline = analysis?.status || current.state;
  const conflict = analysis?.status === "CONFLICT";
  const activeRevision = activeRuleSet.find(rule => rule.id === current.logicalId)?.revision;
  $("#resultSection").className = `result-section governance-panel${conflict ? " conflict" : ""}`;
  $("#resultSection").innerHTML = `<div class="result-hero"><div class="result-icon">${conflict ? "!" : "✓"}</div><div><span class="result-label">Versioned rule governance</span><h2>${escapeHtml(headline.replaceAll("_", " "))}</h2><p>Stable ID ${escapeHtml(current.logicalId)} · active revision ${activeRevision} vs candidate revision ${current.revision}${expectedAnalysis ? ` · ${escapeHtml(expectedAnalysis.summary)}` : ""}</p></div></div>
    <div class="governance-body"><div class="lifecycle" aria-label="Revision lifecycle">${STATES.map(state => `<span class="${state === current.state ? "current" : STATES.indexOf(state) < STATES.indexOf(current.state) ? "complete" : ""}">${state.replaceAll("_", " ")}</span>`).join("")}</div>
    ${message ? `<p class="notice">${escapeHtml(message)}</p>` : ""}
    <div class="governance-actions"><button id="analyzeEvidence" class="secondary-button" ${current.state === "VALIDATED" ? "" : "disabled"}>Analyze compatibility</button><button id="runBatch" class="primary-button" ${current.state === "ANALYZED" ? "" : "disabled"}>Run Review impact</button></div>
    <p class="boundary-note">In-memory simulation: the first edit after validation creates a new revision and stales all evidence. Conflicts, applicable indeterminate results, and batch errors block approval.</p>
    ${current.ast ? singleResult() : `<section class="runtime-panel"><p class="eyebrow">Draft revision ${current.revision}</p><h3>Validation required</h3><p>Regenerate or edit the DSL, then validate it before deterministic preview, impact analysis, or approval.</p></section>`}${batch ? renderBatch() : ""}
    ${renderPolicyExplanation()}
    <div class="governance-actions"><button id="activateRelease" class="primary-button" ${governance.canActivate() ? "" : "disabled"}>Approve &amp; activate demo release</button></div>
    <details><summary>Revision, evidence, and release history</summary><pre>${escapeHtml(JSON.stringify({ revisions: governance.revisions, releases: governance.releaseHistory, evidence: governance.evidence }, null, 2))}</pre></details></div>`;
  $("#resultSection").classList.remove("hidden");
  renderReleaseSummary();
}

function setScenario(id, { resetReleases = false } = {}) {
  draftRequestVersion += 1;
  selected = id;
  const scenario = scenarios[selected], sourceDsl = formatRule(scenario.ast, { root: "customer" });
  if (!governance || resetReleases) resetState();
  else {
    governance.startDraft({ logicalId: scenario.logicalId, revision: scenario.revision, sourcePolicy: scenario.policy, sourceDsl, ast: null });
    batch = null;
    disposition = null;
    invalidatePolicyExplanation();
  }
  document.querySelectorAll(".scenario").forEach(button => button.classList.toggle("active", button.dataset.scenario === id));
  $("#policyInput").value = scenarios[id].policy;
  $("#charCount").textContent = `${scenarios[id].policy.length} characters`;
  $("#dslInput").value = formatRule(scenarios[id].ast, { root: "customer" });
  $("#promptSection").classList.add("hidden");
  $("#editorSection").classList.add("hidden");
  $("#resultSection").classList.add("hidden");
  setProgress(1);
}

document.addEventListener("click", event => {
  if (event.target.closest("#generateReviewRationale") && document.documentElement.dataset.aiEnabled === "true") generateReviewRationale();
  if (event.target.closest("#generatePolicyExplanation") && document.documentElement.dataset.aiEnabled === "true") generatePolicyExplanation();
  if (event.target.closest("#saveReviewDisposition")) {
    try {
      const status = document.querySelector('input[name="reviewDisposition"]:checked')?.value;
      const saved = dispositionStore.save({ ...reviewContext, status, action: $("#reviewOverrideAction").value, reason: $("#reviewOverrideReason").value });
      const customer = narrativeCustomers.find(item => item.customer_number === reviewContext.customerNumber);
      renderReview(customer);
      showToast(`${saved.status === "ACCEPTED" ? "Acceptance" : "Override"} saved for this session`);
    } catch (error) { showToast(error instanceof Error ? error.message : String(error)); }
  }
  const scenario = event.target.closest(".scenario");
  if (scenario) setScenario(scenario.dataset.scenario);
  if (event.target.closest("#generatePrompt")) {
    if (document.documentElement.dataset.aiEnabled === "true") generateDraft();
    else { $("#promptOutput").textContent = promptText(); $("#promptSection").classList.remove("hidden"); $("#simulateResponse").classList.remove("hidden"); setProgress(2); }
  }
  if (event.target.closest("#simulateResponse")) { const sourceDsl = formatRule(scenarios[selected].ast, { root: "customer" }); $("#dslInput").value = sourceDsl; updateDraft({ sourceDsl, ast: null }); $("#editorSection").classList.remove("hidden"); setProgress(3); }
  if (event.target.closest("#validateButton")) {
    try {
      if (governance.current.state !== "DRAFT") throw new Error("Edit the DSL to create a new draft revision before validating again.");
      const ast = parseRule($("#dslInput").value, registry, { root: "customer" });
      if (ast.id !== governance.current.logicalId) throw new Error(`RULE_ID_MISMATCH\nExpected stable ID ${governance.current.logicalId}; received ${ast.id}.`);
      governance.updateDraft({ ast, sourceDsl: $("#dslInput").value });
      governance.record("validation", { valid: true, ast });
      renderGovernance("Ontology, types, enums, units, and bounded DSL syntax validated for this exact revision.");
      persistStudio();
      setProgress(3);
    } catch (error) { renderAuthoringError(error); }
  }
  if (event.target.closest("#analyzeEvidence")) {
    try { invalidatePolicyExplanation(); const analysis = analyzeCandidate(governance.current.ast, activeRuleSet); governance.record("analysis", analysis); renderGovernance(analysis.status === "CONFLICT" ? "Conflict blocks Review impact and activation." : `${analysis.status.replaceAll("_", " ")} against the active release.`); persistStudio(); setProgress(4); }
    catch (error) { renderGovernance(error.message); }
  }
  if (event.target.closest("#runBatch")) {
    try {
      const candidateSet = candidateRules();
      const candidateBatch = assessReviewImpact(policyImpactCohort, customer => evaluate(customer, activeRuleSet, governance.activeRelease), customer => evaluate(customer, candidateSet, candidateRelease(candidateSet)));
      governance.record("batch", candidateBatch);
      batch = candidateBatch;
      invalidatePolicyExplanation();
      renderGovernance(candidateBatch.summary.complete ? "Review impact assessment complete." : "Impact assessment incomplete: errors or indeterminate evaluations block a definitive result.");
      persistStudio();
    } catch (error) { renderGovernance(error.message); }
  }
  if (event.target.closest("#activateRelease")) {
    try {
      invalidatePolicyExplanation();
      const activatedRules = candidateRules();
      const manifest = { id: nextReleaseId(governance.releaseHistory.at(-1).id), ontologyVersion: "2.0", actionPolicyVersion: "credit-actions-1.0", calculatorVersion: creditPack.calculator.version, rules: activatedRules.map(({ id, revision }) => ({ id, revision })), compiledRules: activatedRules };
      const next = governance.activate(manifest);
      activeRuleSet = activatedRules;
      releaseRuleSets[next.id] = activatedRules;
      persistStudio();
      renderGovernance(`Approved and activated ${next.id}. Active in this browser tab only.`);
      renderReview(narrativeCustomers.find(item => item.customer_number === reviewContext.customerNumber));
    } catch (error) { renderGovernance(error.message); }
  }
  if (event.target.closest("#saveDisposition")) {
    const choice = document.querySelector('input[name="disposition"]:checked')?.value;
    const reason = $("#overrideReason").value.trim();
    if (!choice) return showToast("Select accept, override, or decline");
    if (choice === "override" && !reason) return showToast("An override reason is required");
    const value = $("#overrideValue").value ? Number($("#overrideValue").value) : null;
    disposition = { choice, action: choice === "override" ? $("#overrideAction").value : null, value, reason, summary: choice === "override" ? `Override to ${$("#overrideAction").value.replaceAll("_", " ")}${value == null ? "" : ` at ${money(value)}`} — ${reason}` : `${choice} selected; customer facts remain unchanged` };
    renderGovernance("Human disposition saved in memory; no customer state or credit limit changed.");
  }
  if (event.target.closest("#resetButton")) {
    if (!window.confirm("Reset this browser tab to credit-1.4.0 and clear mutable demo state?")) return;
    const customer = narrativeCustomers.find(item => item.customer_number === reviewContext.customerNumber) || narrativeCustomers[0];
    clearDemoStorage();
    setScenario("ratio5", { resetReleases: true });
    renderReview(customer);
    showToast("Demo session state reset");
  }
  const property = event.target.closest("[data-property]");
  if (property) { const id = property.dataset.property, definition = registry.definition(id), value = registry.context(demoCustomer).get(id); $("#dialogTitle").textContent = definition.displayName; $("#dialogBody").textContent = JSON.stringify({ id: `customer.${id}`, ...definition, exampleValue: value }, null, 2); $("#propertyDialog").showModal(); }
  if (event.target.closest(".dialog-close")) $("#propertyDialog").close();
  if (event.target.closest("#runDmnDemo")) { const result = evaluate(demoCustomer, activeRuleSet, governance.activeRelease); $("#dmnDryRunResult").innerHTML = `<div class="decision-result-heading"><div><span>Ontology-backed runtime · ${escapeHtml(result.release.id)}</span><h5>${escapeHtml(result.action.primary.replaceAll("_", " "))}</h5><p>${result.findings.length} findings · recommended ${money(result.calculation.recommended)}</p></div></div><pre class="artifact-code">${escapeHtml(JSON.stringify({ action: result.action, calculation: result.calculation, traces: result.traces }, null, 2))}</pre>`; }
});

$("#releaseSelector").addEventListener("change", event => {
  draftRequestVersion += 1;
  invalidatePolicyExplanation();
  governance.selectRelease(event.target.value);
  activeRuleSet = releaseRuleSets[governance.activeRelease.id] || activeRules;
  persistStudio();
  renderReview(narrativeCustomers.find(item => item.customer_number === reviewContext.customerNumber));
});

$("#policyInput").addEventListener("input", () => { draftRequestVersion += 1; updateDraft({ sourcePolicy: $("#policyInput").value, ast: null }); persistStudio(); $("#charCount").textContent = `${$("#policyInput").value.length} characters`; if (!$("#resultSection").classList.contains("hidden")) renderGovernance("Business-intent edit created or updated a draft; regenerate and validate its executable DSL."); });
$("#dslInput").addEventListener("input", () => { updateDraft({ sourceDsl: $("#dslInput").value, ast: null }); persistStudio(); if (!$("#resultSection").classList.contains("hidden")) renderGovernance("DSL edit created or updated a draft revision; prior evidence is stale."); });
$("#copyPrompt").addEventListener("click", async () => { try { await navigator.clipboard.writeText($("#promptOutput").textContent); showToast("Prompt copied"); } catch { showToast("Select the prompt text to copy"); } });
document.querySelectorAll("[data-view]").forEach(button => button.addEventListener("click", () => {
  document.querySelectorAll("[data-view]").forEach(item => item.classList.toggle("active", item === button));
  document.querySelectorAll(".product-view").forEach(view => view.classList.toggle("hidden", view.id !== `${button.dataset.view}View`));
}));
$("#customerSwitcher").addEventListener("click", event => {
  const button = event.target.closest("[data-customer]");
  if (button) renderReview(narrativeCustomers.find(customer => customer.customer_number === Number(button.dataset.customer)));
});
$("#customerSwitcher").innerHTML = narrativeCustomers.map((customer, index) => `<button data-customer="${customer.customer_number}" aria-pressed="false"><small>${narrativeBands[index]}</small><strong>${escapeHtml(customer.name)}</strong></button>`).join("");
renderOntology();
setScenario("ratio5", { resetReleases: true });
try {
  const saved = JSON.parse(sessionStorage.getItem(STUDIO_STORAGE_KEY) || "null");
  if (saved) {
    selected = Object.hasOwn(scenarios, saved.selected) ? saved.selected : "ratio5";
    resetState();
    governance.restore(saved.governance);
    releaseRuleSets = saved.releaseRuleSets || { [release.id]: activeRules };
    activeRuleSet = releaseRuleSets[governance.activeRelease.id] || activeRules;
    batch = saved.batch || null;
    $("#policyInput").value = saved.policyInput || governance.current.sourcePolicy || scenarios[selected].policy;
    $("#dslInput").value = saved.dslInput || governance.current.sourceDsl || "";
  }
  document.querySelectorAll(".scenario").forEach(button => button.classList.toggle("active", button.dataset.scenario === selected));
  $("#charCount").textContent = `${$("#policyInput").value.length} characters`;
} catch {
  sessionStorage.removeItem(STUDIO_STORAGE_KEY);
  setScenario("ratio5", { resetReleases: true });
}
renderReview();
