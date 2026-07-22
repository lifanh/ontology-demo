(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.DecisionEngine = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const SUPPORTED_OPERATORS = new Set(["equals", "in", "gt", "gte", "lt", "lte", "missing", "present", "any"]);
  const FINDING_RESULTS = new Set(["satisfied", "violated", "condition_not_met", "indeterminate", "not_applicable", "error"]);
  const FINDING_GROUPS = new Set(["blocking", "compensated", "advisory", "unresolved"]);

  class DecisionEngineError extends Error {
    constructor(code, message, details) {
      super(message);
      this.name = "DecisionEngineError";
      this.code = code;
      this.details = details;
    }
  }

  function isMissing(value) {
    return value === null || value === undefined || value === "";
  }

  function addIssue(target, code, message, path) {
    target.push({ code, message, path });
  }

  function conditionSignature(condition) {
    return JSON.stringify({
      fact: condition.fact,
      operator: condition.operator,
      value: condition.value
    });
  }

  function rowSignature(row) {
    return row.conditions
      .map(conditionSignature)
      .sort()
      .join("|");
  }

  function valueAllowedByDefinition(value, definition) {
    if (definition.type === "enum") return definition.values.includes(value);
    if (definition.type === "integer") {
      return Number.isInteger(value)
        && (definition.minimum === undefined || value >= definition.minimum)
        && (definition.maximum === undefined || value <= definition.maximum);
    }
    if (definition.type === "number") {
      return typeof value === "number"
        && Number.isFinite(value)
        && (definition.minimum === undefined || value >= definition.minimum)
        && (definition.maximum === undefined || value <= definition.maximum);
    }
    if (definition.type === "string") return typeof value === "string";
    return false;
  }

  function sameOptionalValue(left, right) {
    return left === right || (left === undefined && right === undefined);
  }

  function sameValueSet(left, right) {
    return Array.isArray(left)
      && Array.isArray(right)
      && left.length === right.length
      && left.every(value => right.includes(value));
  }

  function validateCondition(condition, facts, errors, path) {
    if (!condition || typeof condition !== "object") {
      addIssue(errors, "INVALID_CONDITION", "Condition must be an object.", path);
      return;
    }

    const definition = facts[condition.fact];
    if (!definition) addIssue(errors, "UNKNOWN_FACT", `Unknown fact: ${condition.fact || "(missing)"}.`, `${path}.fact`);
    if (!SUPPORTED_OPERATORS.has(condition.operator)) {
      addIssue(errors, "UNSUPPORTED_OPERATOR", `Unsupported operator: ${condition.operator || "(missing)"}.`, `${path}.operator`);
      return;
    }
    if (!definition) return;

    if (["gt", "gte", "lt", "lte"].includes(condition.operator)) {
      if (!["integer", "number"].includes(definition.type)) {
        addIssue(errors, "INVALID_OPERATOR_TYPE", `${condition.operator} requires a numeric fact.`, path);
      }
      if (typeof condition.value !== "number" || !Number.isFinite(condition.value)) {
        addIssue(errors, "INVALID_OPERAND", `${condition.operator} requires one finite numeric value.`, `${path}.value`);
      }
    }

    if (condition.operator === "equals" && !valueAllowedByDefinition(condition.value, definition)) {
      addIssue(errors, "INVALID_OPERAND", `Invalid value for ${condition.fact}.`, `${path}.value`);
    }

    if (condition.operator === "in") {
      if (!Array.isArray(condition.value) || condition.value.length === 0) {
        addIssue(errors, "INVALID_OPERAND", "in requires a non-empty value array.", `${path}.value`);
      } else {
        condition.value.forEach((value, index) => {
          if (!valueAllowedByDefinition(value, definition)) {
            addIssue(errors, "INVALID_OPERAND", `Invalid value for ${condition.fact}.`, `${path}.value[${index}]`);
          }
        });
      }
    }

    if (["missing", "present", "any"].includes(condition.operator) && condition.value !== undefined) {
      addIssue(errors, "UNEXPECTED_OPERAND", `${condition.operator} does not accept a value.`, `${path}.value`);
    }
  }

  function numericBounds(condition) {
    switch (condition.operator) {
      case "gt": return { min: condition.value, minInclusive: false, max: Infinity, maxInclusive: false };
      case "gte": return { min: condition.value, minInclusive: true, max: Infinity, maxInclusive: false };
      case "lt": return { min: -Infinity, minInclusive: false, max: condition.value, maxInclusive: false };
      case "lte": return { min: -Infinity, minInclusive: false, max: condition.value, maxInclusive: true };
      case "equals": return typeof condition.value === "number"
        ? { min: condition.value, minInclusive: true, max: condition.value, maxInclusive: true }
        : null;
      default: return null;
    }
  }

  function boundsOverlap(left, right) {
    const lower = Math.max(left.min, right.min);
    const upper = Math.min(left.max, right.max);
    if (lower < upper) return true;
    if (lower > upper) return false;
    const leftIncludes = (lower !== left.min || left.minInclusive) && (upper !== left.max || left.maxInclusive);
    const rightIncludes = (lower !== right.min || right.minInclusive) && (upper !== right.max || right.maxInclusive);
    return leftIncludes && rightIncludes;
  }

  function conditionsOverlap(left, right) {
    if (left.operator === "any" || right.operator === "any") return true;
    if (left.operator === "missing") return right.operator === "missing";
    if (right.operator === "missing") return left.operator === "missing";
    if (left.operator === "present") return right.operator !== "missing";
    if (right.operator === "present") return left.operator !== "missing";

    const leftBounds = numericBounds(left);
    const rightBounds = numericBounds(right);
    if (leftBounds && rightBounds) return boundsOverlap(leftBounds, rightBounds);

    const leftValues = left.operator === "in" ? left.value : left.operator === "equals" ? [left.value] : null;
    const rightValues = right.operator === "in" ? right.value : right.operator === "equals" ? [right.value] : null;
    if (leftValues && rightValues) return leftValues.some(value => rightValues.includes(value));

    return true;
  }

  function rowsOverlap(left, right, factNames) {
    return factNames.every(fact => {
      const leftCondition = left.conditions.find(condition => condition.fact === fact);
      const rightCondition = right.conditions.find(condition => condition.fact === fact);
      return conditionsOverlap(leftCondition, rightCondition);
    });
  }

  function validateDecisionTable(table, contract = {}) {
    const errors = [];
    const warnings = [];

    if (!table || typeof table !== "object") {
      addIssue(errors, "INVALID_TABLE", "Decision table must be an object.", "table");
      return { valid: false, errors, warnings };
    }

    if (typeof table.id !== "string" || !table.id.trim()) addIssue(errors, "MISSING_TABLE_ID", "Decision table ID is required.", "id");
    if (!Number.isInteger(table.version) || table.version < 1) addIssue(errors, "INVALID_VERSION", "Version must be a positive integer.", "version");
    if (table.hitPolicy !== "FIRST") addIssue(errors, "UNSUPPORTED_HIT_POLICY", "Only the FIRST hit policy is supported.", "hitPolicy");

    const facts = table.facts && typeof table.facts === "object" ? table.facts : {};
    const factNames = Object.keys(facts);
    if (factNames.length === 0) addIssue(errors, "MISSING_FACTS", "At least one fact definition is required.", "facts");
    factNames.forEach(fact => {
      const definition = facts[fact];
      if (!definition || !["enum", "integer", "number", "string"].includes(definition.type)) {
        addIssue(errors, "INVALID_FACT_DEFINITION", `Invalid type for ${fact}.`, `facts.${fact}.type`);
      }
      if (definition?.type === "enum" && (!Array.isArray(definition.values) || definition.values.length === 0)) {
        addIssue(errors, "INVALID_FACT_DEFINITION", `${fact} must define enum values.`, `facts.${fact}.values`);
      }
    });

    if (contract.facts && typeof contract.facts === "object") {
      const contractFactNames = Object.keys(contract.facts);
      factNames.filter(fact => !contract.facts[fact]).forEach(fact => {
        addIssue(errors, "UNAUTHORIZED_FACT", `${fact} is not part of the authoritative decision contract.`, `facts.${fact}`);
      });
      contractFactNames.filter(fact => !facts[fact]).forEach(fact => {
        addIssue(errors, "MISSING_CONTRACT_FACT", `${fact} is required by the authoritative decision contract.`, `facts.${fact}`);
      });
      contractFactNames.filter(fact => facts[fact]).forEach(fact => {
        const actual = facts[fact];
        const expected = contract.facts[fact];
        const scalarFields = ["type", "unit", "required", "nullable", "minimum", "maximum", "displayName", "shortName"];
        scalarFields.forEach(field => {
          if (!sameOptionalValue(actual[field], expected[field])) {
            addIssue(errors, "FACT_CONTRACT_MISMATCH", `${fact}.${field} does not match the authoritative decision contract.`, `facts.${fact}.${field}`);
          }
        });
        if (expected.type === "enum" && !sameValueSet(actual.values, expected.values)) {
          addIssue(errors, "FACT_CONTRACT_MISMATCH", `${fact}.values do not match the authoritative decision contract.`, `facts.${fact}.values`);
        }
      });
    }

    const dispositions = table.dispositions && typeof table.dispositions === "object" ? table.dispositions : {};
    if (Object.keys(dispositions).length === 0) addIssue(errors, "MISSING_DISPOSITIONS", "At least one disposition is required.", "dispositions");
    Object.entries(dispositions).forEach(([key, disposition]) => {
      if (!disposition || typeof disposition !== "object") {
        addIssue(errors, "INVALID_DISPOSITION", `${key} must define a disposition object.`, `dispositions.${key}`);
        return;
      }
      if (typeof disposition.label !== "string" || !disposition.label.trim()) {
        addIssue(errors, "INVALID_DISPOSITION", `${key} must define a display label.`, `dispositions.${key}.label`);
      }
      if (typeof disposition.tone !== "string" || !disposition.tone.trim()) {
        addIssue(errors, "INVALID_DISPOSITION", `${key} must define a presentation tone.`, `dispositions.${key}.tone`);
      }
    });

    if (contract.dispositions && typeof contract.dispositions === "object") {
      const allowedKeys = Object.keys(contract.dispositions);
      Object.keys(dispositions).filter(key => !contract.dispositions[key]).forEach(key => {
        addIssue(errors, "UNAUTHORIZED_DISPOSITION", `${key} is not part of the authoritative decision contract.`, `dispositions.${key}`);
      });
      allowedKeys.filter(key => !dispositions[key]).forEach(key => {
        addIssue(errors, "MISSING_CONTRACT_DISPOSITION", `${key} is required by the authoritative decision contract.`, `dispositions.${key}`);
      });
      allowedKeys.filter(key => dispositions[key]).forEach(key => {
        const actual = dispositions[key];
        const expected = contract.dispositions[key];
        if (actual.label !== expected.label || actual.tone !== expected.tone) {
          addIssue(errors, "DISPOSITION_CONTRACT_MISMATCH", `${key} does not match the authoritative decision contract.`, `dispositions.${key}`);
        }
      });
    }

    if (!Array.isArray(table.assumptions) || table.assumptions.length === 0) {
      addIssue(errors, "MISSING_ASSUMPTIONS", "At least one explicit authoring assumption is required.", "assumptions");
    } else {
      table.assumptions.forEach((assumption, index) => {
        if (typeof assumption !== "string" || !assumption.trim()) {
          addIssue(errors, "INVALID_ASSUMPTION", "Assumptions must be non-empty strings.", `assumptions[${index}]`);
        }
      });
    }

    if (!Array.isArray(table.rows) || table.rows.length === 0) {
      addIssue(errors, "MISSING_ROWS", "At least one decision row is required.", "rows");
      return { valid: false, errors, warnings };
    }

    const rowIds = new Set();
    const priorities = new Set();
    table.rows.forEach((row, rowIndex) => {
      const path = `rows[${rowIndex}]`;
      if (!row || typeof row !== "object") {
        addIssue(errors, "INVALID_ROW", "Decision row must be an object.", path);
        return;
      }
      if (typeof row.id !== "string" || !row.id.trim()) addIssue(errors, "MISSING_ROW_ID", "Row ID is required.", `${path}.id`);
      else if (rowIds.has(row.id)) addIssue(errors, "DUPLICATE_ROW_ID", `Duplicate row ID: ${row.id}.`, `${path}.id`);
      else rowIds.add(row.id);

      if (!Number.isInteger(row.priority) || row.priority < 1) addIssue(errors, "INVALID_PRIORITY", "Priority must be a positive integer.", `${path}.priority`);
      else if (priorities.has(row.priority)) addIssue(errors, "DUPLICATE_PRIORITY", `Duplicate priority: ${row.priority}.`, `${path}.priority`);
      else priorities.add(row.priority);

      if (!dispositions[row.disposition]) addIssue(errors, "UNKNOWN_DISPOSITION", `Unknown disposition: ${row.disposition || "(missing)"}.`, `${path}.disposition`);
      if (typeof row.summary !== "string" || !row.summary.trim()) addIssue(errors, "MISSING_SUMMARY", "A concise row summary is required.", `${path}.summary`);
      if (typeof row.nextAction !== "string" || !row.nextAction.trim()) addIssue(errors, "MISSING_NEXT_ACTION", "A next action is required.", `${path}.nextAction`);

      if (!Array.isArray(row.conditions)) {
        addIssue(errors, "MISSING_CONDITIONS", "Row conditions are required.", `${path}.conditions`);
      } else {
        const seenFacts = new Set();
        row.conditions.forEach((condition, conditionIndex) => {
          validateCondition(condition, facts, errors, `${path}.conditions[${conditionIndex}]`);
          if (condition?.fact) {
            if (seenFacts.has(condition.fact)) addIssue(errors, "DUPLICATE_FACT_CONDITION", `Duplicate condition for ${condition.fact}.`, `${path}.conditions[${conditionIndex}]`);
            seenFacts.add(condition.fact);
          }
        });
        factNames.forEach(fact => {
          if (!seenFacts.has(fact)) addIssue(errors, "INCOMPLETE_ROW", `Row ${row.id || rowIndex + 1} has no condition for ${fact}.`, `${path}.conditions`);
        });
      }

      if (!Array.isArray(row.findings) || row.findings.length === 0) {
        addIssue(errors, "MISSING_FINDINGS", "At least one finding is required.", `${path}.findings`);
      } else {
        row.findings.forEach((finding, findingIndex) => {
          const findingPath = `${path}.findings[${findingIndex}]`;
          if (!finding || typeof finding !== "object") addIssue(errors, "INVALID_FINDING", "Finding must be an object.", findingPath);
          else {
            if (typeof finding.criterion !== "string" || !finding.criterion.trim()) addIssue(errors, "INVALID_FINDING", "Finding criterion is required.", `${findingPath}.criterion`);
            if (finding.fact && !facts[finding.fact]) addIssue(errors, "UNKNOWN_FACT", `Unknown finding fact: ${finding.fact}.`, `${findingPath}.fact`);
            if (!FINDING_RESULTS.has(finding.result)) addIssue(errors, "INVALID_FINDING_RESULT", `Unsupported finding result: ${finding.result || "(missing)"}.`, `${findingPath}.result`);
            if (!FINDING_GROUPS.has(finding.group)) addIssue(errors, "INVALID_FINDING_GROUP", `Unsupported finding group: ${finding.group || "(missing)"}.`, `${findingPath}.group`);
            if (typeof finding.required !== "string" || !finding.required.trim()) addIssue(errors, "INVALID_FINDING", "Finding requirement is required.", `${findingPath}.required`);
            if (typeof finding.decisionEffect !== "string" || !finding.decisionEffect.trim()) addIssue(errors, "INVALID_FINDING_EFFECT", "Decision effect is required.", `${findingPath}.decisionEffect`);
          }
        });
      }
    });

    if (errors.length === 0) {
      const rows = [...table.rows].sort((left, right) => left.priority - right.priority);
      const signatures = new Map();
      rows.forEach(row => {
        const signature = rowSignature(row);
        if (signatures.has(signature)) {
          addIssue(errors, "UNREACHABLE_ROW", `${row.id} duplicates higher-priority ${signatures.get(signature)}.`, `rows.${row.id}`);
        } else {
          signatures.set(signature, row.id);
        }
      });

      rows.forEach((row, index) => {
        if (row.conditions.every(condition => condition.operator === "any") && index < rows.length - 1) {
          addIssue(errors, "UNREACHABLE_ROW", `${row.id} matches every input, so lower-priority rows are unreachable.`, `rows.${row.id}`);
        }
      });

      for (let leftIndex = 0; leftIndex < rows.length; leftIndex += 1) {
        for (let rightIndex = leftIndex + 1; rightIndex < rows.length; rightIndex += 1) {
          const left = rows[leftIndex];
          const right = rows[rightIndex];
          if (rowSignature(left) !== rowSignature(right) && rowsOverlap(left, right, factNames)) {
            addIssue(warnings, "PRIORITY_OVERLAP", `${left.id} and ${right.id} can both match; FIRST selects ${left.id}.`, `rows.${right.id}`);
          }
        }
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  function validateInputs(facts, inputs) {
    const issues = [];
    Object.entries(facts).forEach(([fact, definition]) => {
      const value = inputs[fact];
      if (isMissing(value)) {
        if (definition.required && !definition.nullable) addIssue(issues, "MISSING_INPUT", `${fact} is required.`, `inputs.${fact}`);
        return;
      }
      if (!valueAllowedByDefinition(value, definition)) addIssue(issues, "INVALID_INPUT", `Invalid input for ${fact}.`, `inputs.${fact}`);
    });
    return issues;
  }

  function evaluateCondition(condition, observed) {
    if (condition.operator === "any") return { matched: true, status: "wildcard" };
    if (condition.operator === "missing") return { matched: isMissing(observed), status: isMissing(observed) ? "matched" : "not_matched" };
    if (condition.operator === "present") return { matched: !isMissing(observed), status: !isMissing(observed) ? "matched" : "not_matched" };
    if (isMissing(observed)) return { matched: false, status: "not_matched" };

    let matched = false;
    switch (condition.operator) {
      case "equals": matched = observed === condition.value; break;
      case "in": matched = condition.value.includes(observed); break;
      case "gt": matched = observed > condition.value; break;
      case "gte": matched = observed >= condition.value; break;
      case "lt": matched = observed < condition.value; break;
      case "lte": matched = observed <= condition.value; break;
      default: matched = false;
    }
    return { matched, status: matched ? "matched" : "not_matched" };
  }

  function deriveSummaryValues(row, inputs) {
    const values = { ...inputs };
    row.conditions.forEach(condition => {
      const observed = inputs[condition.fact];
      if (["gt", "gte"].includes(condition.operator) && typeof observed === "number") {
        values[`${condition.fact}_overage`] = Math.max(0, observed - condition.value);
      }
    });
    return values;
  }

  function interpolateSummary(template, values) {
    return template.replace(/\{\{([a-z_]+)\}\}/g, (match, key) => {
      const value = Object.hasOwn(values, key) ? values[key] : undefined;
      return isMissing(value) ? "unavailable" : String(value).replaceAll("_", " ");
    });
  }

  function createFindings(row, inputs) {
    return row.findings.map(finding => ({
      criterion: finding.criterion,
      result: finding.result,
      observed: finding.observedLabel || (finding.fact ? inputs[finding.fact] : null),
      required: finding.required,
      decisionEffect: finding.decisionEffect,
      group: finding.group
    }));
  }

  function evaluateDecisionTable(table, inputs, context = {}) {
    const validation = validateDecisionTable(table, context.contract);
    if (!validation.valid) throw new DecisionEngineError("INVALID_TABLE", "Decision table validation failed.", validation);

    const inputIssues = validateInputs(table.facts, inputs || {});
    if (inputIssues.length) throw new DecisionEngineError("INVALID_INPUTS", "Decision inputs are invalid.", inputIssues);

    const rows = [...table.rows].sort((left, right) => left.priority - right.priority);
    const trace = [];
    let matchedRow = null;

    rows.forEach(row => {
      if (matchedRow) {
        trace.push({
          rowId: row.id,
          priority: row.priority,
          status: "not_evaluated",
          conditions: row.conditions.map(condition => ({
            ...condition,
            observed: inputs[condition.fact],
            matched: null,
            status: "not_evaluated"
          }))
        });
        return;
      }

      const conditionTrace = row.conditions.map(condition => ({
        ...condition,
        observed: inputs[condition.fact],
        ...evaluateCondition(condition, inputs[condition.fact])
      }));
      const rowMatched = conditionTrace.every(condition => condition.matched);
      trace.push({
        rowId: row.id,
        priority: row.priority,
        status: rowMatched ? "selected" : "not_matched",
        conditions: conditionTrace
      });
      if (rowMatched) matchedRow = row;
    });

    if (!matchedRow) {
      throw new DecisionEngineError("NO_MATCH", "No decision row matched the supplied inputs.", { trace });
    }

    const disposition = table.dispositions[matchedRow.disposition];
    return {
      mode: "dry_run",
      customer: context.customer || null,
      decisionTable: {
        id: table.id,
        version: table.version,
        hitPolicy: table.hitPolicy
      },
      inputs: { ...inputs },
      matchedRow: { id: matchedRow.id, priority: matchedRow.priority },
      disposition: matchedRow.disposition,
      dispositionLabel: disposition.label,
      dispositionTone: disposition.tone,
      summary: interpolateSummary(matchedRow.summary, deriveSummaryValues(matchedRow, inputs)),
      nextAction: matchedRow.nextAction,
      findings: createFindings(matchedRow, inputs),
      evidence: Array.isArray(context.evidence) ? context.evidence.map(item => ({ ...item })) : [],
      trace,
      sideEffects: {
        performed: false,
        message: "Dry run only. No customer review was saved or submitted."
      }
    };
  }

  function formatCondition(condition, factDefinition = {}) {
    const label = condition.display || (() => {
      switch (condition.operator) {
        case "any": return "Any";
        case "missing": return "Missing";
        case "present": return "Present";
        case "equals": return String(condition.value);
        case "in": return condition.value.join(" or ");
        case "gt": return `> ${condition.value}${factDefinition.unit ? ` ${factDefinition.unit}` : ""}`;
        case "gte": return `≥ ${condition.value}${factDefinition.unit ? ` ${factDefinition.unit}` : ""}`;
        case "lt": return `< ${condition.value}${factDefinition.unit ? ` ${factDefinition.unit}` : ""}`;
        case "lte": return `≤ ${condition.value}${factDefinition.unit ? ` ${factDefinition.unit}` : ""}`;
        default: return condition.operator;
      }
    })();
    return String(label).replaceAll("_", " ");
  }

  return {
    DecisionEngineError,
    SUPPORTED_OPERATORS: [...SUPPORTED_OPERATORS],
    validateDecisionTable,
    evaluateDecisionTable,
    formatCondition
  };
});
