import { parseRule } from "../src/core/authoring.js";
import { registry } from "../src/domains/credit/pack.js";
import { aiContracts } from "./ai-contracts.js";
import { GatewayFailure } from "./ai-gateway.js";

const supportedShape = (family, ast) => {
  if (family === "NET30_PAST_DUE_MAX") return ast.id === family
    && ast.scope.length === 1
    && ast.scope[0].fact === "payment_terms" && ast.scope[0].op === "==" && ast.scope[0].value === "NET_30"
    && ast.effect.type === "SET_MAX_RATIO" && ast.effect.numerator === "past_due_amount" && ast.effect.denominator === "ar_balance"
    && ast.effect.value > 0 && ast.effect.value < 1;
  if (family === "HIGH_BALANCE_ADP_MAX") return ast.id === family
    && ast.scope.length === 2
    && ast.scope.some(item => item.fact === "restricted_status" && item.op === "==" && item.value === "N")
    && ast.scope.some(item => item.fact === "ar_balance" && item.op === ">" && item.value === 100000 && item.unit === "USD")
    && ast.effect.type === "SET_MAX" && ast.effect.fact === "adp_days" && ast.effect.unit === "DAYS" && ast.effect.value > 0;
  return false;
};

export function validateDraftResult(result) {
  if (result.outcome !== "CANDIDATE") return result;
  let ast;
  try { ast = parseRule(result.dsl, registry, { root: "customer" }); } catch { throw new GatewayFailure("INVALID_MODEL_RESPONSE", 502, false); }
  if (!supportedShape(result.family, ast)) throw new GatewayFailure("INVALID_MODEL_RESPONSE", 502, false);
  return result;
}

export async function draftRuleExecutor({ request, providerCall }) {
  const instructions = `You draft one illustrative credit-policy candidate. Support only NET30_PAST_DUE_MAX and HIGH_BALANCE_ADP_MAX.
If a numeric threshold is missing, ask one clarification question and emit no DSL. If intent is outside those families, return UNSUPPORTED_INTENT.
For a candidate, use exactly one template and replace only its threshold:

RULE NET30_PAST_DUE_MAX
SCOPE customer.payment_terms == "NET_30"
SET_MAX_RATIO customer.past_due_amount
    TO customer.ar_balance = <THRESHOLD_AS_DECIMAL>
END

RULE HIGH_BALANCE_ADP_MAX
SCOPE customer.restricted_status == "N"
      AND customer.ar_balance > 100000 USD
SET_MAX customer.adp_days = <THRESHOLD> DAYS
END

Never invent facts, validate, analyze, approve, activate, or choose a customer action. Return only the required JSON.`;
  const result = await providerCall({
    schemaName: "draft_rule_v1",
    responseSchema: aiContracts.draft_rule.result,
    messages: [
      { role: "system", content: instructions },
      { role: "user", content: `Active Demo Release: ${request.activeReleaseId}\nBusiness policy intent:\n${request.policyText}` }
    ]
  });
  return validateDraftResult(result);
}
