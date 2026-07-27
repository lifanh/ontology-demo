import { createEvaluator, compareBatch } from "../core/runtime.js";
import { parseRule, formatRule } from "../core/authoring.js";
import { Governance, STATES } from "../core/governance.js";
import { properties, derived, registry, creditPack, activeRules, compileCandidate, analyzeCandidate, nextReleaseId, scenarios, fixtures, demoCustomer, release } from "../domains/credit/pack.js";

const $ = selector => document.querySelector(selector);
const escapeHtml = value => String(value ?? "—").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
const money = value => value == null ? "—" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
const evaluate = createEvaluator(creditPack);
const actionOptions = ["AUTO_REVIEW_PASS", "REQUEST_UPDATED_FINANCIAL_STATEMENTS", "NEED_MANUAL_REVIEW", "NEED_CREDIT_MANAGER_REVIEW", "RECOMMEND_CREDIT_LIMIT_REASSESSMENT", "NEED_TO_RESTRICT"];
let selected = "ratio5", governance, activeRuleSet, batch, disposition;

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
  governance = new Governance({ activeRelease: release, candidate: { logicalId: scenario.logicalId, revision: scenario.revision, sourcePolicy: scenario.policy, sourceDsl, ast: null } });
  batch = null;
  disposition = null;
}

function formatFact(id, value) {
  const definition = registry.definition(id);
  if (value == null) return "Not available";
  if (definition.unit === "USD") return money(value);
  if (definition.unit === "DAYS") return `${value} days`;
  if (["current_ratio", "debt_to_equity_ratio", "net_sales_trend_ratio"].includes(id)) return `${value.toFixed(2)}×`;
  if (definition.type === "decimal" && (id.endsWith("_ratio") || id.endsWith("_margin") || id === "credit_utilization")) return `${(value * 100).toFixed(1)}%`;
  return String(value).replaceAll("_", " ");
}

function renderOntology() {
  const context = registry.context(demoCustomer), all = { ...properties, ...derived };
  const groups = Object.groupBy ? Object.groupBy(Object.entries(all), ([, definition]) => definition.group) : Object.entries(all).reduce((result, entry) => ((result[entry[1].group] ||= []).push(entry), result), {});
  $("#ontologyGrid").innerHTML = Object.entries(groups).map(([group, entries]) => `<section class="ontology-group"><h3>${escapeHtml(group)}</h3><div>${entries.map(([id, definition]) => `<button class="ontology-property" data-property="${escapeHtml(id)}"><strong>${escapeHtml(definition.displayName)}</strong><small>customer.${escapeHtml(id)} · ${escapeHtml(definition.type)}${definition.unit ? ` · ${definition.unit}` : ""}</small><em>${escapeHtml(formatFact(id, context.get(id)))}</em>${derived[id] ? `<span>Derived from ${escapeHtml(definition.dependencies.join(", "))}</span>` : ""}</button>`).join("")}</div></section>`).join("");
}

function promptText() {
  const ontology = Object.entries({ ...properties, ...derived }).map(([id, definition]) => `customer.${id}: ${definition.type}${definition.unit ? ` [${definition.unit}]` : ""}${definition.values ? ` {${definition.values.join("|")}}` : ""}`).join("\n");
  return `MOCKED TRANSLATION PROMPT — non-authoritative\nCreate one draft only. Never validate, calculate, approve, publish, or select a customer action.\n\nONTOLOGY v2.0\n${ontology}\n\nDSL\nRULE <STABLE_ID>\nSCOPE ALL | customer.<property> <operator> <typed value> [AND ...]\nSET_MAX customer.<numeric_property> = <value> [unit]\nSET_MIN customer.<numeric_property> = <value> [unit]\nSET_MAX_RATIO customer.<decimal_property>\n  TO customer.<decimal_property> = <ratio>\nEND\n\nBUSINESS POLICY\n${$("#policyInput").value.trim()}`;
}

function updateDraft(changes) {
  if (governance.current.state === "DRAFT") governance.updateDraft(changes);
  else governance.edit(changes);
  batch = null;
  disposition = null;
}

function candidateRules() {
  if (!governance.current.ast) throw new Error("Validate the current DSL before evaluation");
  const replacement = compileCandidate(governance.current.ast, governance.current.revision);
  return activeRuleSet.map(existing => existing.id === replacement.id ? replacement : existing);
}

function renderAuthoringError(error) {
  $("#resultSection").className = "result-section";
  $("#resultSection").innerHTML = `<div class="error-result"><p class="eyebrow">Deterministic validation failed</p><h2>INVALID RULE</h2><pre>${escapeHtml(error instanceof Error ? error.message : error)}</pre></div>`;
  $("#resultSection").classList.remove("hidden");
}

function singleResult() {
  const published = governance.current.state === "APPROVED_AND_PUBLISHED";
  const rules = published ? activeRuleSet : candidateRules();
  const releaseContext = published ? governance.activeRelease : { id: `${governance.activeRelease.id} + candidate r${governance.current.revision}` };
  const result = evaluate(demoCustomer, rules, releaseContext), calculation = result.calculation;
  const findingCodes = result.findings.filter(finding => finding.status === "FINDING").map(finding => finding.reasonCode);
  return `<section class="runtime-panel"><p class="eyebrow">${published ? "Active" : "Candidate preview"} deterministic runtime · ${escapeHtml(releaseContext.id)}</p><h3>${escapeHtml(result.action.primary.replaceAll("_", " "))}</h3>
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
  const rows = batch.rows.map(row => row.error
    ? `<tr class="batch-error"><td>${escapeHtml(row.customer.name)}</td><td colspan="3"><b>Evaluation error:</b> ${escapeHtml(row.error)}</td></tr>`
    : `<tr><td><details><summary>${escapeHtml(row.customer.name)}</summary><pre>${escapeHtml(JSON.stringify({ baseline: row.baseline.findings, candidate: row.candidate.findings, action: row.candidate.action, calculation: row.candidate.calculation }, null, 2))}</pre></details></td><td>${escapeHtml(row.baseline.action.primary)}<br>${money(row.baseline.calculation.recommended)}</td><td>${escapeHtml(row.candidate.action.primary)}<br>${money(row.candidate.calculation.recommended)}</td><td>+ ${escapeHtml(row.added.join(", ") || "none")}<br>− ${escapeHtml(row.resolved.join(", ") || "none")}</td></tr>`).join("");
  const baselineReleaseId = governance.evidence.batch?.releaseId || governance.activeRelease.id;
  return `<section class="batch-panel"><p class="eyebrow">Portfolio comparison · same evaluator · baseline ${escapeHtml(baselineReleaseId)}</p><h3>Candidate impact batch</h3><div class="metric-grid">${Object.entries(summary).map(([key, value]) => `<div><small>${escapeHtml(key)}</small><b>${key.toLowerCase().includes("delta") ? money(value) : escapeHtml(value)}</b></div>`).join("")}</div><div class="batch-table"><table><thead><tr><th>Customer</th><th>Baseline action / limit</th><th>Candidate action / limit</th><th>Finding changes</th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
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
    <div class="governance-actions"><button id="analyzeEvidence" class="secondary-button" ${current.state === "VALIDATED" ? "" : "disabled"}>Analyze conflicts</button><button id="runBatch" class="primary-button" ${current.state === "ANALYZED" ? "" : "disabled"}>Run current batch</button><button id="publish" class="primary-button" ${governance.canPublish() ? "" : "disabled"}>Approve &amp; publish</button></div>
    <p class="boundary-note">In-memory simulation: the first edit after validation creates a new revision and stales all evidence. Conflicts, applicable indeterminate results, and batch errors block approval.</p>
    ${current.ast ? singleResult() : `<section class="runtime-panel"><p class="eyebrow">Draft revision ${current.revision}</p><h3>Validation required</h3><p>Regenerate or edit the DSL, then validate it before deterministic preview, impact analysis, or approval.</p></section>`}${batch ? renderBatch() : ""}
    <details><summary>Revision, evidence, and release history</summary><pre>${escapeHtml(JSON.stringify({ revisions: governance.revisions, releases: governance.releaseHistory, evidence: governance.evidence }, null, 2))}</pre></details></div>`;
  $("#resultSection").classList.remove("hidden");
}

function setScenario(id) {
  selected = id;
  resetState();
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
  const scenario = event.target.closest(".scenario");
  if (scenario) setScenario(scenario.dataset.scenario);
  if (event.target.closest("#generatePrompt")) { $("#promptOutput").textContent = promptText(); $("#promptSection").classList.remove("hidden"); setProgress(2); }
  if (event.target.closest("#simulateResponse")) { const sourceDsl = formatRule(scenarios[selected].ast, { root: "customer" }); $("#dslInput").value = sourceDsl; updateDraft({ sourceDsl, ast: null }); $("#editorSection").classList.remove("hidden"); setProgress(3); }
  if (event.target.closest("#validateButton")) {
    try {
      if (governance.current.state !== "DRAFT") throw new Error("Edit the DSL to create a new draft revision before validating again.");
      const ast = parseRule($("#dslInput").value, registry, { root: "customer" });
      if (ast.id !== governance.current.logicalId) throw new Error(`RULE_ID_MISMATCH\nExpected stable ID ${governance.current.logicalId}; received ${ast.id}.`);
      governance.updateDraft({ ast, sourceDsl: $("#dslInput").value });
      governance.record("validation", { valid: true, ast });
      renderGovernance("Ontology, types, enums, units, and bounded DSL syntax validated for this exact revision.");
      setProgress(3);
    } catch (error) { renderAuthoringError(error); }
  }
  if (event.target.closest("#analyzeEvidence")) {
    try { const analysis = analyzeCandidate(governance.current.ast, activeRuleSet); governance.record("analysis", analysis); renderGovernance(analysis.status === "CONFLICT" ? "Conflict blocks batch progression and publication." : `${analysis.status.replaceAll("_", " ")} against the active release.`); setProgress(4); }
    catch (error) { renderGovernance(error.message); }
  }
  if (event.target.closest("#runBatch")) {
    try {
      const candidateSet = candidateRules();
      const candidateBatch = compareBatch(fixtures, customer => evaluate(customer, activeRuleSet, governance.activeRelease), customer => evaluate(customer, candidateSet, { id: `${governance.activeRelease.id} + candidate r${governance.current.revision}` }));
      governance.record("batch", candidateBatch);
      batch = candidateBatch;
      renderGovernance(candidateBatch.complete ? "Current revision/current release batch passed." : "Batch has blocking errors or applicable indeterminate results.");
    } catch (error) { renderGovernance(error.message); }
  }
  if (event.target.closest("#publish")) {
    try {
      const publishedRules = candidateRules();
      const manifest = { id: nextReleaseId(governance.activeRelease.id), ontologyVersion: "2.0", actionPolicyVersion: "credit-actions-1.0", calculatorVersion: creditPack.calculator.version, rules: publishedRules.map(({ id, revision }) => ({ id, revision })) };
      const next = governance.publish(manifest);
      activeRuleSet = publishedRules;
      renderGovernance(`Approved and published ${next.id}. This full release now drives the session runtime.`);
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
  if (event.target.closest("#resetButton")) setScenario("ratio5");
  const property = event.target.closest("[data-property]");
  if (property) { const id = property.dataset.property, definition = registry.definition(id), value = registry.context(demoCustomer).get(id); $("#dialogTitle").textContent = definition.displayName; $("#dialogBody").textContent = JSON.stringify({ id: `customer.${id}`, ...definition, exampleValue: value }, null, 2); $("#propertyDialog").showModal(); }
  if (event.target.closest(".dialog-close")) $("#propertyDialog").close();
  if (event.target.closest("#runDmnDemo")) { const result = evaluate(demoCustomer, activeRuleSet, governance.activeRelease); $("#dmnDryRunResult").innerHTML = `<div class="decision-result-heading"><div><span>Ontology-backed runtime · ${escapeHtml(result.release.id)}</span><h5>${escapeHtml(result.action.primary.replaceAll("_", " "))}</h5><p>${result.findings.filter(finding => finding.status === "FINDING").length} findings · recommended ${money(result.calculation.recommended)}</p></div></div><pre class="artifact-code">${escapeHtml(JSON.stringify({ action: result.action, calculation: result.calculation, findings: result.findings }, null, 2))}</pre>`; }
});

$("#policyInput").addEventListener("input", () => { updateDraft({ sourcePolicy: $("#policyInput").value, ast: null }); $("#charCount").textContent = `${$("#policyInput").value.length} characters`; if (!$("#resultSection").classList.contains("hidden")) renderGovernance("Business-intent edit created or updated a draft; regenerate and validate its executable DSL."); });
$("#dslInput").addEventListener("input", () => { updateDraft({ sourceDsl: $("#dslInput").value, ast: null }); if (!$("#resultSection").classList.contains("hidden")) renderGovernance("DSL edit created or updated a draft revision; prior evidence is stale."); });
$("#copyPrompt").addEventListener("click", async () => { try { await navigator.clipboard.writeText($("#promptOutput").textContent); showToast("Prompt copied"); } catch { showToast("Select the prompt text to copy"); } });
$("#dmnCustomerObject").textContent = JSON.stringify(demoCustomer, null, 2);
renderOntology();
setScenario("ratio5");
