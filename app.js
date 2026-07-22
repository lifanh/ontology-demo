const {
  DecisionEngineError,
  evaluateDecisionTable,
  formatCondition,
  validateDecisionTable
} = window.DecisionEngine;

const facts = {
  evidence_state: {
    displayName: "Evidence state",
    type: "enum",
    values: ["complete", "conflicting", "missing"],
    required: true,
    description: "Whether the source evidence needed for this review is complete, internally conflicting, or missing."
  },
  adp_days: {
    displayName: "Average Days to Pay",
    shortName: "ADP",
    type: "integer",
    unit: "calendar days",
    nullable: true,
    minimum: 0,
    description: "Average number of calendar days between invoice issuance and payment. The standard maximum is inclusive: 30 passes and 31 fails."
  },
  exception_status: {
    displayName: "Exception status",
    type: "enum",
    values: ["valid", "invalid", "absent"],
    required: true,
    description: "Whether an approved exception is valid, invalid, or absent. Below the ADP threshold, an exception is not required."
  },
  risk_level: {
    displayName: "Risk level",
    type: "enum",
    values: ["low", "medium", "high"],
    required: true,
    description: "Normalized customer risk used for escalation. High risk always requires manual review when evidence is complete."
  }
};

function condition(fact, operator, value, display) {
  const result = { fact, operator };
  if (value !== undefined) result.value = value;
  if (display) result.display = display;
  return result;
}

const dispositions = {
  approve: { label: "Approve", tone: "approve" },
  approve_with_exception: { label: "Approve with exception", tone: "exception" },
  request_information: { label: "Request information", tone: "information" },
  manual_review: { label: "Manual review", tone: "review" },
  reject: { label: "Reject", tone: "reject" }
};

const decisionContract = { facts, dispositions };

const decisionTable = {
  id: "CUSTOMER-ELIGIBILITY-001",
  version: 1,
  name: "Customer eligibility review",
  hitPolicy: "FIRST",
  facts,
  dispositions,
  assumptions: [
    "Average Days to Pay is measured in calendar days.",
    "The standard maximum is inclusive: 30 days passes and 31 days fails.",
    "Conflicting or missing evidence takes precedence over customer-level conditions.",
    "All evidence in this demo is synthetic and fixture-backed."
  ],
  rows: [
    {
      id: "ROW-1",
      priority: 1,
      conditions: [
        condition("evidence_state", "equals", "conflicting"),
        condition("adp_days", "any"),
        condition("exception_status", "any"),
        condition("risk_level", "any")
      ],
      disposition: "manual_review",
      summary: "The source documents contain conflicting ADP values. The engine cannot select one as authoritative, so the customer requires manual review.",
      nextAction: "Reconcile the conflicting payment-history sources before making a customer decision.",
      findings: [{
        criterion: "Evidence consistency",
        fact: "evidence_state",
        result: "indeterminate",
        observedLabel: "Documents report 28 and 42 days",
        required: "One consistent ADP value",
        decisionEffect: "requires_manual_review",
        group: "unresolved"
      }]
    },
    {
      id: "ROW-2",
      priority: 2,
      conditions: [
        condition("evidence_state", "equals", "missing"),
        condition("adp_days", "any"),
        condition("exception_status", "any"),
        condition("risk_level", "any")
      ],
      disposition: "request_information",
      summary: "Average Days to Pay is unavailable in the supplied evidence. The review cannot be completed until that information is provided.",
      nextAction: "Request an updated payment-history extract containing Average Days to Pay.",
      findings: [{
        criterion: "Evidence completeness",
        fact: "evidence_state",
        result: "indeterminate",
        observedLabel: "ADP unavailable",
        required: "Complete evidence including ADP",
        decisionEffect: "requires_information",
        group: "unresolved"
      }]
    },
    {
      id: "ROW-3",
      priority: 3,
      conditions: [
        condition("evidence_state", "equals", "complete"),
        condition("adp_days", "gt", 30),
        condition("exception_status", "in", ["absent", "invalid"]),
        condition("risk_level", "any")
      ],
      disposition: "reject",
      summary: "The customer's ADP is {{adp_days}} days, exceeding the standard maximum by {{adp_days_overage}} days. No valid exception applies, so the customer is rejected.",
      nextAction: "Reject the customer review or obtain an approved exception before reassessment.",
      findings: [
        {
          criterion: "Standard ADP threshold",
          fact: "adp_days",
          result: "violated",
          required: "≤ 30 calendar days",
          decisionEffect: "blocks_approval",
          group: "blocking"
        },
        {
          criterion: "Approved exception",
          fact: "exception_status",
          result: "violated",
          required: "Valid when ADP exceeds 30 days",
          decisionEffect: "does_not_compensate",
          group: "blocking"
        }
      ]
    },
    {
      id: "ROW-4",
      priority: 4,
      conditions: [
        condition("evidence_state", "equals", "complete"),
        condition("adp_days", "any"),
        condition("exception_status", "any"),
        condition("risk_level", "equals", "high")
      ],
      disposition: "manual_review",
      summary: "The evidence is complete, but customer risk is high. A credit reviewer must assess the case before a final disposition is made.",
      nextAction: "Escalate the case to a credit reviewer with the complete evidence packet.",
      findings: [{
        criterion: "Customer risk",
        fact: "risk_level",
        result: "violated",
        required: "Low or medium for automatic approval",
        decisionEffect: "requires_manual_review",
        group: "blocking"
      }]
    },
    {
      id: "ROW-5",
      priority: 5,
      conditions: [
        condition("evidence_state", "equals", "complete"),
        condition("adp_days", "gt", 30),
        condition("exception_status", "equals", "valid"),
        condition("risk_level", "in", ["low", "medium"])
      ],
      disposition: "approve_with_exception",
      summary: "The customer's ADP is {{adp_days}} days, exceeding the standard maximum by {{adp_days_overage}} days. A valid approved exception applies, the evidence is complete, and customer risk is low or medium. The customer can be approved with the exception recorded.",
      nextAction: "If approved outside this demo, record the exception with the customer review.",
      findings: [
        {
          criterion: "Standard ADP threshold",
          fact: "adp_days",
          result: "condition_not_met",
          required: "≤ 30 calendar days",
          decisionEffect: "compensated_by_exception",
          group: "compensated"
        },
        {
          criterion: "Approved exception",
          fact: "exception_status",
          result: "satisfied",
          required: "Valid",
          decisionEffect: "permits_approval",
          group: "compensated"
        }
      ]
    },
    {
      id: "ROW-6",
      priority: 6,
      conditions: [
        condition("evidence_state", "equals", "complete"),
        condition("adp_days", "lte", 30),
        condition("exception_status", "any", undefined, "Not required"),
        condition("risk_level", "in", ["low", "medium"])
      ],
      disposition: "approve",
      summary: "The customer's ADP is {{adp_days}} days, satisfying the inclusive 30-day maximum. The evidence is complete and customer risk is low or medium.",
      nextAction: "Continue the normal approval process outside this demo.",
      findings: [
        {
          criterion: "Standard ADP threshold",
          fact: "adp_days",
          result: "satisfied",
          required: "≤ 30 calendar days",
          decisionEffect: "permits_approval",
          group: "advisory"
        },
        {
          criterion: "Approved exception",
          fact: "exception_status",
          result: "not_applicable",
          required: "Not required at or below 30 days",
          decisionEffect: "none",
          group: "advisory"
        }
      ]
    }
  ]
};

function buildSyntheticEvidence(inputs, adpEvidence) {
  const adpEntries = adpEvidence || [{
    fact: "adp_days",
    source: "Synthetic payment history extract",
    location: "Trailing 12-month payment summary",
    value: inputs.adp_days,
    note: inputs.adp_days === null ? "No ADP value was present in the fixture." : "Calculated fixture value."
  }];
  return [
    {
      fact: "evidence_state",
      source: "Synthetic review packet",
      location: "Document checklist",
      value: inputs.evidence_state,
      note: "Fixture-backed evidence status; no documents were uploaded."
    },
    ...adpEntries,
    {
      fact: "exception_status",
      source: "Synthetic exception register",
      location: inputs.exception_status === "valid" ? "Exception EX-204" : "Customer exception lookup",
      value: inputs.exception_status,
      note: inputs.exception_status === "valid" ? "Fixture marks the exception as approved and in force." : "Fixture contains no valid approved exception."
    },
    {
      fact: "risk_level",
      source: "Synthetic risk profile",
      location: "Current customer risk band",
      value: inputs.risk_level,
      note: "Fixture-backed risk classification."
    }
  ];
}

function createScenario(id, label, description, expected, customer, inputs, adpEvidence) {
  return {
    id,
    label,
    description,
    expected,
    customer,
    inputs,
    evidence: buildSyntheticEvidence(inputs, adpEvidence)
  };
}

const scenarios = [
  createScenario(
    "standard-approval",
    "Standard approval",
    "ADP 24 · complete evidence · medium risk",
    "Approve",
    { id: "DEMO-101", name: "Northstar Supply" },
    { evidence_state: "complete", adp_days: 24, exception_status: "absent", risk_level: "medium" }
  ),
  createScenario(
    "approved-exception",
    "Approved exception",
    "ADP 42 · valid exception · medium risk",
    "Approve with exception",
    { id: "DEMO-104", name: "Demo Customer" },
    { evidence_state: "complete", adp_days: 42, exception_status: "valid", risk_level: "medium" }
  ),
  createScenario(
    "no-exception",
    "No exception",
    "ADP 42 · no valid exception",
    "Reject",
    { id: "DEMO-107", name: "Harborline Goods" },
    { evidence_state: "complete", adp_days: 42, exception_status: "absent", risk_level: "medium" }
  ),
  createScenario(
    "conflicting-evidence",
    "Conflicting evidence",
    "Documents report ADP 28 and 42",
    "Manual review",
    { id: "DEMO-112", name: "Atlas Components" },
    { evidence_state: "conflicting", adp_days: null, exception_status: "valid", risk_level: "medium" },
    [
      { fact: "adp_days", source: "Synthetic aging report", location: "Payment summary", value: 28, note: "First fixture source." },
      { fact: "adp_days", source: "Synthetic account statement", location: "Customer metrics", value: 42, note: "Conflicts with the aging report." }
    ]
  ),
  createScenario(
    "missing-adp",
    "Missing ADP",
    "ADP unavailable in the evidence packet",
    "Request information",
    { id: "DEMO-118", name: "Cedar Works" },
    { evidence_state: "missing", adp_days: null, exception_status: "absent", risk_level: "low" }
  ),
  createScenario(
    "high-risk",
    "High risk",
    "ADP 24 · complete evidence · high risk",
    "Manual review",
    { id: "DEMO-123", name: "Summit Industrial" },
    { evidence_state: "complete", adp_days: 24, exception_status: "absent", risk_level: "high" }
  )
];

const defaultPolicy = "Evaluate customer eligibility in priority order. Conflicting evidence requires manual review. Missing evidence requires more information. ADP above 30 calendar days without a valid exception is rejected. High risk requires manual review. ADP above 30 days with a valid exception and low or medium risk may be approved with the exception. Complete evidence, ADP at or below 30 days, and low or medium risk may be approved.";

const els = {
  policy: document.querySelector("#policyInput"),
  charCount: document.querySelector("#charCount"),
  promptSection: document.querySelector("#promptSection"),
  promptOutput: document.querySelector("#promptOutput"),
  draftSection: document.querySelector("#draftSection"),
  draftInput: document.querySelector("#draftInput"),
  validationSection: document.querySelector("#validationSection"),
  validationContent: document.querySelector("#validationContent"),
  reviewSection: document.querySelector("#reviewSection"),
  tablePreview: document.querySelector("#tablePreview"),
  assumptionList: document.querySelector("#assumptionList"),
  reviewStatus: document.querySelector("#reviewStatus"),
  reviewButton: document.querySelector("#reviewButton"),
  dryRunSection: document.querySelector("#dryRunSection"),
  scenarioGrid: document.querySelector("#scenarioGrid"),
  customerPreview: document.querySelector("#customerPreview"),
  resultSection: document.querySelector("#resultSection"),
  sidebarFacts: document.querySelector("#sidebarFacts"),
  sidebarCustomer: document.querySelector("#sidebarCustomer"),
  toast: document.querySelector("#toast"),
  progressLine: document.querySelector("#progressLine")
};

let selectedScenarioId = "approved-exception";
let validatedTable = null;
let draftReviewed = false;
let toastTimer = null;

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[character]);
}

function humanize(value) {
  return String(value).replaceAll("_", " ").replace(/\b\w/g, character => character.toUpperCase());
}

function formatFactValue(fact, value, inputs = {}) {
  if (value === null || value === undefined || value === "") {
    if (fact === "adp_days" && inputs.evidence_state === "conflicting") return "Conflicting values";
    return "Unavailable";
  }
  if (fact === "adp_days") return `${value} calendar days`;
  return humanize(value);
}

function getSelectedScenario() {
  return scenarios.find(scenario => scenario.id === selectedScenarioId);
}

function setProgress(step) {
  document.querySelectorAll(".track-step").forEach((element, index) => {
    element.classList.toggle("active", index < step);
    element.setAttribute("aria-current", index === step - 1 ? "step" : "false");
  });
  els.progressLine.style.width = `${((step - 1) / 4) * 100}%`;
}

function reveal(element, shouldScroll = true) {
  element.classList.remove("hidden");
  if (shouldScroll) setTimeout(() => element.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
}

function hideAfterDraft() {
  [els.validationSection, els.reviewSection, els.dryRunSection, els.resultSection].forEach(element => element.classList.add("hidden"));
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  els.toast.textContent = message;
  els.toast.classList.add("show");
  toastTimer = window.setTimeout(() => els.toast.classList.remove("show"), 2200);
}

function updateCount() {
  els.charCount.textContent = `${els.policy.value.length} characters`;
}

function factsForPrompt() {
  return Object.entries(facts).map(([key, fact]) => {
    const details = [`- ${key}: ${fact.type}`];
    if (fact.unit) details.push(`unit=${fact.unit}`);
    if (fact.values) details.push(`values=${fact.values.join("|")}`);
    if (fact.nullable) details.push("nullable=true");
    return details.join("; ");
  }).join("\n");
}

function makePrompt() {
  return `You translate a business policy into a constrained, auditable decision-table JSON draft.
The draft is untrusted until a deterministic validator accepts it and a human reviews it.
Do not execute the policy, assess a customer, invent facts, or output private reasoning.
Return one JSON object only, with no Markdown fences or prose.

ALLOWED FACTS
${factsForPrompt()}

FACT DEFINITIONS JSON
${JSON.stringify(facts, null, 2)}

DISPOSITION DEFINITIONS JSON
${JSON.stringify(decisionTable.dispositions, null, 2)}

ALLOWED CONTRACT
- hitPolicy must be "FIRST". Rows execute in ascending numeric priority.
- Every row must contain exactly one condition for every allowed fact.
- Operators: equals, in, gt, gte, lt, lte, missing, present, any.
- any is an explicit wildcard, not an AI judgment.
- Dispositions: approve, approve_with_exception, request_information, manual_review, reject.
- Finding results: satisfied, violated, condition_not_met, indeterminate, not_applicable, error.
- Finding groups: blocking, compensated, advisory, unresolved.
- Each row requires: id, priority, conditions, disposition, summary, nextAction, findings.
- Each finding requires: criterion, fact, result, required, decisionEffect, group.
- Include an assumptions array and explain missing-data behavior through explicit rows.
- Keep the raw ADP threshold result separate from its decision effect. A 42-day ADP does not satisfy a 30-day threshold even when a valid exception compensates for it.
- Treat ADP as calendar days. Exactly 30 passes; 31 fails unless another higher-priority row applies.
- The table must cover conflicting evidence, missing evidence, no valid exception, high risk, valid exception, and standard approval.

TOP-LEVEL JSON KEYS
id, version, name, hitPolicy, facts, dispositions, assumptions, rows

Use the fact and disposition definitions exactly as supplied above. IDs must be stable uppercase tokens. Summary placeholders may reference {{adp_days}} and {{adp_days_overage}}.

BUSINESS POLICY
${els.policy.value.trim()}`;
}

function renderSidebarFacts() {
  els.sidebarFacts.innerHTML = Object.entries(facts).map(([key, fact]) => `
    <button class="fact-row" data-fact="${escapeHtml(key)}">
      <span class="fact-icon" aria-hidden="true">${fact.type === "integer" ? "#" : "Aa"}</span>
      <span><strong>${escapeHtml(fact.displayName)}</strong><small>${escapeHtml(fact.type)}${fact.unit ? ` · ${escapeHtml(fact.unit)}` : ` · ${fact.values.length} values`}</small></span>
      <span class="required-dot" aria-label="${fact.required ? "Required" : "Conditionally available"}"></span>
    </button>
  `).join("");
}

function renderSidebarCustomer() {
  const scenario = getSelectedScenario();
  const initials = scenario.customer.name.split(/\s+/).map(part => part[0]).join("").slice(0, 2);
  els.sidebarCustomer.innerHTML = `
    <div class="sample-head">
      <span class="avatar">${escapeHtml(initials)}</span>
      <div><strong>${escapeHtml(scenario.customer.name)}</strong><small>${escapeHtml(scenario.customer.id)}</small></div>
      <span class="synthetic-chip">Synthetic</span>
    </div>
    <dl>
      ${Object.entries(facts).map(([key, fact]) => `<div><dt>${escapeHtml(fact.shortName || fact.displayName)}</dt><dd>${escapeHtml(formatFactValue(key, scenario.inputs[key], scenario.inputs))}</dd></div>`).join("")}
    </dl>
  `;
}

function scenarioButtons() {
  return scenarios.map(scenario => `
    <button class="scenario${scenario.id === selectedScenarioId ? " active" : ""}" data-scenario="${escapeHtml(scenario.id)}" aria-pressed="${scenario.id === selectedScenarioId}">
      <span><strong>${escapeHtml(scenario.label)}</strong><small>${escapeHtml(scenario.description)}</small></span>
      <em>${escapeHtml(scenario.expected)}</em>
    </button>
  `).join("");
}

function renderScenarioPicker() {
  els.scenarioGrid.innerHTML = scenarioButtons();
}

function renderCustomerPreview() {
  const scenario = getSelectedScenario();
  els.customerPreview.innerHTML = `
    <div>
      <p class="eyebrow">Selected fixture</p>
      <h3>${escapeHtml(scenario.customer.name)} <span>${escapeHtml(scenario.customer.id)}</span></h3>
    </div>
    <div class="preview-facts">
      ${Object.entries(facts).map(([key, fact]) => `<div><span>${escapeHtml(fact.shortName || fact.displayName)}</span><strong>${escapeHtml(formatFactValue(key, scenario.inputs[key], scenario.inputs))}</strong></div>`).join("")}
    </div>
    <p class="synthetic-notice"><b>Synthetic demo evidence</b> — no customer data was uploaded or transmitted.</p>
  `;
}

function traceStateLabel(status) {
  return ({
    matched: "✓ Matched",
    not_matched: "× Did not match",
    wildcard: "— Any / not evaluated",
    not_evaluated: "— Not evaluated"
  })[status] || "";
}

function renderDecisionTable(table, trace = []) {
  const factNames = Object.keys(table.facts);
  const traceByRow = new Map(trace.map(row => [row.rowId, row]));
  const rows = [...table.rows].sort((left, right) => left.priority - right.priority);
  return `
    <div class="decision-table-wrap">
      <table class="decision-table">
        <caption>${escapeHtml(table.name || table.id)} · ${escapeHtml(table.hitPolicy)} hit policy</caption>
        <thead>
          <tr><th scope="col">Priority</th>${factNames.map(fact => `<th scope="col">${escapeHtml(table.facts[fact].shortName || table.facts[fact].displayName || fact)}</th>`).join("")}<th scope="col">Disposition</th></tr>
        </thead>
        <tbody>
          ${rows.map(row => {
            const rowTrace = traceByRow.get(row.id);
            const rowClass = rowTrace ? ` trace-${rowTrace.status}` : "";
            return `<tr class="${rowClass.trim()}">
              <th scope="row"><span class="priority-number">${row.priority}</span><small>${escapeHtml(row.id)}</small>${rowTrace?.status === "selected" ? `<b class="selected-row-badge">Selected row</b>` : ""}</th>
              ${factNames.map(fact => {
                const rowCondition = row.conditions.find(item => item.fact === fact);
                const conditionTrace = rowTrace?.conditions.find(item => item.fact === fact);
                const state = conditionTrace?.status || "";
                return `<td class="${state ? `condition-${state}` : ""}"><strong>${escapeHtml(formatCondition(rowCondition, table.facts[fact]))}</strong>${state ? `<small>${escapeHtml(traceStateLabel(state))}</small>` : ""}</td>`;
              }).join("")}
              <td><span class="disposition-chip tone-${escapeHtml(table.dispositions[row.disposition].tone)}">${escapeHtml(table.dispositions[row.disposition].label)}</span></td>
            </tr>`;
          }).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderValidation(report, table) {
  const warningMarkup = report.warnings.length ? `
    <div class="validation-note warning-note">
      <strong>${report.warnings.length} priority-dependent overlap${report.warnings.length === 1 ? "" : "s"}</strong>
      <p>These overlaps are explicit under FIRST hit policy; the higher-priority row wins.</p>
      <ul>${report.warnings.map(warning => `<li>${escapeHtml(warning.message)}</li>`).join("")}</ul>
    </div>` : "";
  els.validationContent.innerHTML = `
    <div class="validation-head success">
      <span class="status-icon" aria-hidden="true">✓</span>
      <div><p class="eyebrow">Deterministic validation</p><h2>Valid decision table</h2><p>${escapeHtml(table.id)} v${table.version} is structurally valid and ready for human review.</p></div>
    </div>
    <div class="validation-grid">
      <ul class="check-list">
        <li>✓ FIRST hit policy recognized</li>
        <li>✓ ${Object.keys(table.facts).length} typed facts validated</li>
        <li>✓ ${table.rows.length} priorities and outputs validated</li>
        <li>✓ Operators and enum values constrained</li>
        <li>✓ Duplicate and obviously unreachable rows rejected</li>
      </ul>
      ${warningMarkup}
    </div>
  `;
}

function renderValidationError(error, issues = []) {
  const details = issues.length ? `<ul>${issues.map(issue => `<li><code>${escapeHtml(issue.path || issue.code)}</code> ${escapeHtml(issue.message)}</li>`).join("")}</ul>` : "";
  els.validationContent.innerHTML = `
    <div class="validation-head error">
      <span class="status-icon" aria-hidden="true">!</span>
      <div><p class="eyebrow">Deterministic validation</p><h2>Invalid decision table</h2><p>${escapeHtml(error)}</p></div>
    </div>
    ${details ? `<div class="validation-errors">${details}</div>` : ""}
  `;
}

function renderReview(table) {
  els.tablePreview.innerHTML = renderDecisionTable(table);
  els.assumptionList.innerHTML = table.assumptions.map(assumption => `<li>${escapeHtml(assumption)}</li>`).join("");
  els.reviewStatus.textContent = "Awaiting human review";
  els.reviewStatus.className = "review-status pending";
  els.reviewButton.disabled = false;
  els.reviewButton.innerHTML = `Mark reviewed for dry run <span>→</span>`;
}

function findingValue(value) {
  if (value === null || value === undefined || value === "") return "Unavailable";
  if (typeof value === "number") return String(value);
  return humanize(value);
}

function renderEvidence(result, table) {
  return Object.entries(table.facts).map(([key, fact]) => {
    const evidence = result.evidence.filter(item => item.fact === key);
    return `<details class="evidence-card">
      <summary>
        <span><small>${escapeHtml(fact.shortName || fact.displayName || key)}</small><strong>${escapeHtml(formatFactValue(key, result.inputs[key], result.inputs))}</strong></span>
        <em>Synthetic evidence</em>
      </summary>
      <div class="evidence-detail">
        ${evidence.length ? evidence.map(item => `<article><div><span>Source</span><b>${escapeHtml(item.source)}</b></div><div><span>Location</span><b>${escapeHtml(item.location)}</b></div><div><span>Value</span><b>${escapeHtml(findingValue(item.value))}</b></div>${item.note ? `<p>${escapeHtml(item.note)}</p>` : ""}</article>`).join("") : `<p>No evidence fixture is attached to this fact.</p>`}
      </div>
    </details>`;
  }).join("");
}

function boundaryLabel(table) {
  const standardCondition = table.rows
    .flatMap(row => row.conditions)
    .find(condition => condition.fact === "adp_days" && condition.operator === "lte" && typeof condition.value === "number");
  return standardCondition
    ? `${standardCondition.value} days passes · ${standardCondition.value + 1} fails`
    : "Inspect configured boundaries";
}

function renderFindings(findings) {
  const groups = [
    ["blocking", "Blocking"],
    ["compensated", "Compensated"],
    ["advisory", "Advisory"],
    ["unresolved", "Unresolved"]
  ];
  return groups.map(([key, label]) => {
    const items = findings.filter(finding => finding.group === key);
    return `<section class="finding-group group-${key}">
      <div class="finding-group-head"><h4>${label}</h4><span>${items.length}</span></div>
      ${items.length ? items.map(finding => `<article>
        <div><strong>${escapeHtml(finding.criterion)}</strong><span class="finding-result">${escapeHtml(humanize(finding.result))}</span></div>
        <dl><div><dt>Observed</dt><dd>${escapeHtml(findingValue(finding.observed))}</dd></div><div><dt>Required</dt><dd>${escapeHtml(finding.required)}</dd></div><div><dt>Decision effect</dt><dd><code>${escapeHtml(finding.decisionEffect)}</code></dd></div></dl>
      </article>`).join("") : `<p class="empty-group">No ${label.toLowerCase()} findings.</p>`}
    </section>`;
  }).join("");
}

function renderDryRunResult(result, table) {
  els.resultSection.innerHTML = `
    <article class="disposition-card tone-${escapeHtml(result.dispositionTone)}">
      <div class="disposition-icon" aria-hidden="true">${result.disposition === "reject" ? "×" : result.disposition === "approve" || result.disposition === "approve_with_exception" ? "✓" : "!"}</div>
      <div class="disposition-copy">
        <div class="disposition-meta"><span>Deterministic dry-run result</span><b>${escapeHtml(result.matchedRow.id)} · Priority ${result.matchedRow.priority}</b></div>
        <h2>${escapeHtml(result.dispositionLabel)}</h2>
        <p>${escapeHtml(result.summary)}</p>
      </div>
      <div class="dry-run-banner"><strong>Dry run — no changes saved</strong><span>${escapeHtml(result.sideEffects.message)}</span></div>
      <div class="next-action"><span>Recommended next action</span><strong>${escapeHtml(result.nextAction)}</strong></div>
    </article>

    <section class="result-block" aria-labelledby="inputsTitle">
      <div class="result-heading"><div><p class="eyebrow">Inputs and provenance</p><h3 id="inputsTitle">Normalized inputs and evidence</h3></div><span class="boundary-chip">${escapeHtml(boundaryLabel(table))}</span></div>
      <div class="evidence-grid">${renderEvidence(result, table)}</div>
    </section>

    <section class="result-block" aria-labelledby="traceTitle">
      <div class="result-heading"><div><p class="eyebrow">Deterministic execution</p><h3 id="traceTitle">Decision-table execution trace</h3></div><span class="hit-policy-chip">F · FIRST hit</span></div>
      <p class="section-intro">Rows above the selected row show why they failed. Rows below it were not evaluated after the first match.</p>
      ${renderDecisionTable(table, result.trace)}
    </section>

    <section class="result-block" aria-labelledby="findingsTitle">
      <div class="result-heading"><div><p class="eyebrow">Policy effects</p><h3 id="findingsTitle">Findings</h3></div></div>
      <p class="section-intro">Raw condition outcomes remain separate from their decision effects.</p>
      <div class="findings-grid">${renderFindings(result.findings)}</div>
    </section>
  `;
  reveal(els.resultSection, false);
}

function renderExecutionError(error) {
  const code = error instanceof DecisionEngineError ? error.code : "EXECUTION_ERROR";
  els.resultSection.innerHTML = `<div class="execution-error"><p class="eyebrow">Deterministic execution failed</p><h2>${escapeHtml(code)}</h2><p>${escapeHtml(error.message)}</p><strong>No disposition was produced.</strong></div>`;
  reveal(els.resultSection, false);
}

function runDryRun(shouldScroll = true) {
  if (!validatedTable || !draftReviewed) return;
  const scenario = getSelectedScenario();
  renderSidebarCustomer();
  renderScenarioPicker();
  renderCustomerPreview();
  try {
    const result = evaluateDecisionTable(validatedTable, scenario.inputs, {
      customer: scenario.customer,
      evidence: scenario.evidence,
      contract: decisionContract
    });
    renderDryRunResult(result, validatedTable);
    if (shouldScroll) setTimeout(() => els.resultSection.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  } catch (error) {
    renderExecutionError(error);
  }
}

function invalidateDraft() {
  validatedTable = null;
  draftReviewed = false;
  hideAfterDraft();
  setProgress(3);
}

document.querySelector("#generatePrompt").addEventListener("click", () => {
  els.promptOutput.textContent = makePrompt();
  reveal(els.promptSection);
  setProgress(2);
});

document.querySelector("#copyPrompt").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(els.promptOutput.textContent);
    showToast("Prompt copied to clipboard");
  } catch {
    showToast("Select the prompt text to copy");
  }
});

document.querySelector("#simulateResponse").addEventListener("click", () => {
  els.draftInput.value = JSON.stringify(decisionTable, null, 2);
  invalidateDraft();
  reveal(els.draftSection);
  setProgress(3);
});

document.querySelector("#validateButton").addEventListener("click", () => {
  draftReviewed = false;
  validatedTable = null;
  [els.reviewSection, els.dryRunSection, els.resultSection].forEach(element => element.classList.add("hidden"));
  try {
    const parsed = JSON.parse(els.draftInput.value);
    const report = validateDecisionTable(parsed, decisionContract);
    reveal(els.validationSection);
    if (!report.valid) {
      renderValidationError("The structured draft does not satisfy the constrained table contract.", report.errors);
      setProgress(3);
      return;
    }
    validatedTable = parsed;
    renderValidation(report, parsed);
    renderReview(parsed);
    reveal(els.reviewSection, false);
    setProgress(4);
  } catch (error) {
    reveal(els.validationSection);
    renderValidationError(`The draft is not valid JSON: ${error.message}`);
    setProgress(3);
  }
});

els.reviewButton.addEventListener("click", () => {
  if (!validatedTable) return;
  draftReviewed = true;
  els.reviewStatus.textContent = "Reviewed for this demo dry run";
  els.reviewStatus.className = "review-status reviewed";
  els.reviewButton.disabled = true;
  els.reviewButton.textContent = "Draft reviewed";
  renderScenarioPicker();
  renderCustomerPreview();
  reveal(els.dryRunSection);
  setProgress(5);
  runDryRun(false);
});

document.querySelector("#runDryRunButton").addEventListener("click", () => runDryRun(true));

document.addEventListener("click", event => {
  const scenarioButton = event.target.closest("[data-scenario]");
  if (scenarioButton) {
    selectedScenarioId = scenarioButton.dataset.scenario;
    renderSidebarCustomer();
    renderScenarioPicker();
    renderCustomerPreview();
    if (draftReviewed) runDryRun(false);
    return;
  }

  const factButton = event.target.closest("[data-fact]");
  if (factButton) {
    const key = factButton.dataset.fact;
    const fact = facts[key];
    document.querySelector("#dialogTitle").textContent = fact.displayName;
    document.querySelector("#dialogBody").textContent = `${key}\n\n${fact.description}\n\n${JSON.stringify(fact, null, 2)}\n\nSupported operators: equals, in, gt, gte, lt, lte, missing, present, any`;
    document.querySelector("#factDialog").showModal();
  }
});

els.policy.addEventListener("input", () => {
  updateCount();
  if (!els.promptSection.classList.contains("hidden")) els.promptOutput.textContent = makePrompt();
});

els.draftInput.addEventListener("input", invalidateDraft);

document.querySelector("#resetButton").addEventListener("click", () => {
  selectedScenarioId = "approved-exception";
  validatedTable = null;
  draftReviewed = false;
  els.policy.value = defaultPolicy;
  els.draftInput.value = "";
  [els.promptSection, els.draftSection, els.validationSection, els.reviewSection, els.dryRunSection, els.resultSection].forEach(element => element.classList.add("hidden"));
  renderSidebarCustomer();
  renderScenarioPicker();
  updateCount();
  setProgress(1);
  window.scrollTo({ top: 0, behavior: "smooth" });
});

const dialog = document.querySelector("#factDialog");
document.querySelector(".dialog-close").addEventListener("click", () => dialog.close());
dialog.addEventListener("click", event => { if (event.target === dialog) dialog.close(); });

els.policy.value = defaultPolicy;
renderSidebarFacts();
renderSidebarCustomer();
renderScenarioPicker();
updateCount();
setProgress(1);
