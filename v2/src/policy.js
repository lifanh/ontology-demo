import { assessReviewImpact, createEvaluator } from "../../src/core/runtime.js";
import { formatRule, parseRule } from "../../src/core/authoring.js";
import { Governance } from "../../src/core/governance.js";
import {
  activeRules,
  analyzeCandidate,
  compileCandidate,
  creditPack,
  narrativeCustomers,
  policyImpactCohort,
  registry,
  release,
  scenarios
} from "../../src/domains/credit/pack.js";
import { actionLabels } from "./context.js";

const STORAGE_KEY = "v2:customer-review:policy-workbench:v1";
const evaluate = createEvaluator(creditPack);
const scenarioMeta = Object.freeze({
  ratio5: Object.freeze({ label: "Tighten NET 30 past due", detail: "8% → 5% · compatible refinement" }),
  ratio15: Object.freeze({ label: "Relax NET 30 past due", detail: "8% → 15% · conflict example" }),
  adp20: Object.freeze({ label: "Tighten high-balance ADP", detail: "25 days → 20 days · compatible refinement" }),
  adp45: Object.freeze({ label: "Relax high-balance ADP", detail: "25 days → 45 days · conflict example" })
});
const policyNames = Object.freeze({
  NET30_PAST_DUE_MAX: "NET 30 past-due limit",
  HIGH_BALANCE_ADP_MAX: "High-balance payment limit"
});
const stateLabels = Object.freeze({
  DRAFT: "Draft",
  VALIDATED: "Validated",
  ANALYZED: "Compatibility checked",
  BATCH_PASSED: "Impact assessed"
});

const escapeHtml = value => String(value ?? "—").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
const number = value => new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);

let selected = "ratio5";
let governance;
let intentDraft;
let dslDraft;
let narrativeImpact = null;
let notice = "Choose an example intent, use its example candidate, or edit the bounded DSL.";
let draftFeedback = null;
let draftRequestVersion = 0;
let draftPending = false;
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

function resetToScenario(id = "ratio5") {
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
    ? `<tr><td>${escapeHtml(row.label)}</td><td colspan="3">${escapeHtml(row.error)}</td></tr>`
    : `<tr><td><b>${escapeHtml(row.label)}</b><small>#${row.customerId}</small></td><td>${escapeHtml(actionLabels[row.baselineAction] || row.baselineAction)}</td><td>${escapeHtml(actionLabels[row.candidateAction] || row.candidateAction)}</td><td>${row.addedFindings.length ? `Added: ${row.addedFindings.map(escapeHtml).join(", ")}` : ""}${row.addedFindings.length && row.resolvedFindings.length ? " · " : ""}${row.resolvedFindings.length ? `Resolved: ${row.resolvedFindings.map(escapeHtml).join(", ")}` : ""}</td></tr>`).join("");
  const narrativeChanges = narrativeImpact?.changedRows.filter(row => !row.error && !row.indeterminate).length || 0;
  const narrativeResult = !narrativeImpact?.complete
    ? "The narrative worklist comparison is incomplete, so no preview badges are shown."
    : narrativeChanges
      ? `${narrativeChanges} of ${narrativeCustomers.length} accounts have changed findings or review paths and are badged in the worklist.`
      : "No findings or review paths change for accounts 2001–2004.";
  return `<section class="section policy-impact-results" id="policyImpactResults" tabindex="-1">
    <div class="s-h">Review impact · deterministic candidate preview <span class="policy-state ${impact.complete ? "pass" : "warn"}">${impact.complete ? "Complete" : "Incomplete"}</span></div>
    <div class="s-b">
      <h3>${escapeHtml(impact.headline)}</h3>
      <p><b>Fixed fictional boundary cohort—not a production portfolio, forecast, or workload estimate.</b> Candidate evidence is pinned to ${escapeHtml(governance.current.logicalId)}@${governance.current.revision}, preview release ${escapeHtml(previewReleaseId)}, and baseline ${escapeHtml(release.id)}.</p>
      <div class="policy-metrics">${metrics.map(([label, value]) => `<div><small>${escapeHtml(label)}</small><b>${escapeHtml(value)}</b></div>`).join("")}</div>
      ${rows ? `<div class="policy-impact-table"><table><thead><tr><th>Boundary record</th><th>Active action</th><th>Candidate action</th><th>Finding changes</th></tr></thead><tbody>${rows}</tbody></table></div>` : `<p>No boundary records changed.</p>`}
      <div class="policy-worklist-result"><b>Narrative worklist preview:</b> ${narrativeResult} This separate deterministic comparison does not project boundary-cohort results onto worklist accounts.</div>
      ${governance.evidenceComplete() ? `<div class="policy-boundary"><b>Evidence complete for this candidate revision.</b> Governed review, approval, publication, and activation happen outside this POC. The candidate remains a preview and does not change the active policy or customer state.</div>` : ""}
    </div>
  </section>`;
}

function render(focusSelector = null) {
  const container = document.getElementById("policyWorkbench");
  const current = governance.current;
  const validationReady = current.state === "DRAFT";
  const analysisReady = current.state === "VALIDATED" && !governance.evidence.analysis;
  const impactReady = current.state === "ANALYZED" && !governance.evidence.batch;
  const aiEnabled = document.documentElement.dataset.aiEnabled === "true";
  const provenance = current.provenance === "AI" ? "AI-drafted candidate" : current.provenance === "HUMAN_EDIT" ? "Human-edited candidate" : "Example candidate";
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
        <div><span>Active policy version</span><b>${escapeHtml(release.id)}</b><small>Authoritative baseline for this POC</small></div>
        <div><span>Candidate</span><b>${escapeHtml(current.logicalId)}@${current.revision}</b><small>Preview only · never activated here</small></div>
        <div><span>Authority boundary</span><b>AI drafts; controls assess</b><small>People and CIS retain approval and state authority</small></div>
      </div>
    </div>

    <div class="policy-grid">
      <section class="panel policy-intents">
        <div class="p-h"><span class="t">1 · Example policy intents</span></div>
        <div class="p-b">
          <p>Select an illustrative bounded intent. Selection does not replace the current candidate until you draft or load its example candidate.</p>
          <div class="policy-scenarios">${Object.entries(scenarioMeta).map(([id, meta]) => `<button data-policy-scenario="${id}" aria-pressed="${selected === id}"><b>${escapeHtml(meta.label)}</b><span>${escapeHtml(meta.detail)}</span></button>`).join("")}</div>
          <label class="policy-field"><span>Business intent</span><textarea id="policyIntent" maxlength="1200">${escapeHtml(intentDraft)}</textarea></label>
          <div class="dactions">
            <button class="btn adjust" id="policyDraftButton" data-policy-action="draft" ${aiEnabled && !draftPending ? "" : `disabled${aiEnabled ? "" : ' title="AI drafting is unavailable in deterministic-only mode"'}`}>Draft with AI</button>
            <button class="btn ghost" data-policy-action="example" ${selected ? "" : "disabled"}>Use example candidate</button>
          </div>
          <p class="policy-mode-note">${aiEnabled ? "AI drafting uses the shared GitHub Copilot gateway. The result remains an unvalidated draft." : "Deterministic-only mode: use an example candidate or edit the bounded DSL manually. No model calls are made."}</p>
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
  draftFeedback = { title: "Example candidate loaded", message: "The candidate is unvalidated. Review the structured diff, then run deterministic validation." };
  notice = "Example candidate loaded as a draft. No active policy or customer state changed.";
}

async function draftWithAi() {
  captureInputs();
  const policyBuffer = intentDraft;
  const policyText = policyBuffer.trim();
  if (!policyText) {
    draftFeedback = { title: "Draft unavailable", message: "Enter a business intent first.", tone: "error" };
    render("#policyDraftStatus");
    return;
  }
  const version = ++draftRequestVersion;
  draftPending = true;
  draftFeedback = { title: "Drafting with GitHub Copilot…", message: "AI is drafting within the two supported policy families." };
  render("#policyDraftStatus");
  try {
    const response = await fetch("/api/ai/draft_rule", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ schemaVersion: "1", policyText, activeReleaseId: release.id })
    });
    const payload = await response.json();
    if (response.status === 401) window.dispatchEvent(new Event("demo-auth-required"));
    if (!response.ok) throw new Error(`${payload.error?.message || "Drafting failed"}${payload.error?.correlationId ? ` · ${payload.error.correlationId}` : ""}`);
    const liveIntent = document.getElementById("policyIntent")?.value ?? policyBuffer;
    if (version !== draftRequestVersion || liveIntent !== policyBuffer) throw new Error("The intent changed while drafting. Retry against the current intent.");
    const result = payload.result;
    if (result.outcome === "CANDIDATE") {
      const active = activeRules.find(rule => rule.id === result.family);
      if (!active) throw new Error("The drafted rule family is not present in the active policy.");
      governance = new Governance({
        activeRelease: release,
        candidate: {
          logicalId: result.family,
          revision: allocateCandidateRevision(result.family),
          sourcePolicy: policyBuffer,
          sourceDsl: result.dsl,
          ast: null,
          provenance: "AI"
        }
      });
      dslDraft = result.dsl;
      selected = Object.entries(scenarios).find(([, scenario]) => scenario.logicalId === result.family && formatRule(scenario.ast, { root: "customer" }) === result.dsl)?.[0] || null;
      clearImpact();
      draftFeedback = { title: "AI-drafted candidate", message: `${result.summary} Deterministic validation has not run.` };
      notice = "AI drafted source only. Review the diff and run deterministic validation before compatibility or impact assessment.";
    } else if (result.outcome === "NEEDS_CLARIFICATION") {
      draftFeedback = { title: "Needs clarification", message: `${result.question} Missing: ${result.missingFields.join(", ")}.` };
    } else {
      draftFeedback = { title: "Unsupported intent", message: result.summary, tone: "error" };
    }
  } catch (error) {
    if (version !== draftRequestVersion) return;
    draftFeedback = { title: "Draft unavailable", message: error instanceof Error ? error.message : "Drafting failed.", tone: "error" };
  }
  draftPending = false;
  persist();
  render("#policyDraftStatus");
}

function invalidatePendingDraft() {
  if (!draftPending) return;
  draftRequestVersion += 1;
  draftPending = false;
  draftFeedback = { title: "Draft outdated", message: "The intent or source changed while drafting. Draft again against the current edits." };
}

function handleAction(action) {
  invalidatePendingDraft();
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
    const scenario = event.target.closest("[data-policy-scenario]");
    if (scenario) {
      invalidatePendingDraft();
      captureInputs();
      selected = scenario.dataset.policyScenario;
      intentDraft = scenarios[selected].policy;
      draftFeedback = { title: "Example intent selected", message: "Draft it with AI or load the deterministic example candidate. The current candidate is unchanged." };
      notice = "Intent selected; the current candidate and its evidence remain unchanged until replaced.";
      persist();
      render(`[data-policy-scenario="${selected}"]`);
      return;
    }
    const action = event.target.closest("[data-policy-action]")?.dataset.policyAction;
    if (!action) return;
    if (action === "draft") draftWithAi();
    else handleAction(action);
  });
  document.getElementById("policyWorkbench").addEventListener("input", event => {
    if (!event.target.matches("#policyIntent, #policyDsl")) return;
    captureInputs();
    if (draftPending) {
      invalidatePendingDraft();
      const feedback = document.querySelector(".policy-draft-feedback");
      if (feedback) feedback.innerHTML = `<b>${escapeHtml(draftFeedback.title)}</b><p>${escapeHtml(draftFeedback.message)}</p>`;
      const draftButton = document.getElementById("policyDraftButton");
      if (draftButton && document.documentElement.dataset.aiEnabled === "true") draftButton.disabled = false;
    }
    const status = document.getElementById("policyEditStatus");
    if (status) status.textContent = "Unapplied edits · run Apply & validate to create deterministic evidence for a new revision.";
    persist();
  });
}
