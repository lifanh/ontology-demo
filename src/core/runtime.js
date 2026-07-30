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

const operators = Object.freeze({
  ">": (left, right) => left > right,
  ">=": (left, right) => left >= right,
  "<": (left, right) => left < right,
  "<=": (left, right) => left <= right,
  "==": (left, right) => left === right,
  "!=": (left, right) => left !== right
});

const deepFreeze = value => {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const nested of Object.values(value)) deepFreeze(nested);
  return Object.freeze(value);
};

const observation = (context, registry, role, condition) => {
  const definition = registry.definition(condition.fact);
  const value = context.get(condition.fact);
  return {
    role,
    factId: condition.fact,
    factLabel: definition.displayName,
    actual: { value, type: definition.type, unit: definition.unit || null, format: definition.format },
    comparison: { operator: condition.op, value: condition.value, unit: definition.unit || null, format: definition.format },
    result: value === null ? "UNKNOWN" : operators[condition.op](value, condition.value) ? "MATCH" : "NO_MATCH",
    supportingFactIds: [...(definition.dependencies || [])]
  };
};

const validateRule = (rule, registry) => {
  if (!rule.policy?.title || !rule.policy?.statement) throw new Error(`rule ${rule.id} requires authoritative policy text`);
  if (!rule.conditions?.length) throw new Error(`rule ${rule.id} requires at least one declarative condition`);
  for (const condition of [...(rule.scope || []), ...rule.conditions]) {
    const definition = registry.definition(condition.fact);
    if (!definition) throw new Error(`rule ${rule.id} references unknown property ${condition.fact}`);
    if (!operators[condition.op]) throw new Error(`rule ${rule.id} uses unsupported operator ${condition.op}`);
    if (Object.hasOwn(condition, "unit") && (condition.unit || null) !== (definition.unit || null)) throw new Error(`rule ${rule.id}.${condition.fact} unit contract does not match ontology`);
    if (["decimal", "integer"].includes(definition.type) && (typeof condition.value !== "number" || !Number.isFinite(condition.value))) throw new Error(`rule ${rule.id}.${condition.fact} requires a numeric comparison value`);
    if (["string", "enum"].includes(definition.type) && typeof condition.value !== "string") throw new Error(`rule ${rule.id}.${condition.fact} requires a text comparison value`);
    if (definition.type === "enum" && definition.values && !definition.values.includes(condition.value)) throw new Error(`rule ${rule.id}.${condition.fact} comparison is outside the ontology enum`);
  }
};

export function evaluateRules(context, rules, { registry, release }) {
  return rules.map(rule => {
    validateRule(rule, registry);
    const applicability = (rule.scope || []).map(condition => observation(context, registry, "APPLICABILITY", condition));
    const policyRef = { releaseId: release.id, ontologyVersion: release.ontologyVersion, ruleId: rule.id, ruleRevision: rule.revision };
    const base = { schemaVersion: "1", evaluationRef: `${release.id}/${rule.id}@${rule.revision}`, policyRef, policy: { ...rule.policy } };
    const missingFactIds = observations => observations.filter(item => item.result === "UNKNOWN").map(item => item.factId);
    if (applicability.some(item => item.result === "NO_MATCH")) return deepFreeze({ ...base, outcome: "NOT_APPLICABLE", observations: applicability, finding: null });
    if (applicability.some(item => item.result === "UNKNOWN")) return deepFreeze({ ...base, outcome: "INDETERMINATE", observations: applicability, finding: null, missingFactIds: missingFactIds(applicability) });
    const conditions = rule.conditions.map(condition => observation(context, registry, "CONDITION", condition));
    const observations = [...applicability, ...conditions];
    if (conditions.some(item => item.result === "UNKNOWN")) return deepFreeze({ ...base, outcome: "INDETERMINATE", observations, finding: null, missingFactIds: missingFactIds(conditions) });
    const outcome = conditions.every(item => item.result === "MATCH") ? "FINDING" : "PASS";
    const finding = outcome === "FINDING" ? { reasonCode: rule.reasonCode, material: rule.material !== false, actionHint: rule.actionHint } : null;
    return deepFreeze({ ...base, outcome, observations, finding });
  });
}

export function createEvaluator(pack) {
  pack.registry.validateContracts(pack.calculator.inputs, "calculator");
  for (const rule of pack.rules) validateRule(rule, pack.registry);
  return (source, rules = pack.rules, release = pack.release) => {
    const context = pack.registry.context(source);
    const selectedRelease = release === pack.release ? pack.release : { ontologyVersion: pack.release.ontologyVersion, actionPolicyVersion: pack.release.actionPolicyVersion, calculatorVersion: pack.release.calculatorVersion, ...release };
    for (const rule of rules) {
      const manifestRule = selectedRelease.rules?.find(item => item.id === rule.id);
      if (!manifestRule || manifestRule.revision !== rule.revision) throw new Error(`Release ${selectedRelease.id} does not contain ${rule.id}@${rule.revision}`);
    }
    const traces = evaluateRules(context, rules, { registry: pack.registry, release: selectedRelease });
    const findings = traces.filter(trace => trace.outcome === "FINDING");
    const findingRecords = findings.map(trace => trace.finding);
    const calculation = pack.calculator.calculate(context);
    const reviewState = { hasIndeterminateRule: traces.some(trace => trace.outcome === "INDETERMINATE") };
    const action = pack.resolveAction(context, findingRecords, calculation, reviewState);
    return deepFreeze({ customer: { ...source }, facts: context.snapshot(), traces, findings, action, calculation, release: selectedRelease, versions: { resolver: pack.resolverVersion, calculator: calculation.version } });
  };
}

export function compareBatch(fixtures, evaluateBaseline, evaluateCandidate) {
  const rows = fixtures.map(customer => {
    try {
      const baseline = evaluateBaseline(customer), candidate = evaluateCandidate(customer);
      const baseCodes = new Set(baseline.findings.map(trace => trace.finding.reasonCode));
      const candidateCodes = new Set(candidate.findings.map(trace => trace.finding.reasonCode));
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
    indeterminate: successful.reduce((n, r) => n + r.candidate.traces.filter(trace => trace.outcome === "INDETERMINATE").length + (r.candidate.calculation.status === "INDETERMINATE" ? 1 : 0), 0), errors: rows.length - successful.length,
    limitIncrease: successful.filter(r => r.candidate.calculation.status === "CALCULATED" && r.candidate.calculation.direction === "INCREASE").length,
    limitDecrease: successful.filter(r => r.candidate.calculation.status === "CALCULATED" && r.candidate.calculation.direction === "DECREASE").length,
    limitNoChange: successful.filter(r => r.candidate.calculation.status === "NO_CHANGE_RECOMMENDED").length,
    limitBlocked: successful.filter(r => r.candidate.calculation.status.startsWith("BLOCKED")).length,
    exposureDelta: deltas.reduce((a, b) => a + b, 0), largestDelta: deltas.reduce((a, b) => Math.abs(b) > Math.abs(a) ? b : a, 0)
  };
  return { rows, summary, complete: summary.errors === 0 && summary.indeterminate === 0 };
}

export function assessReviewImpact(cohort, evaluateBaseline, evaluateCandidate) {
  const comparison = compareBatch(cohort.records, evaluateBaseline, evaluateCandidate);
  const indeterminateEvaluations = comparison.rows.filter(row => !row.error && (row.candidate.traces.some(trace => trace.outcome === "INDETERMINATE") || row.candidate.calculation.status === "INDETERMINATE")).length;
  const complete = comparison.summary.errors === 0 && indeterminateEvaluations === 0;
  const summary = {
    cohortId: cohort.id,
    evaluated: comparison.summary.evaluated,
    newlyRequiredReviews: comparison.summary.newlyReviewed,
    reviewsCleared: comparison.summary.cleared,
    changedPrimaryActions: comparison.summary.changedPrimaryAction,
    addedFindings: comparison.summary.addedFindings,
    resolvedFindings: comparison.summary.resolvedFindings,
    indeterminateEvaluations,
    errors: comparison.summary.errors,
    complete
  };
  const rows = comparison.rows.map(row => {
    const base = { customerId: row.customer.customer_number, label: row.customer.name };
    if (row.error) return { ...base, error: row.error, addedFindings: [], resolvedFindings: [], evidenceRefs: [] };
    const changedCodes = new Set([...row.added, ...row.resolved]);
    const findingChanges = (result, codes) => codes.map(reasonCode => {
      const trace = result.findings.find(item => item.finding.reasonCode === reasonCode);
      return { reasonCode, policyTitle: trace.policy.title, evidenceRef: trace.evaluationRef };
    });
    return {
      ...base,
      baselineAction: row.baseline.action.primary,
      candidateAction: row.candidate.action.primary,
      addedFindings: row.added,
      resolvedFindings: row.resolved,
      addedFindingDetails: findingChanges(row.candidate, row.added),
      resolvedFindingDetails: findingChanges(row.baseline, row.resolved),
      evidenceRefs: [...row.baseline.traces, ...row.candidate.traces].filter(trace => trace.finding && changedCodes.has(trace.finding.reasonCode)).map(trace => trace.evaluationRef).filter((value, index, values) => values.indexOf(value) === index),
      baselineCalculation: row.baseline.calculation.status,
      candidateCalculation: row.candidate.calculation.status,
      indeterminate: row.candidate.traces.some(trace => trace.outcome === "INDETERMINATE") || row.candidate.calculation.status === "INDETERMINATE"
    };
  });
  const changedRows = rows.filter(row => row.error || row.indeterminate || row.baselineAction !== row.candidateAction || row.addedFindings.length || row.resolvedFindings.length);
  const headline = !complete ? "Impact assessment incomplete"
    : summary.newlyRequiredReviews && summary.reviewsCleared ? `${summary.newlyRequiredReviews} records enter review; ${summary.reviewsCleared} ${summary.reviewsCleared === 1 ? "leaves" : "leave"} review`
      : summary.newlyRequiredReviews ? `${summary.newlyRequiredReviews} additional records require review`
        : summary.reviewsCleared ? `${summary.reviewsCleared} records no longer require review`
          : "No records cross the automatic-review boundary. Findings or review paths may still have changed.";
  return deepFreeze({ summary, headline, changedRows, rows, complete });
}
