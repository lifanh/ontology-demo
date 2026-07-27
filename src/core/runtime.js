/** Domain-neutral typed fact registry and deterministic rule runtime. */
export class FactRegistry {
  constructor({ properties, derived = {} }) {
    this.properties = Object.freeze({ ...properties });
    this.derived = Object.freeze({ ...derived });
    this.validate();
  }

  definition(id) { return this.properties[id] || this.derived[id]; }

  validate() {
    for (const [id, fact] of Object.entries(this.derived)) {
      if (typeof fact.derive !== "function") throw new Error(`Derived fact ${id} has no implementation`);
      for (const dependency of fact.dependencies || []) {
        if (!this.definition(dependency)) throw new Error(`Derived fact ${id} references unknown property ${dependency}`);
      }
    }
  }

  validateContracts(contracts, owner = "component") {
    for (const contract of contracts) {
      const fact = this.definition(contract.id);
      if (!fact) throw new Error(`${owner} references unknown property ${contract.id}`);
      if (contract.type && fact.type !== contract.type) throw new Error(`${owner}.${contract.id} requires ${contract.type}, ontology provides ${fact.type}`);
      if ((contract.unit || null) !== (fact.unit || null)) throw new Error(`${owner}.${contract.id} unit contract does not match ontology`);
    }
  }

  context(source) {
    const cache = new Map();
    const get = id => {
      if (!this.definition(id)) throw new Error(`Unknown fact ${id}`);
      if (cache.has(id)) return cache.get(id);
      const value = this.derived[id] ? this.derived[id].derive({ get }) : Object.hasOwn(source, id) ? source[id] : null;
      cache.set(id, value ?? null);
      return value ?? null;
    };
    return Object.freeze({ get, snapshot: () => Object.fromEntries([...Object.keys(this.properties), ...Object.keys(this.derived)].map(id => [id, get(id)])) });
  }
}

const compare = (left, operator, right) => ({ ">": left > right, ">=": left >= right, "<": left < right, "<=": left <= right, "==": left === right, "!=": left !== right })[operator];

export function evaluateRules(context, rules) {
  return rules.map(rule => {
    const scopeFacts = new Set((rule.scope || []).map(condition => condition.fact));
    const missingScope = [...scopeFacts].filter(id => context.get(id) === null);
    if (missingScope.length) return { id: rule.id, revision: rule.revision, status: "INDETERMINATE", reasonCode: rule.reasonCode, message: `Missing scope fact${missingScope.length === 1 ? "" : "s"}: ${missingScope.join(", ")}`, material: rule.material !== false, actionHint: rule.actionHint };
    const applicable = (rule.scope || []).every(condition => compare(context.get(condition.fact), condition.op, condition.value));
    if (!applicable) return { id: rule.id, revision: rule.revision, status: "NOT_APPLICABLE", reasonCode: rule.reasonCode, material: false };
    const missing = rule.inputs.filter(input => !scopeFacts.has(input.id) && context.get(input.id) === null);
    if (missing.length) return { id: rule.id, revision: rule.revision, status: "INDETERMINATE", reasonCode: rule.reasonCode, message: `Missing ${missing.map(x => x.id).join(", ")}`, material: rule.material !== false, actionHint: rule.actionHint };
    const matched = rule.when(context);
    if (matched === null) return { id: rule.id, revision: rule.revision, status: "INDETERMINATE", reasonCode: rule.reasonCode, message: "The rule comparison could not be calculated", material: rule.material !== false, actionHint: rule.actionHint };
    return { id: rule.id, revision: rule.revision, status: matched ? "FINDING" : "PASS", reasonCode: rule.reasonCode, message: matched ? rule.message : "Condition passed", material: matched && rule.material !== false, actionHint: matched ? rule.actionHint : null };
  });
}

export function createEvaluator(pack) {
  pack.registry.validateContracts(pack.calculator.inputs, "calculator");
  for (const rule of pack.rules) {
    pack.registry.validateContracts(rule.inputs, `rule ${rule.id}`);
    for (const condition of rule.scope || []) if (!pack.registry.definition(condition.fact)) throw new Error(`rule ${rule.id} references unknown scope property ${condition.fact}`);
  }
  return (source, rules = pack.rules, release = pack.release) => {
    const context = pack.registry.context(source);
    const findings = evaluateRules(context, rules);
    const calculation = pack.calculator.calculate(context);
    return { customer: source, facts: context.snapshot(), findings, action: pack.resolveAction(context, findings, calculation), calculation, release };
  };
}

export function compareBatch(fixtures, evaluateBaseline, evaluateCandidate) {
  const rows = fixtures.map(customer => {
    try {
      const baseline = evaluateBaseline(customer), candidate = evaluateCandidate(customer);
      const baseCodes = new Set(baseline.findings.filter(x => x.status === "FINDING").map(x => x.reasonCode));
      const candidateCodes = new Set(candidate.findings.filter(x => x.status === "FINDING").map(x => x.reasonCode));
      return { customer, baseline, candidate, added: [...candidateCodes].filter(x => !baseCodes.has(x)), resolved: [...baseCodes].filter(x => !candidateCodes.has(x)) };
    } catch (error) {
      return { customer, error: error instanceof Error ? error.message : String(error), added: [], resolved: [] };
    }
  });
  const validLimit = result => ["CALCULATED", "NO_CHANGE_RECOMMENDED"].includes(result.calculation.status);
  const successful = rows.filter(row => !row.error);
  const deltas = successful.map(row => validLimit(row.candidate) ? row.candidate.calculation.delta : 0);
  const summary = {
    evaluated: rows.length,
    unchanged: successful.filter(r => r.baseline.action.primary === r.candidate.action.primary && !r.added.length && !r.resolved.length).length,
    newlyReviewed: successful.filter(r => r.baseline.action.primary === "AUTO_REVIEW_PASS" && r.candidate.action.primary !== "AUTO_REVIEW_PASS").length,
    cleared: successful.filter(r => r.baseline.action.primary !== "AUTO_REVIEW_PASS" && r.candidate.action.primary === "AUTO_REVIEW_PASS").length,
    changedPrimaryAction: successful.filter(r => r.baseline.action.primary !== r.candidate.action.primary).length,
    addedFindings: successful.reduce((n, r) => n + r.added.length, 0), resolvedFindings: successful.reduce((n, r) => n + r.resolved.length, 0),
    indeterminate: successful.reduce((n, r) => n + r.candidate.findings.filter(f => f.status === "INDETERMINATE").length + (r.candidate.calculation.status === "INDETERMINATE" ? 1 : 0), 0), errors: rows.length - successful.length,
    limitIncrease: successful.filter(r => r.candidate.calculation.status === "CALCULATED" && r.candidate.calculation.direction === "INCREASE").length,
    limitDecrease: successful.filter(r => r.candidate.calculation.status === "CALCULATED" && r.candidate.calculation.direction === "DECREASE").length,
    limitNoChange: successful.filter(r => r.candidate.calculation.status === "NO_CHANGE_RECOMMENDED").length,
    limitBlocked: successful.filter(r => r.candidate.calculation.status.startsWith("BLOCKED")).length,
    exposureDelta: deltas.reduce((a, b) => a + b, 0), largestDelta: deltas.reduce((a, b) => Math.abs(b) > Math.abs(a) ? b : a, 0)
  };
  return { rows, summary, complete: summary.errors === 0 && summary.indeterminate === 0 };
}
