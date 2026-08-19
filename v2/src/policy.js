import { assessReviewImpact, createEvaluator } from "../../src/core/runtime.js";
import { formatRule, parseRule } from "../../src/core/authoring.js";
import { Governance } from "../../src/core/governance.js";
import {
  activeRules,
  analyzeCandidate,
  compileCandidate,
  narrativeCustomers,
  policyImpactCohort,
  properties,
  registry,
  release,
  reviewPack,
  scenarios
} from "./review-pack.js";
import { actionLabels } from "./context.js";

const STORAGE_KEY = "v2:customer-review:policy-workbench:v1";
const evaluate = createEvaluator(reviewPack);
const scenarioMeta = Object.freeze({
  pastDue8: Object.freeze({ label: "Tighten R2 past-due trigger", detail: "10% → 8% · compatible refinement" }),
  pastDue12: Object.freeze({ label: "Relax R2 past-due trigger", detail: "10% → 12% · compatible relaxation" }),
  adp35: Object.freeze({ label: "Tighten R1 ADP-W", detail: "38 days → 35 days · compatible refinement" }),
  adp40: Object.freeze({ label: "Relax R1 ADP-W", detail: "38 days → 40 days · compatible relaxation" })
});
const policyNames = Object.freeze({
  R1_ADP_W: "R1 · ADP-W threshold",
  R2_LOW_ADP_PLUS_PD: "R2 · Low ADP with delinquent invoices"
});
const stateLabels = Object.freeze({
  DRAFT: "Draft",
  VALIDATED: "Validated",
  ANALYZED: "Compatibility checked",
  BATCH_PASSED: "Impact assessed"
});

const escapeHtml = value => String(value ?? "—").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
const number = value => new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);
const money = value => value == null ? "—" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);

function formatFact(id, value) {
  if (value == null) return "—";
  const definition = registry.definition(id);
  if (definition.format === "CURRENCY") return money(value);
  if (definition.format === "PERCENT") return `${number(value * 100)}%`;
  if (definition.format === "DAYS") return `${number(value)} days`;
  return typeof value === "number" ? number(value) : String(value).replaceAll("_", " ");
}

let selected = "pastDue8";
let governance;
let intentDraft;
let dslDraft;
let narrativeImpact = null;
let notice = "Choose a policy intent, load its candidate, or edit the bounded DSL.";
let draftFeedback = null;
let notifyImpact = () => {};
let nextRevisions;

function resetRevisionSequence(saved = {}) {
  nextRevisions = Object.fromEntries(activeRules.map(rule => {
    const savedRevision = saved?.[rule.id];
    return [rule.id, Number.isInteger(savedRevision) && savedRevision > rule.revision ? savedRevision : rule.revision + 1];
  }));
}

function allocateCandidateRevision(logicalId) {
  if (!Number.isInteger(nextRevisions[logicalId])) throw new Error(`No active logical rule named ${logicalId} can be revised`);
  const revision = nextRevisions[logicalId];
  nextRevisions[logicalId] += 1;
  return revision;
}

function reserveCandidateRevision(logicalId, revision) {
  const active = activeRules.find(rule => rule.id === logicalId);
  if (!active) throw new Error(`No active logical rule named ${logicalId} can be revised`);
  nextRevisions[logicalId] = Math.max(nextRevisions[logicalId] ?? active.revision + 1, revision + 1);
}

function scenarioCandidate(id) {
  const scenario = scenarios[id];
  return {
    logicalId: scenario.logicalId,
    revision: allocateCandidateRevision(scenario.logicalId),
    sourcePolicy: scenario.policy,
    sourceDsl: formatRule(scenario.ast, { root: "customer" }),
    ast: null,
    provenance: "EXAMPLE"
  };
}

function resetToScenario(id = "pastDue8") {
  const candidate = scenarioCandidate(id);
  selected = id;
  governance = new Governance({ activeRelease: release, candidate });
  intentDraft = candidate.sourcePolicy;
  dslDraft = candidate.sourceDsl;
  narrativeImpact = null;
}

function candidateRules() {
  if (!governance.current.ast) throw new Error("Validate the current candidate before deterministic evaluation.");
  const replacement = compileCandidate(governance.current.ast, governance.current.revision);
  return activeRules.map(rule => rule.id === replacement.id ? replacement : rule);
}

function candidateRelease(rules) {
  return {
    id: `${release.id}-candidate-${governance.current.logicalId}-r${governance.current.revision}`,
    ontologyVersion: release.ontologyVersion,
    actionPolicyVersion: release.actionPolicyVersion,
    calculatorVersion: release.calculatorVersion,
    status: "CANDIDATE_PREVIEW",
    rules: rules.map(({ id, revision }) => ({ id, revision }))
  };
}

function impactPayload() {
  if (!narrativeImpact?.complete || !governance.evidence.batch?.complete) return null;
  return {
    activeReleaseId: release.id,
    logicalId: governance.current.logicalId,
    revision: governance.current.revision,
    candidateReleaseId: candidateRelease(candidateRules()).id,
    summary: narrativeImpact.summary,
    rows: narrativeImpact.rows
  };
}

function clearImpact() {
  narrativeImpact = null;
  notifyImpact(null);
}

function persist() {
  const evidence = governance.evidence;
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
    activeReleaseId: release.id,
    nextRevisions: { ...nextRevisions },
    selected,
    intentDraft,
    dslDraft,
    candidate: {
      logicalId: governance.current.logicalId,
      revision: governance.current.revision,
      sourcePolicy: governance.current.sourcePolicy,
      sourceDsl: governance.current.sourceDsl,
      provenance: governance.current.provenance
    },
    stages: {
      validation: Boolean(evidence.validation),
      analysis: Boolean(evidence.analysis),
      impact: Boolean(evidence.batch)
    }
  }));
}

function recordValidation() {
  try {
    const ast = parseRule(governance.current.sourceDsl, registry, { root: "customer" });
    if (ast.id !== governance.current.logicalId) throw new Error(`RULE_ID_MISMATCH\nExpected stable ID ${governance.current.logicalId}; received ${ast.id}.`);
    compileCandidate(ast, governance.current.revision);
    governance.updateDraft({ ast });
    governance.record("validation", { valid: true, ast });
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    governance.record("validation", { valid: false, error: message, category: message.split("\n", 1)[0] });
    return false;
  }
}

function assessCandidateImpact() {
  const rules = candidateRules();
  const previewRelease = candidateRelease(rules);
  const baseline = customer => evaluate(customer, activeRules, release);
  const candidate = customer => evaluate(customer, rules, previewRelease);
  const cohortImpact = assessReviewImpact(policyImpactCohort, baseline, candidate);
  governance.record("batch", cohortImpact);
  narrativeImpact = assessReviewImpact(Object.freeze({ id: "v2-narrative-worklist", records: narrativeCustomers }), baseline, candidate);
  notifyImpact(cohortImpact.complete && narrativeImpact.complete ? impactPayload() : null);
  return cohortImpact;
}

function restore() {
  resetRevisionSequence();
  resetToScenario();
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "null");
    if (!saved) return;
    if (saved.activeReleaseId !== release.id) {
      sessionStorage.removeItem(STORAGE_KEY);
      return;
    }
    if (!saved.candidate || !Number.isInteger(saved.candidate.revision)) throw new Error("Invalid saved candidate");
    const active = activeRules.find(rule => rule.id === saved.candidate.logicalId);
    if (!active || saved.candidate.revision <= active.revision || typeof saved.candidate.sourcePolicy !== "string" || typeof saved.candidate.sourceDsl !== "string") throw new Error("Invalid saved candidate");
    resetRevisionSequence(saved.nextRevisions);
    reserveCandidateRevision(saved.candidate.logicalId, saved.candidate.revision);
    selected = Object.hasOwn(scenarios, saved.selected) ? saved.selected : null;
    intentDraft = typeof saved.intentDraft === "string" ? saved.intentDraft : saved.candidate.sourcePolicy;
    dslDraft = typeof saved.dslDraft === "string" ? saved.dslDraft : saved.candidate.sourceDsl;
    const candidate = {
      logicalId: saved.candidate.logicalId,
      revision: saved.candidate.revision,
      sourcePolicy: saved.candidate.sourcePolicy,
      sourceDsl: saved.candidate.sourceDsl,
      ast: null,
      provenance: ["AI", "HUMAN_EDIT", "EXAMPLE"].includes(saved.candidate.provenance) ? saved.candidate.provenance : "EXAMPLE"
    };
    governance = new Governance({ activeRelease: release, candidate });
    if (!saved.stages?.validation) return;
    if (!recordValidation() || !saved.stages.analysis) return;
    const analysis = analyzeCandidate(governance.current.ast, activeRules);
    governance.record("analysis", analysis);
    if (governance.current.state !== "ANALYZED" || !saved.stages.impact) return;
    assessCandidateImpact();
  } catch {
    resetRevisionSequence();
    resetToScenario();
    sessionStorage.removeItem(STORAGE_KEY);
  }
}

function overallState() {
  if (governance.evidenceComplete()) return "Evidence complete";
  if (governance.evidence.batch && !governance.evidence.batch.complete) return "Impact incomplete";
  if (governance.evidence.analysis?.status === "CONFLICT") return "Conflict";
  if (governance.evidence.analysis?.status === "INDETERMINATE") return "Analysis indeterminate";
  if (governance.evidence.validation?.valid === false) return "Validation blocked";
  return stateLabels[governance.current.state] || "Draft";
}

function normalizedScope(scope) {
  return scope.map(item => ({ fact: item.fact, op: item.op, value: item.value, unit: item.unit || registry.definition(item.fact)?.unit || null }));
}

function scopeText(scope) {
  return normalizedScope(scope).map(item => `${item.fact} ${item.op} ${item.value}${item.unit ? ` ${item.unit}` : ""}`).join(" AND ") || "ALL";
}

function structuredDiff() {
  const current = governance.current;
  const active = activeRules.find(rule => rule.id === current.logicalId);
  try {
    const ast = current.ast || parseRule(current.sourceDsl, registry, { root: "customer" });
    if (ast.id !== current.logicalId) throw new Error(`Expected stable ID ${current.logicalId}; received ${ast.id}.`);
    const candidate = compileCandidate(ast, current.revision);
    const ratio = candidate.constraint.type === "SET_MAX_RATIO";
    const display = value => ratio ? `${number(value * 100)}% of accounts receivable` : `${number(value)} ${candidate.constraint.unit}`;
    const direction = candidate.constraint.value === active.constraint.value
      ? "Unchanged threshold"
      : candidate.constraint.value < active.constraint.value ? "Lower threshold · tightening" : "Higher threshold · relaxation";
    const activeScope = JSON.stringify(normalizedScope(active.scope).sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right))));
    const candidateScope = JSON.stringify(normalizedScope(candidate.scope).sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right))));
    return `<div class="policy-diff-identity"><b>${escapeHtml(current.logicalId)}</b><span>Active revision ${active.revision} → candidate revision ${current.revision}</span></div>
      <dl class="policy-diff">
        <div><dt>Scope</dt><dd><small>Active</small>${escapeHtml(scopeText(active.scope))}<small>Candidate</small>${escapeHtml(scopeText(candidate.scope))}<strong>${activeScope === candidateScope ? "Unchanged scope" : "Changed scope"}</strong></dd></div>
        <div><dt>Threshold / effect</dt><dd><del>${escapeHtml(display(active.constraint.value))}</del><span class="diff-arrow">→</span><ins>${escapeHtml(display(candidate.constraint.value))}</ins><strong>${escapeHtml(direction)}</strong></dd></div>
        <div><dt>Policy statement</dt><dd><small>Active</small>${escapeHtml(active.policy.statement)}<small>Candidate</small>${escapeHtml(candidate.policy.statement)}</dd></div>
      </dl>`;
  } catch (error) {
    return `<p class="policy-error" role="alert"><b>Candidate diff unavailable.</b> ${escapeHtml(error instanceof Error ? error.message : String(error))}</p>`;
  }
}

function evidenceCard(kind, title, description, button) {
  const evidence = governance.evidence[kind];
  let status = "Not run";
  let detail = description;
  if (kind === "validation" && evidence) {
    status = evidence.valid ? "Passed" : "Blocked";
    detail = evidence.valid ? "Bounded DSL, stable ID, ontology properties, datatypes, units, and supported family passed." : evidence.error;
  } else if (kind === "analysis" && evidence) {
    status = evidence.status === "CONFLICT" ? "Blocked · conflict" : evidence.status === "INDETERMINATE" ? "Indeterminate" : "Passed";
    detail = `${evidence.status.replaceAll("_", " ")} · ${evidence.summary}`;
  } else if (kind === "batch" && evidence) {
    status = evidence.complete ? "Passed" : "Incomplete";
    detail = evidence.headline;
  }
  return `<article class="policy-evidence-card ${evidence ? status.startsWith("Passed") ? "passed" : status.startsWith("Blocked") ? "blocked" : "" : ""}">
    <div><span>${escapeHtml(title)}</span><b>${escapeHtml(status)}</b></div>
    <p>${escapeHtml(detail)}</p>
    ${evidence ? `<small>Candidate revision ${evidence.revision} · baseline ${escapeHtml(evidence.releaseId)}</small>` : `<button class="btn ${button.enabled ? "adjust" : "ghost"}" data-policy-action="${button.action}" ${button.enabled ? "" : "disabled"}>${escapeHtml(button.label)}</button>`}
  </article>`;
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
  const keyFacts = logicalId === "R1_ADP_W"
    ? ["adp_w_90d", "weighted_terms_days", "payment_terms", "ar_balance", "past_due_amount", "past_due_ratio"]
    : ["payment_terms", "ar_balance", "past_due_amount", "past_due_ratio", "open_invoices_over_39_days", "adp_w_90d"];
  const factList = ids => `<dl class="impact-fact-grid">${ids.map(id => `<div><dt>${escapeHtml(registry.definition(id).displayName)}</dt><dd>${escapeHtml(formatFact(id, context.get(id)))}</dd></div>`).join("")}</dl>`;
  const boundary = logicalId === "R1_ADP_W"
    ? `This record tests ${formatFact("adp_w_90d", context.get("adp_w_90d"))} ADP-W against the active and candidate thresholds.`
    : `This record tests a ${formatFact("past_due_ratio", context.get("past_due_ratio"))} past-due ratio for a ${formatFact("payment_terms", context.get("payment_terms"))} customer with old open invoices.`;
  let outcome;
  if (row.error) {
    outcome = `<p class="impact-callout"><b>Evaluation could not complete.</b> This record is included so the input and failure remain inspectable.</p>`;
  } else {
    const rules = candidateRules();
    const activeResult = evaluate(record, activeRules, release);
    const candidateResult = evaluate(record, rules, candidateRelease(rules));
    const activeRule = activeRules.find(rule => rule.id === logicalId);
    const candidateRule = rules.find(rule => rule.id === logicalId);
    const actionChanged = row.baselineAction !== row.candidateAction;
    const findingChanged = row.addedFindings.length || row.resolvedFindings.length;
    const impact = actionChanged
      ? `The candidate changes the recommended review action from ${actionLabels[row.baselineAction] || row.baselineAction} to ${actionLabels[row.candidateAction] || row.candidateAction}.`
      : findingChanged
        ? `The recommended review action remains ${actionLabels[row.candidateAction] || row.candidateAction}, but the candidate changes the policy findings.`
        : `The candidate produces no change for this record; the recommended action remains ${actionLabels[row.candidateAction] || row.candidateAction}.`;
    outcome = `<div class="impact-comparison" role="region" aria-label="Active and candidate policy comparison"><table><thead><tr><th></th><th>Active policy</th><th>Candidate policy</th></tr></thead><tbody><tr><th>Threshold</th><td>${escapeHtml(policyThreshold(activeRule))}</td><td>${escapeHtml(policyThreshold(candidateRule))}</td></tr><tr><th>Policy result</th><td>${escapeHtml(policyOutcome(activeResult, logicalId))}</td><td>${escapeHtml(policyOutcome(candidateResult, logicalId))}</td></tr><tr><th>Review action</th><td>${escapeHtml(actionLabels[row.baselineAction] || row.baselineAction)}</td><td>${escapeHtml(actionLabels[row.candidateAction] || row.candidateAction)}</td></tr></tbody></table></div><p class="impact-callout"><b>Candidate impact:</b> ${escapeHtml(impact)}</p>`;
  }
  const groupedInputs = Object.entries(properties).filter(([id]) => !["customer_number", "name"].includes(id)).reduce((groups, [id, definition]) => ((groups[definition.group] ||= []).push(id), groups), {});
  return `<p class="impact-fictional">Fictional boundary record · Customer ${record.customer_number}</p><p>${escapeHtml(boundary)}</p><section class="impact-section"><h4>Policy-relevant facts</h4>${factList(keyFacts)}</section><section class="impact-section"><h4>Dry-run outcome</h4>${outcome}</section><details class="impact-inputs"><summary>All input facts</summary>${Object.entries(groupedInputs).map(([group, ids]) => `<section><h4>${escapeHtml(group)}</h4>${factList(ids)}</section>`).join("")}</details><details><summary>Technical fixture details</summary><pre>${escapeHtml(JSON.stringify(record, null, 2))}</pre></details>`;
}

function impactResults() {
  const impact = governance.evidence.batch;
  if (!impact) return "";
  const previewReleaseId = candidateRelease(candidateRules()).id;
  const summary = impact.summary;
  const metrics = [
    ["Cohort records", summary.evaluated],
    ["Newly required reviews", summary.newlyRequiredReviews],
    ["Reviews cleared", summary.reviewsCleared],
    ["Changed primary actions", summary.changedPrimaryActions],
    ["Added findings", summary.addedFindings],
    ["Resolved findings", summary.resolvedFindings]
  ];
  const rows = impact.changedRows.map(row => row.error
    ? `<tr><td><button class="policy-impact-record" data-policy-impact-record="${row.customerId}">${escapeHtml(row.label)}<small>#${row.customerId}</small></button></td><td colspan="3">${escapeHtml(row.error)}</td></tr>`
    : `<tr><td><button class="policy-impact-record" data-policy-impact-record="${row.customerId}"><b>${escapeHtml(row.label)}</b><small>#${row.customerId}</small></button></td><td>${escapeHtml(actionLabels[row.baselineAction] || row.baselineAction)}</td><td>${escapeHtml(actionLabels[row.candidateAction] || row.candidateAction)}</td><td>${row.addedFindings.length ? `Added: ${row.addedFindings.map(escapeHtml).join(", ")}` : ""}${row.addedFindings.length && row.resolvedFindings.length ? " · " : ""}${row.resolvedFindings.length ? `Resolved: ${row.resolvedFindings.map(escapeHtml).join(", ")}` : ""}</td></tr>`).join("");
  return `<section class="section policy-impact-results" id="policyImpactResults" tabindex="-1">
    <div class="s-h">Review impact · deterministic candidate preview <span class="policy-state ${impact.complete ? "pass" : "warn"}">${impact.complete ? "Complete" : "Incomplete"}</span></div>
    <div class="s-b">
      <h3>${escapeHtml(impact.headline)}</h3>
      <p>Candidate evidence is pinned to ${escapeHtml(governance.current.logicalId)}@${governance.current.revision}, preview release ${escapeHtml(previewReleaseId)}, and baseline ${escapeHtml(release.id)}.</p>
      <div class="policy-metrics">${metrics.map(([label, value]) => `<div><small>${escapeHtml(label)}</small><b>${escapeHtml(value)}</b></div>`).join("")}</div>
      ${rows ? `<div class="policy-impact-table"><table><thead><tr><th>Boundary record</th><th>Active action</th><th>Candidate action</th><th>Finding changes</th></tr></thead><tbody>${rows}</tbody></table></div>` : `<p>No boundary records changed.</p>`}
    </div>
    <dialog class="fact-dialog impact-dialog" id="policyImpactDialog" aria-labelledby="policyImpactDialogTitle">
      <button class="dialog-close" aria-label="Close boundary record" onclick="this.closest('dialog').close()">×</button>
      <div class="env">POLICY UPDATE DRY RUN</div>
      <h3 id="policyImpactDialogTitle"></h3>
      <div id="policyImpactDialogBody"></div>
    </dialog>
  </section>`;
}

function render(focusSelector = null) {
  const container = document.getElementById("policyWorkbench");
  const current = governance.current;
  const validationReady = current.state === "DRAFT";
  const analysisReady = current.state === "VALIDATED" && !governance.evidence.analysis;
  const impactReady = current.state === "ANALYZED" && !governance.evidence.batch;
  const provenance = current.provenance === "AI" ? "AI-drafted candidate" : current.provenance === "HUMAN_EDIT" ? "Human-edited candidate" : "Preconfigured candidate";
  const hasUnappliedEdits = intentDraft !== current.sourcePolicy || dslDraft !== current.sourceDsl;
  container.innerHTML = `<div class="wrap policy-wrap">
    <div class="dbanner policy-banner">
      <div class="dtop">
        <div><span class="policy-eyebrow">Policy Change workbench</span><h2 id="policyWorkbenchTitle" tabindex="-1">${escapeHtml(policyNames[current.logicalId] || current.logicalId)}</h2><p>Stable ID ${escapeHtml(current.logicalId)} · candidate revision ${current.revision} · ${escapeHtml(provenance)}</p></div>
        <div class="spacer"></div>
        <span class="policy-state">${escapeHtml(overallState())}</span>
        <button class="hbtn" data-policy-action="close">Back to worklist</button>
      </div>
      <div class="policy-baseline-grid">
        <div><span>Active policy version</span><b>${escapeHtml(release.id)}</b><small>Authoritative active baseline</small></div>
        <div><span>Candidate</span><b>${escapeHtml(current.logicalId)}@${current.revision}</b><small>Preview · pending approval</small></div>
        <div><span>Authority boundary</span><b>AI drafts; controls assess</b><small>People and CIS retain approval and state authority</small></div>
      </div>
    </div>

    <div class="policy-grid">
      <section class="panel policy-intents">
        <div class="p-h"><span class="t">1 · Policy intents</span></div>
        <div class="p-b">
          <p>Select a bounded policy intent. Selection does not replace the current candidate until you load it.</p>
          <div class="policy-scenarios">${Object.entries(scenarioMeta).map(([id, meta]) => `<button data-policy-scenario="${id}" aria-pressed="${selected === id}"><b>${escapeHtml(meta.label)}</b><span>${escapeHtml(meta.detail)}</span></button>`).join("")}</div>
          <label class="policy-field"><span>Business intent</span><textarea id="policyIntent" maxlength="1200">${escapeHtml(intentDraft)}</textarea></label>
          <div class="dactions">
            <button class="btn ghost" data-policy-action="example" ${selected ? "" : "disabled"}>Load candidate</button>
          </div>
          ${draftFeedback ? `<div class="policy-draft-feedback ${draftFeedback.tone || ""}" id="policyDraftStatus" role="status" tabindex="-1"><b>${escapeHtml(draftFeedback.title)}</b><p>${escapeHtml(draftFeedback.message)}</p></div>` : ""}
        </div>
      </section>

      <section class="panel policy-candidate">
        <div class="p-h"><span class="t">2 · Structured policy diff</span><div class="spacer"></div><span class="policy-state">${escapeHtml(current.state === "DRAFT" ? "Unvalidated" : "Validated")}</span></div>
        <div class="p-b">
          <div id="policyStructuredDiff">${structuredDiff()}</div>
          <details class="policy-editor" open>
            <summary>Edit bounded candidate source</summary>
            <label class="policy-field"><span>Candidate DSL</span><textarea id="policyDsl" spellcheck="false">${escapeHtml(dslDraft)}</textarea></label>
            <p id="policyEditStatus">${hasUnappliedEdits ? "Unapplied edits · run Apply & validate to create deterministic evidence for a new revision." : "Edits create a new candidate revision when validation runs."}</p>
          </details>
          <div class="dactions"><button class="btn primary" data-policy-action="validate">Apply &amp; validate candidate</button></div>
        </div>
      </section>
    </div>

    <section class="section policy-evidence">
      <div class="s-h">3 · Deterministic evidence sequence <span>Validation → compatibility → review impact</span></div>
      <div class="s-b"><div class="policy-evidence-grid">
        ${evidenceCard("validation", "Validation", "Run parser, ontology, datatype, unit, stable-ID, and supported-family checks.", { action: "validate", label: "Validate candidate", enabled: validationReady })}
        ${evidenceCard("analysis", "Compatibility", governance.evidence.validation?.valid === false ? "Fix and validate a new candidate revision first." : "Validation must pass first.", { action: "analyze", label: "Check compatibility", enabled: analysisReady })}
        ${evidenceCard("batch", "Review impact", governance.evidence.analysis?.status === "CONFLICT" ? "Blocked because the candidate conflicts with the active policy." : "A non-blocking compatibility result is required first.", { action: "impact", label: "Assess review impact", enabled: impactReady })}
      </div></div>
    </section>

    <div class="policy-notice" id="policyNotice" role="status" tabindex="-1">${escapeHtml(notice)}</div>
    ${impactResults()}
  </div>`;
  if (focusSelector && !document.body.classList.contains("auth-locked")) container.querySelector(focusSelector)?.focus();
}

function captureInputs() {
  intentDraft = document.getElementById("policyIntent")?.value ?? intentDraft;
  dslDraft = document.getElementById("policyDsl")?.value ?? dslDraft;
}

function applyDraftInputs() {
  const current = governance.current;
  if (intentDraft === current.sourcePolicy && dslDraft === current.sourceDsl) return;
  clearImpact();
  const changes = { sourcePolicy: intentDraft, sourceDsl: dslDraft, ast: null, provenance: "HUMAN_EDIT" };
  if (current.state !== "DRAFT" || Object.keys(governance.evidence).length) {
    governance.edit(changes);
    reserveCandidateRevision(governance.current.logicalId, governance.current.revision);
  } else governance.updateDraft(changes);
}

function validateCandidate() {
  captureInputs();
  applyDraftInputs();
  if (governance.current.state !== "DRAFT") {
    notice = "This exact candidate revision is already validated. Edit the intent or DSL to create a new draft revision.";
    return false;
  }
  const valid = recordValidation();
  notice = valid
    ? "Deterministic validation passed for this exact candidate revision. Compatibility can now be checked."
    : `Validation blocked: ${governance.evidence.validation.error}`;
  return valid;
}

function useExampleCandidate() {
  if (!selected) return;
  const candidate = scenarioCandidate(selected);
  candidate.sourcePolicy = intentDraft;
  governance = new Governance({ activeRelease: release, candidate });
  dslDraft = candidate.sourceDsl;
  clearImpact();
  draftFeedback = { title: "Candidate loaded", message: "The candidate is unvalidated. Review the structured diff, then run deterministic validation." };
  notice = "Candidate loaded as a draft. No active policy or customer state changed.";
}

function handleAction(action) {
  captureInputs();
  if (action === "close") return document.dispatchEvent(new CustomEvent("v2-policy-close"));
  let focusSelector = "#policyNotice";
  if (action === "example") {
    useExampleCandidate();
    focusSelector = '.policy-candidate [data-policy-action="validate"]';
  }
  if (action === "validate" && validateCandidate()) focusSelector = '[data-policy-action="analyze"]:enabled';
  if (action === "analyze") {
    try {
      const analysis = analyzeCandidate(governance.current.ast, activeRules);
      governance.record("analysis", analysis);
      notice = analysis.status === "CONFLICT" ? `Compatibility blocked: ${analysis.summary}` : `${analysis.status.replaceAll("_", " ")}: ${analysis.summary}`;
      if (governance.current.state === "ANALYZED") focusSelector = '[data-policy-action="impact"]:enabled';
    } catch (error) {
      notice = error instanceof Error ? error.message : String(error);
    }
  }
  if (action === "impact") {
    try {
      const impact = assessCandidateImpact();
      notice = impact.complete ? "Deterministic review-impact assessment complete." : "Impact assessment incomplete; no definitive worklist badges were applied.";
      if (impact.complete) focusSelector = "#policyImpactResults";
    } catch (error) {
      notice = error instanceof Error ? error.message : String(error);
    }
  }
  persist();
  render(focusSelector);
}

export function createPolicyWorkbench({ onOpen, onClose, onImpactAssessed }) {
  notifyImpact = onImpactAssessed;
  restore();
  notifyImpact(impactPayload());
  render();

  const configureButton = document.getElementById("configureRulesButton");
  configureButton.addEventListener("click", () => {
    render();
    onOpen();
    document.getElementById("policyWorkbenchTitle")?.focus();
  });
  document.addEventListener("v2-policy-close", () => {
    onClose();
    configureButton.focus();
  });
  document.getElementById("policyWorkbench").addEventListener("click", event => {
    const impactRecordButton = event.target.closest("[data-policy-impact-record]");
    if (impactRecordButton) {
      const customerId = Number(impactRecordButton.dataset.policyImpactRecord);
      const record = policyImpactCohort.records.find(item => item.customer_number === customerId);
      const row = governance.evidence.batch?.rows.find(item => item.customerId === customerId);
      const dialog = document.getElementById("policyImpactDialog");
      if (record && row && dialog) {
        document.getElementById("policyImpactDialogTitle").textContent = record.name;
        document.getElementById("policyImpactDialogBody").innerHTML = renderImpactRecord(record, row);
        dialog.showModal();
      }
      return;
    }
    const scenario = event.target.closest("[data-policy-scenario]");
    if (scenario) {
      captureInputs();
      selected = scenario.dataset.policyScenario;
      intentDraft = scenarios[selected].policy;
      draftFeedback = { title: "Policy intent selected", message: "Load the candidate or edit the bounded DSL. The current candidate is unchanged." };
      notice = "Intent selected; the current candidate and its evidence remain unchanged until replaced.";
      persist();
      render(`[data-policy-scenario="${selected}"]`);
      return;
    }
    const action = event.target.closest("[data-policy-action]")?.dataset.policyAction;
    if (!action) return;
    handleAction(action);
  });
  document.getElementById("policyWorkbench").addEventListener("input", event => {
    if (!event.target.matches("#policyIntent, #policyDsl")) return;
    captureInputs();
    const status = document.getElementById("policyEditStatus");
    if (status) status.textContent = "Unapplied edits · run Apply & validate to create deterministic evidence for a new revision.";
    persist();
  });
}
