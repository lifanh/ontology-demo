import { GatewayFailure } from "./ai-gateway.js";
import { aiContracts } from "./ai-contracts.js";

const baseAuthorityTerm = "(?:qualify|validate|approve|activate|publish)";
const pastAuthorityTerm = "(?:qualified|validated|approved|activated|published)";
const authorityTerm = "(?:qualif(?:y|ied|ies)|validat(?:e|ed|es|ion)|approv(?:e|ed|es|al)|activat(?:e|ed|es|ion)|publish(?:ed|es)?)";
const authorityClaim = new RegExp(`\\b${authorityTerm}\\b`, "i");
const negatedAuthority = new RegExp(`\\b(?:` +
  `(?:(?:do|does|did|can|could|will|would|should|must)\\s+not|cannot|can't)\\s+(?:itself\\s+)?${baseAuthorityTerm}(?:\\s+(?:or|and)\\s+${baseAuthorityTerm})*|` +
  `(?:is|are|was|were|has|have|had)\\s+not\\s+(?:itself\\s+)?${pastAuthorityTerm}(?:\\s+(?:or|and)\\s+${pastAuthorityTerm})*` +
  `)\\b`, "gi");
const claimsAuthority = value => authorityClaim.test(String(value || "").replace(negatedAuthority, ""));

export async function explainPolicyAnalysisExecutor({ request, providerCall }) {
  const output = await providerCall({
    schemaName: "explain_policy_analysis_v1",
    responseSchema: aiContracts.explain_policy_analysis.result,
    messages: [
      { role: "system", content: "Explain only the supplied deterministic policy compatibility and Review impact summaries. Every point must cite supplied evidence references. Do not declare or imply qualification, validation, approval, activation, or a policy decision. Return only the required JSON." },
      { role: "user", content: JSON.stringify(request) }
    ]
  });
  if (claimsAuthority(output?.summary) || (output?.points || []).some(point => claimsAuthority(point.text))) throw new GatewayFailure("MODEL_OUTPUT_INVALID", 502, false);
  const known = new Set(request.evidenceRefs);
  for (const point of output?.points || []) {
    const cited = new Set();
    for (const reference of point.references || []) {
      if (!known.has(reference) || cited.has(reference)) throw new GatewayFailure("MODEL_OUTPUT_INVALID", 502, false);
      cited.add(reference);
    }
  }
  return output;
}
