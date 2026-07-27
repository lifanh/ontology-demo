/** Parse the bounded rule DSL against an ontology registry. */
export function parseRule(source, registry, { root = "subject" } = {}) {
  if (!/^[a-z][a-z0-9_]*$/.test(root)) throw new Error("The DSL root identifier is invalid");
  const lines = source.trim().split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  if (lines.length < 4) throw new Error("SYNTAX_ERROR\nRule is incomplete.");
  const ruleMatch = lines[0].match(/^RULE\s+([A-Z][A-Z0-9_]*)$/);
  if (!ruleMatch) throw new Error("SYNTAX_ERROR\nLine 1 must contain RULE followed by a stable rule ID.");
  if (lines.at(-1) !== "END") throw new Error("SYNTAX_ERROR\nThe final line must be END.");

  const property = id => {
    const definition = registry.definition(id);
    if (!definition) throw new Error(`UNKNOWN_PROPERTY\n${root}.${id} is not defined by the selected ontology release.`);
    return definition;
  };
  const parseCondition = text => {
    const match = text.match(new RegExp(`^${root}\\.([a-z_]+)\\s*(==|!=|>=|<=|>|<)\\s*(?:\"([^\"\\r\\n]+)\"|(-?\\d+(?:\\.\\d+)?)\\s*([A-Z]+)?)$`));
    if (!match) throw new Error(`SYNTAX_ERROR\nInvalid scope condition: ${text}`);
    const [, fact, op, stringValue, numericValue, unit] = match;
    const definition = property(fact);
    if (stringValue !== undefined) {
      if (!["enum", "string"].includes(definition.type)) throw new Error(`TYPE_ERROR\n${root}.${fact} is ${definition.type}, not a string.`);
      if (definition.values && !definition.values.includes(stringValue)) throw new Error(`INVALID_ENUM_VALUE\n${stringValue} is not valid for ${root}.${fact}.`);
      return { fact, op, value: stringValue };
    }
    if (!["decimal", "integer"].includes(definition.type)) throw new Error(`TYPE_ERROR\n${root}.${fact} is not numeric.`);
    if ((definition.unit || null) !== (unit || null)) throw new Error(`UNIT_ERROR\n${root}.${fact} requires ${definition.unit || "no unit"}.`);
    return { fact, op, value: Number(numericValue), unit: unit || null };
  };

  const effectIndex = lines.findIndex(line => /^SET_(MAX_RATIO|MAX|MIN)\b/.test(line));
  if (effectIndex < 2) throw new Error("SYNTAX_ERROR\nExpected SCOPE and a supported effect.");
  const scopeText = lines.slice(1, effectIndex).join(" ");
  if (!scopeText.startsWith("SCOPE ")) throw new Error("SYNTAX_ERROR\nExpected SCOPE after RULE.");
  const scopeExpression = scopeText.slice(6).trim();
  const scope = scopeExpression === "ALL" ? [] : scopeExpression.split(/\s+AND\s+/).map(parseCondition);

  const effectLine = lines[effectIndex];
  let effect;
  if (effectLine.startsWith("SET_MAX_RATIO")) {
    const numerator = effectLine.match(new RegExp(`^SET_MAX_RATIO\\s+${root}\\.([a-z_]+)$`));
    const ratio = lines[effectIndex + 1]?.match(new RegExp(`^TO\\s+${root}\\.([a-z_]+)\\s*=\\s*(0(?:\\.\\d+)?|1(?:\\.0+)?)$`));
    if (!numerator || !ratio || effectIndex + 2 !== lines.length - 1) throw new Error("SYNTAX_ERROR\nInvalid SET_MAX_RATIO effect.");
    const numeratorDefinition = property(numerator[1]), denominatorDefinition = property(ratio[1]);
    if (numeratorDefinition.type !== "decimal" || denominatorDefinition.type !== "decimal") throw new Error("TYPE_ERROR\nRatio properties must be decimal values.");
    if ((numeratorDefinition.unit || null) !== (denominatorDefinition.unit || null)) throw new Error("UNIT_ERROR\nRatio properties must use the same unit.");
    const value = Number(ratio[2]);
    if (!(value > 0 && value <= 1)) throw new Error("DOMAIN_ERROR\nRatio must be greater than 0 and no more than 1.");
    effect = { type: "SET_MAX_RATIO", numerator: numerator[1], denominator: ratio[1], value };
  } else {
    const match = effectLine.match(new RegExp(`^SET_(MAX|MIN)\\s+${root}\\.([a-z_]+)\\s*=\\s*(-?\\d+(?:\\.\\d+)?)\\s*([A-Z]+)?$`));
    if (!match || effectIndex + 1 !== lines.length - 1) throw new Error("SYNTAX_ERROR\nInvalid SET_MAX or SET_MIN effect.");
    const [, kind, fact, rawValue, unit] = match;
    const definition = property(fact);
    if (!["decimal", "integer"].includes(definition.type)) throw new Error(`TYPE_ERROR\n${root}.${fact} is not numeric.`);
    if ((definition.unit || null) !== (unit || null)) throw new Error(`UNIT_ERROR\n${root}.${fact} requires ${definition.unit || "no unit"}.`);
    effect = { type: `SET_${kind}`, fact, value: Number(rawValue), unit: unit || null };
  }
  return Object.freeze({ id: ruleMatch[1], scope, effect });
}

export function formatRule(ast, { root = "subject" } = {}) {
  if (!/^[a-z][a-z0-9_]*$/.test(root)) throw new Error("The DSL root identifier is invalid");
  const value = condition => typeof condition.value === "string" ? `"${condition.value}"` : `${condition.value}${condition.unit ? ` ${condition.unit}` : ""}`;
  const scope = ast.scope.length ? ast.scope.map((condition, index) => `${index ? "      AND" : "SCOPE"} ${root}.${condition.fact} ${condition.op} ${value(condition)}`).join("\n") : "SCOPE ALL";
  const effect = ast.effect.type === "SET_MAX_RATIO"
    ? `SET_MAX_RATIO ${root}.${ast.effect.numerator}\n    TO ${root}.${ast.effect.denominator} = ${ast.effect.value}`
    : `${ast.effect.type} ${root}.${ast.effect.fact} = ${ast.effect.value}${ast.effect.unit ? ` ${ast.effect.unit}` : ""}`;
  return `RULE ${ast.id}\n${scope}\n${effect}\nEND`;
}
