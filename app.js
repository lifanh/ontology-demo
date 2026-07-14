const ontology = {
  customer_id: { displayName: "Customer ID", type: "string", required: true, description: "Stable identifier for a customer business object." },
  name: { displayName: "Customer Name", type: "string", required: true, description: "Legal or operating name of the customer." },
  current_balance: { displayName: "Current Balance", type: "decimal", unit: "USD", minimum: 0, description: "Total current customer receivable balance." },
  ar_balance: { displayName: "AR Balance", type: "decimal", unit: "USD", minimum: 0, description: "Accounts receivable balance used for exposure ratios." },
  past_due_amount: { displayName: "Past Due Amount", type: "decimal", unit: "USD", minimum: 0, description: "Receivables currently beyond their due date." },
  adp_days: { displayName: "Average Days to Pay", type: "integer", unit: "DAYS", minimum: 0, description: "Average number of days between invoice issuance and payment." },
  credit_limit: { displayName: "Credit Limit", type: "decimal", unit: "USD", minimum: 0, description: "Maximum approved credit exposure." },
  segment: { displayName: "Customer Segment", type: "enum", values: ["STANDARD", "STRATEGIC", "ENTERPRISE"], description: "Commercially assigned customer segment." },
  payment_terms: { displayName: "Payment Terms", type: "enum", values: ["NET_15", "NET_30", "NET_45", "NET_60"], description: "Contractual invoice payment terms." },
  status: { displayName: "Status", type: "enum", values: ["ACTIVE", "INACTIVE", "BLOCKED"], description: "Operational customer status." }
};

const customer = {
  customer_id: "CUST-1001",
  name: "Acme Systems Inc.",
  current_balance: 125000,
  ar_balance: 125000,
  past_due_amount: 15000,
  adp_days: 28,
  credit_limit: 200000,
  segment: "STRATEGIC",
  payment_terms: "NET_30",
  status: "ACTIVE"
};

const scenarios = {
  ratio5: {
    policy: "Customers with NET 30 payment terms cannot have more than 5% of their AR balance past due.",
    dsl: `RULE NET_30_PAST_DUE_RATIO_MAX_5_PERCENT\nSCOPE customer.payment_terms == "NET_30"\nSET_MAX_RATIO customer.past_due_amount\n    TO customer.ar_balance = 0.05\nEND`
  },
  ratio15: {
    policy: "Customers with NET 30 payment terms may have up to 15% of their AR balance past due.",
    dsl: `RULE NET_30_PAST_DUE_RATIO_MAX_15_PERCENT\nSCOPE customer.payment_terms == "NET_30"\nSET_MAX_RATIO customer.past_due_amount\n    TO customer.ar_balance = 0.15\nEND`
  },
  adp45: {
    policy: "For strategic customers with a current balance above $100,000, allow Average Days to Pay up to 45 days.",
    dsl: `RULE STRATEGIC_HIGH_BALANCE_ADP_MAX_45\nSCOPE customer.segment == "STRATEGIC"\n      AND customer.current_balance > 100000 USD\nSET_MAX customer.adp_days = 45 DAYS\nEND`
  }
};

const els = {
  policy: document.querySelector("#policyInput"),
  charCount: document.querySelector("#charCount"),
  promptSection: document.querySelector("#promptSection"),
  promptOutput: document.querySelector("#promptOutput"),
  editorSection: document.querySelector("#editorSection"),
  dsl: document.querySelector("#dslInput"),
  resultSection: document.querySelector("#resultSection"),
  toast: document.querySelector("#toast"),
  progressLine: document.querySelector("#progressLine")
};

let selectedScenario = "ratio5";
let validatedAst = null;

function escapeHtml(value) {
  return String(value).replace(/[&<>"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char]);
}

function formatValue(key, value) {
  const property = ontology[key];
  if (property.unit === "USD") return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
  if (property.unit === "DAYS") return `${value} days`;
  return String(value).replaceAll("_", " ");
}

function renderOntology() {
  const entries = Object.entries(ontology);
  document.querySelector("#ontologyGrid").innerHTML = entries.map(([key, property]) => `
    <button class="ontology-property" data-property="${key}">
      <strong>${escapeHtml(property.displayName)}</strong>
      <small>customer.${key} · ${property.type}${property.unit ? ` · ${property.unit}` : ""}</small>
      <em>${escapeHtml(formatValue(key, customer[key]))}</em>
    </button>`).join("");

  document.querySelector("#sidebarProperties").innerHTML = entries
    .filter(([key]) => !["customer_id", "name"].includes(key))
    .map(([key, property]) => {
      const iconClass = property.unit === "USD" ? "currency" : property.unit === "DAYS" ? "days" : "enum";
      const icon = property.unit === "USD" ? "$" : property.unit === "DAYS" ? "#" : "Aa";
      const detail = property.values ? `enum · ${property.values.length} values` : `${property.type} · ${property.unit || "text"}`;
      return `<button class="property-row" data-property="${key}"><span class="property-icon ${iconClass}">${icon}</span><span><strong>${escapeHtml(property.displayName)}</strong><small>${detail}</small></span><span class="required-dot"></span></button>`;
    }).join("");
}

function ontologyPrompt() {
  return Object.entries(ontology).map(([key, property]) => {
    const metadata = [`customer.${key}`, `- Display name: ${property.displayName}`, `- Type: ${property.type}`];
    if (property.unit) metadata.push(`- Unit: ${property.unit}`);
    if (property.values) metadata.push(`- Allowed values: ${property.values.join(", ")}`);
    return metadata.join("\n");
  }).join("\n");
}

function makePrompt() {
  return `You are a compiler that translates business credit policies into a constrained rule DSL.\nYour job is only to convert the user's business policy into the supported DSL.\nDo not decide whether the rule is correct or conflicts with other rules.\nDo not invent properties. Do not output explanations. Return exactly one DSL rule.\n\nAVAILABLE ONTOLOGY\nObject: customer\n${ontologyPrompt()}\n\nSUPPORTED DSL\nRULE <RULE_ID>\nSCOPE <scope_expression>\n<effect>\nEND\n\nScope operators: == != > >= < <=\nLogical operator: AND\nGlobal scope: SCOPE ALL\nEffects:\nSET_MAX <property> = <value> <unit>\nSET_MIN <property> = <value> <unit>\nSET_MAX_RATIO <numerator_property>\n    TO <denominator_property> = <ratio>\n\nBUSINESS POLICY TO CONVERT\n${els.policy.value.trim()}`;
}

function setProgress(step) {
  document.querySelectorAll(".track-step").forEach((element, index) => element.classList.toggle("active", index < step));
  els.progressLine.style.width = `${((step - 1) / 3) * 100}%`;
}

function reveal(element) {
  element.classList.remove("hidden");
  setTimeout(() => element.scrollIntoView({ behavior: "smooth", block: "center" }), 70);
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  setTimeout(() => els.toast.classList.remove("show"), 1800);
}

function updateCount() {
  els.charCount.textContent = `${els.policy.value.length} characters`;
}

function propertyDefinition(name) {
  const definition = ontology[name];
  if (!definition) {
    const suggestion = name.includes("average") ? "customer.adp_days" : "a property shown in the Customer Ontology";
    throw new Error(`UNKNOWN_PROPERTY\ncustomer.${name} is not defined in the Customer Ontology.\nSuggestion: ${suggestion}`);
  }
  return definition;
}

function parseCondition(text) {
  const match = text.match(/^customer\.([a-z_]+)\s*(==|!=|>=|<=|>|<)\s*(?:"([A-Z0-9_ -]+)"|(-?\d+(?:\.\d+)?)\s*([A-Z]+)?)$/);
  if (!match) throw new Error(`SYNTAX_ERROR\nInvalid scope condition: ${text}`);
  const [, propertyName, operator, stringValue, numericValue, unit] = match;
  const definition = propertyDefinition(propertyName);
  if (stringValue !== undefined) {
    if (definition.type !== "enum" && definition.type !== "string") throw new Error(`TYPE_ERROR\ncustomer.${propertyName} has type ${definition.type.toUpperCase()}. Received STRING.`);
    if (definition.values && !definition.values.includes(stringValue)) throw new Error(`INVALID_ENUM_VALUE\n${stringValue} is not valid for customer.${propertyName}.\nSupported values: ${definition.values.join(", ")}`);
    return { type: "CONDITION", property: `customer.${propertyName}`, operator, value: stringValue };
  }
  if (!["decimal", "integer"].includes(definition.type)) throw new Error(`TYPE_ERROR\ncustomer.${propertyName} is not numeric.`);
  if (definition.unit && unit !== definition.unit) throw new Error(`UNIT_ERROR\ncustomer.${propertyName} requires ${definition.unit}. Received ${unit || "no unit"}.`);
  return { type: "CONDITION", property: `customer.${propertyName}`, operator, value: Number(numericValue), unit };
}

function parseRule(source) {
  const lines = source.trim().split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  if (lines.length < 4) throw new Error("SYNTAX_ERROR\nRule is incomplete.");
  const ruleMatch = lines[0].match(/^RULE\s+([A-Z][A-Z0-9_]*)$/);
  if (!ruleMatch) throw new Error("SYNTAX_ERROR\nLine 1 must contain RULE followed by a valid rule ID.");
  if (lines.at(-1) !== "END") throw new Error("SYNTAX_ERROR\nThe final line must be END.");

  const effectIndex = lines.findIndex(line => /^SET_(MAX_RATIO|MAX|MIN)\b/.test(line));
  if (effectIndex < 2) throw new Error("SYNTAX_ERROR\nExpected one SCOPE and one supported effect.");
  const scopeText = lines.slice(1, effectIndex).join(" ");
  if (!scopeText.startsWith("SCOPE ")) throw new Error("SYNTAX_ERROR\nExpected SCOPE after the RULE declaration.");
  const expression = scopeText.slice(6).trim();
  let scope;
  if (expression === "ALL") {
    scope = { type: "ALL" };
  } else {
    const conditions = expression.split(/\s+AND\s+/).map(parseCondition);
    scope = conditions.length === 1 ? conditions[0] : { type: "AND", conditions };
  }

  const effectLine = lines[effectIndex];
  let effect;
  if (effectLine.startsWith("SET_MAX_RATIO")) {
    const numeratorMatch = effectLine.match(/^SET_MAX_RATIO\s+customer\.([a-z_]+)$/);
    const ratioMatch = lines[effectIndex + 1]?.match(/^TO\s+customer\.([a-z_]+)\s*=\s*(0(?:\.\d+)?|1(?:\.0+)?)$/);
    if (!numeratorMatch || !ratioMatch || effectIndex + 2 !== lines.length - 1) throw new Error("SYNTAX_ERROR\nInvalid SET_MAX_RATIO effect.");
    const numerator = propertyDefinition(numeratorMatch[1]);
    const denominator = propertyDefinition(ratioMatch[1]);
    if (numerator.type !== "decimal" || denominator.type !== "decimal") throw new Error("TYPE_ERROR\nRatio properties must both be decimal values.");
    if (numerator.unit !== denominator.unit) throw new Error(`UNIT_ERROR\nRatio dimensions are incompatible: ${numerator.unit} and ${denominator.unit}.`);
    const value = Number(ratioMatch[2]);
    if (!(value > 0 && value <= 1)) throw new Error("DOMAIN_ERROR\nRatio must be greater than 0 and no more than 1.");
    effect = { type: "SET_MAX_RATIO", numeratorProperty: `customer.${numeratorMatch[1]}`, denominatorProperty: `customer.${ratioMatch[1]}`, value };
  } else {
    const effectMatch = effectLine.match(/^SET_(MAX|MIN)\s+customer\.([a-z_]+)\s*=\s*(-?\d+(?:\.\d+)?)\s+([A-Z]+)$/);
    if (!effectMatch || effectIndex + 1 !== lines.length - 1) throw new Error("SYNTAX_ERROR\nInvalid SET_MAX or SET_MIN effect.");
    const [, kind, propertyName, rawValue, unit] = effectMatch;
    const definition = propertyDefinition(propertyName);
    if (!["decimal", "integer"].includes(definition.type)) throw new Error(`TYPE_ERROR\ncustomer.${propertyName} is not numeric.`);
    if (definition.unit !== unit) throw new Error(`UNIT_ERROR\ncustomer.${propertyName} requires ${definition.unit}. Received ${unit}.`);
    const value = Number(rawValue);
    if (definition.minimum !== undefined && value < definition.minimum) throw new Error(`DOMAIN_ERROR\ncustomer.${propertyName} cannot be below ${definition.minimum}.`);
    effect = { type: `SET_${kind}`, property: `customer.${propertyName}`, value, unit };
  }

  return { id: ruleMatch[1], scope, effect };
}

function scopeLabel(scope) {
  if (scope.type === "ALL") return "ALL CUSTOMERS";
  const conditions = scope.type === "AND" ? scope.conditions : [scope];
  return conditions.map(condition => `${condition.property.replace("customer.", "")} ${condition.operator} ${typeof condition.value === "string" ? condition.value : condition.value.toLocaleString()}${condition.unit ? ` ${condition.unit}` : ""}`).join(" AND ");
}

function analyzeRule(ast) {
  const scopeRelationship = ast.scope.type === "ALL" ? "SCOPES_EQUIVALENT" : "NEW_SCOPE_IS_SUBSET";
  if (ast.effect.type === "SET_MAX_RATIO" && ast.effect.numeratorProperty === "customer.past_due_amount" && ast.effect.denominatorProperty === "customer.ar_balance") {
    const existingValue = 0.10;
    const status = ast.effect.value > existingValue ? "CONFLICT" : ast.effect.value === existingValue ? "REDUNDANT" : "COMPATIBLE_REFINEMENT";
    return {
      status, newRuleId: ast.id, existingRuleId: "GLOBAL_PAST_DUE_RATIO_MAX_10_PERCENT", property: "customer.past_due_amount / customer.ar_balance",
      scopeRelationship, existingLabel: "ALL → Past Due Ratio ≤ 10%", newLabel: `${scopeLabel(ast.scope)} → Past Due Ratio ≤ ${Math.round(ast.effect.value * 100)}%`,
      relationship: status === "CONFLICT" ? `10% < Past Due Ratio ≤ ${Math.round(ast.effect.value * 100)}%` : `${Math.round(ast.effect.value * 100)}% maximum is stricter than 10%`,
      explanation: status === "CONFLICT" ? "The proposed rule permits past-due ratios prohibited by the active global policy." : "Every customer satisfying the proposed maximum also satisfies the active global maximum."
    };
  }
  if (ast.effect.type === "SET_MAX" && ast.effect.property === "customer.adp_days") {
    const existingValue = 30;
    const status = ast.effect.value >= existingValue ? "CONFLICT" : "COMPATIBLE_REFINEMENT";
    return {
      status, newRuleId: ast.id, existingRuleId: "GLOBAL_ADP_MAX_30", property: "customer.adp_days", scopeRelationship,
      existingLabel: "ALL → Average Days to Pay < 30 DAYS", newLabel: `${scopeLabel(ast.scope)} → Average Days to Pay ≤ ${ast.effect.value} DAYS`,
      relationship: status === "CONFLICT" ? `30 ≤ customer.adp_days ≤ ${ast.effect.value} DAYS` : `${ast.effect.value} day maximum is stricter than 30 days`,
      explanation: status === "CONFLICT" ? "The narrower rule permits ADP values that the active global policy prohibits for the same customers." : "The proposed ADP maximum does not permit values prohibited by the active global policy."
    };
  }
  return { status: "NO_CONFLICT", newRuleId: ast.id, existingRuleId: "None", property: ast.effect.property, scopeRelationship, existingLabel: "No active rule affects this relationship", newLabel: scopeLabel(ast.scope), relationship: "No overlapping constraint", explanation: "No active policy constrains the same property in an overlapping scope." };
}

function renderValidation(ast) {
  const scopeConditions = ast.scope.type === "AND" ? ast.scope.conditions.length : ast.scope.type === "ALL" ? 0 : 1;
  els.resultSection.className = "result-section";
  els.resultSection.innerHTML = `<div class="validation-success">
    <div class="validation-success-head"><div class="result-icon">✓</div><div><span class="result-label">Deterministic parser result</span><h2>VALID RULE</h2><p>${escapeHtml(ast.id)} is ready for contradiction analysis.</p></div></div>
    <div class="validation-body">
      <div class="validation-list">
        <div class="check-row"><i>✓</i> Lexical and DSL grammar valid</div>
        <div class="check-row"><i>✓</i> ${scopeConditions || "Global"} scope condition${scopeConditions === 1 ? "" : "s"} normalized</div>
        <div class="check-row"><i>✓</i> All ontology properties exist</div>
        <div class="check-row"><i>✓</i> Value types and enum domains valid</div>
        <div class="check-row"><i>✓</i> Units and dimensions compatible</div>
      </div>
      <details class="ast-details" open><summary>Internal parsed rule (AST)</summary><pre>${escapeHtml(JSON.stringify(ast, null, 2))}</pre></details>
    </div>
    <div class="analyze-bar"><p>Syntax validity does not imply policy compatibility. Compare against both active rules.</p><button class="primary-button" id="analyzeButton">Analyze against existing rules <span>→</span></button></div>
  </div>`;
  reveal(els.resultSection);
  setProgress(3);
}

function renderAnalysis(result, ast) {
  const conflict = result.status === "CONFLICT";
  els.resultSection.className = `result-section${conflict ? " conflict" : ""}`;
  const resolutions = conflict ? `<ol class="resolution-list"><li>Declare an explicit override of ${result.existingRuleId}.</li><li>Narrow the existing global rule to exclude this qualifying scope.</li><li>Change the proposed maximum to comply with the global limit.</li></ol>` : "";
  els.resultSection.innerHTML = `
    <div class="result-hero"><div class="result-icon">${conflict ? "!" : "✓"}</div><div><span class="result-label">Deterministic reasoning result</span><h2>${result.status.replaceAll("_", " ")}</h2><p>${escapeHtml(result.explanation)}</p></div></div>
    <div class="result-grid">
      <div class="result-column"><h3>Rule review</h3><div class="logic-stack">
        <div class="logic-row"><span>Proposed ID</span><code>${escapeHtml(result.newRuleId)}</code></div>
        <div class="logic-row"><span>Compared with</span><code>${escapeHtml(result.existingRuleId)}</code></div>
        <div class="logic-row"><span>Property</span><code>${escapeHtml(result.property)}</code></div>
        <div class="logic-row"><span>Scope</span><code>${escapeHtml(result.scopeRelationship)}</code></div>
      </div>${resolutions}<details class="ast-details"><summary>View validated AST</summary><pre>${escapeHtml(JSON.stringify(ast, null, 2))}</pre></details></div>
      <div class="result-column"><h3>Semantic comparison</h3><div class="logic-stack">
        <div class="logic-row"><span>Existing</span><code>${escapeHtml(result.existingLabel)}</code></div>
        <div class="logic-row"><span>Proposed</span><code>${escapeHtml(result.newLabel)}</code></div>
      </div><div class="relationship"><svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="12"/><circle cx="16" cy="16" r="6"/></svg><div><p class="eyebrow">${conflict ? "Conflicting interval" : "Constraint relationship"}</p><b>${escapeHtml(result.relationship)}</b></div></div></div>
    </div>`;
  reveal(els.resultSection);
  setProgress(4);
}

document.querySelector("#generatePrompt").addEventListener("click", () => {
  els.promptOutput.textContent = makePrompt();
  reveal(els.promptSection);
  setProgress(2);
});

document.querySelector("#copyPrompt").addEventListener("click", async () => {
  try { await navigator.clipboard.writeText(els.promptOutput.textContent); showToast("Prompt copied to clipboard"); }
  catch { showToast("Select the prompt text to copy"); }
});

document.querySelector("#simulateResponse").addEventListener("click", () => {
  els.dsl.value = scenarios[selectedScenario].dsl;
  reveal(els.editorSection);
  setProgress(3);
});

document.querySelector("#validateButton").addEventListener("click", () => {
  try {
    validatedAst = parseRule(els.dsl.value);
    renderValidation(validatedAst);
  } catch (error) {
    validatedAst = null;
    els.resultSection.className = "result-section";
    els.resultSection.innerHTML = `<div class="error-result"><p class="eyebrow">Deterministic validation failed</p><h2>INVALID RULE</h2><pre>${escapeHtml(error.message)}</pre></div>`;
    reveal(els.resultSection);
  }
});

els.resultSection.addEventListener("click", event => {
  if (event.target.closest("#analyzeButton") && validatedAst) renderAnalysis(analyzeRule(validatedAst), validatedAst);
});

document.querySelectorAll(".scenario").forEach(button => button.addEventListener("click", () => {
  selectedScenario = button.dataset.scenario;
  document.querySelectorAll(".scenario").forEach(item => item.classList.toggle("active", item === button));
  els.policy.value = scenarios[selectedScenario].policy;
  validatedAst = null;
  updateCount();
  if (!els.promptSection.classList.contains("hidden")) els.promptOutput.textContent = makePrompt();
  if (!els.editorSection.classList.contains("hidden")) els.dsl.value = scenarios[selectedScenario].dsl;
  els.resultSection.classList.add("hidden");
  setProgress(els.editorSection.classList.contains("hidden") ? 1 : 3);
}));

els.policy.addEventListener("input", updateCount);
els.dsl.addEventListener("input", () => { validatedAst = null; els.resultSection.classList.add("hidden"); });

document.querySelector("#resetButton").addEventListener("click", () => {
  selectedScenario = "ratio5";
  validatedAst = null;
  els.policy.value = scenarios.ratio5.policy;
  els.dsl.value = "";
  document.querySelectorAll(".scenario").forEach(item => item.classList.toggle("active", item.dataset.scenario === "ratio5"));
  [els.promptSection, els.editorSection, els.resultSection].forEach(item => item.classList.add("hidden"));
  updateCount(); setProgress(1); window.scrollTo({ top: 0, behavior: "smooth" });
});

const dialog = document.querySelector("#propertyDialog");
document.addEventListener("click", event => {
  const propertyButton = event.target.closest("[data-property]");
  if (!propertyButton) return;
  const key = propertyButton.dataset.property;
  const definition = ontology[key];
  document.querySelector("#dialogTitle").textContent = definition.displayName;
  document.querySelector("#dialogBody").textContent = `customer.${key}\n\n${definition.description}\n\n${JSON.stringify(definition, null, 2)}\n\nAllowed operators: <  <=  >  >=  ==  !=`;
  dialog.showModal();
});
document.querySelector(".dialog-close").addEventListener("click", () => dialog.close());
dialog.addEventListener("click", event => { if (event.target === dialog) dialog.close(); });

renderOntology();
updateCount();
