import { GatewayFailure } from "./ai-gateway.js";
import { aiContracts } from "./ai-contracts.js";

export const TOOL_NAMES = Object.freeze(["get_payment_history", "get_open_disputes", "get_recent_orders"]);
const eligibility = Object.freeze({
  GLOBAL_PAST_DUE_LIMIT_EXCEEDED: ["get_payment_history", "get_open_disputes"],
  NET30_PAST_DUE_LIMIT_EXCEEDED: ["get_payment_history", "get_open_disputes"],
  CRITICAL_RESTRICTION_TRIGGER: ["get_payment_history", "get_open_disputes", "get_recent_orders"]
});
const payment = {
  2002: [
    ["CF-1019","2026-03-15","2026-04-14",22000,0,"PAID","2026-04-09",25,0], ["CF-1026","2026-04-02","2026-05-02",18000,0,"PAID","2026-04-27",25,0],
    ["CF-1042","2026-05-03","2026-06-02",7000,7000,"OPEN",null,null,28], ["CF-1055","2026-05-12","2026-06-11",6000,6000,"OPEN",null,null,19], ["CF-1061","2026-05-19","2026-06-18",5000,5000,"OPEN",null,null,12]
  ],
  2004: [
    ["IM-2178","2026-01-10","2026-02-24",30000,0,"PAID","2026-02-04",25,0], ["IM-2191","2026-02-14","2026-03-31",24000,0,"PAID","2026-03-10",24,0],
    ["IM-2204","2026-03-16","2026-04-30",12000,12000,"OPEN",null,null,61], ["IM-2210","2026-03-30","2026-05-14",8000,8000,"OPEN",null,null,47]
  ]
};
const disputes = {
  2002: [["CF-D17","CF-1042","2026-06-05","PRICING_DIFFERENCE","Pricing difference",7000,25], ["CF-D19","CF-1055","2026-06-14","FREIGHT_CHARGE","Freight charge",6000,16]],
  2004: [["IM-D08","IM-2204","2026-05-20","SHORT_SHIPMENT","Short shipment",2000,41]]
};
const orders = { 2004: [["IM-O330","2026-04-08",45000,"INVOICED"], ["IM-O347","2026-05-22",32000,"SHIPPED"], ["IM-O351","2026-06-18",28000,"PENDING_FULFILLMENT"]] };

export function eligibleReviewTools(traces) {
  return TOOL_NAMES.filter(name => traces.some(trace => trace.outcome === "FINDING" && (eligibility[trace.reasonCode] || []).includes(name)));
}
export function evidenceFor(customerNumber, toolName) {
  let records;
  if (toolName === "get_payment_history" && payment[customerNumber]) records = payment[customerNumber].map(([invoiceRef,invoiceDate,dueDate,originalAmount,openAmount,status,paidDate,daysToPay,daysPastDue]) => ({ invoiceRef, invoiceDate, dueDate, originalAmount, openAmount, currency: "USD", status, paidDate, daysToPay, daysPastDue }));
  if (toolName === "get_open_disputes" && disputes[customerNumber]) records = disputes[customerNumber].map(([disputeRef,invoiceRef,openedDate,reasonCode,reasonLabel,disputedAmount,ageDays]) => ({ disputeRef, invoiceRef, openedDate, reasonCode, reasonLabel, disputedAmount, currency: "USD", status: "OPEN", ageDays }));
  if (toolName === "get_recent_orders" && orders[customerNumber]) records = orders[customerNumber].map(([orderRef,orderDate,amount,status]) => ({ orderRef, orderDate, amount, currency: "USD", status }));
  if (!records) throw new GatewayFailure("MODEL_OUTPUT_INVALID", 502, false);
  return Object.freeze({ schemaVersion: "1", evidenceRef: `evidence:${customerNumber}/${toolName}@1`, toolName, fixtureVersion: "1", customerNumber, asOfDate: "2026-06-30", records: Object.freeze(records.map(Object.freeze)) });
}
const toolDefinitions = names => names.map(name => ({ type: "function", function: { name, description: `Return fixed illustrative ${name.replaceAll("_", " ")} for this customer.`, parameters: { type: "object", additionalProperties: false, required: [], properties: {} }, strict: true } }));
const invalid = () => { throw new GatewayFailure("MODEL_OUTPUT_INVALID", 502, false); };
const hasEmptyArguments = value => {
  try { const parsed = JSON.parse(value); return parsed && typeof parsed === "object" && !Array.isArray(parsed) && Object.keys(parsed).length === 0; } catch { return false; }
};

export async function explainReviewExecutor({ request, providerCall }) {
  const eligible = eligibleReviewTools(request.traces);
  const knownRefs = new Set([...request.traces.map(x => x.evaluationRef), ...request.facts.map(x => x.ref)]);
  const factRefs = new Set(request.facts.map(x => x.ref));
  if (request.traces.some(trace => !trace.evaluationRef.startsWith(`${request.release.id}/`) || trace.factRefs.some(ref => !factRefs.has(ref))) || request.facts.some(fact => !fact.ref.startsWith(`fact:${request.customer.number}/`))) throw new GatewayFailure("INVALID_REQUEST", 400, false);
  const called = [], evidenceResults = [], used = new Set();
  const messages = [{ role: "system", content: "Explain the supplied deterministic review. You may request only offered fictional evidence. Cite supplied references. Do not state or invent authoritative actions, findings, values, thresholds, scores, approvals, or dispositions. Return only the required JSON." }, { role: "user", content: JSON.stringify(request) }];
  for (let round = 0; round < 3; round += 1) {
    const output = await providerCall({ schemaName: "explain_review_v1", responseSchema: aiContracts.explain_review.result.properties.rationale, messages, ...(eligible.length ? { tools: toolDefinitions(eligible) } : {}) });
    if (output?.type === "tool_calls") {
      if (round === 2 || !eligible.length || !Array.isArray(output.calls) || !output.calls.length) invalid();
      const names = new Set(), ids = new Set();
      for (const call of output.calls) {
        if (!call || typeof call.id !== "string" || !call.id || ids.has(call.id) || !eligible.includes(call.name) || names.has(call.name) || used.has(call.name) || !hasEmptyArguments(call.arguments)) invalid();
        names.add(call.name);
        ids.add(call.id);
      }
      const results = [...output.calls].sort((a,b) => a.name.localeCompare(b.name)).map(call => [call, evidenceFor(request.customer.number, call.name)]);
      for (const call of output.calls) { called.push(call.name); used.add(call.name); }
      for (const [, result] of results) { evidenceResults.push(result); knownRefs.add(result.evidenceRef); }
      messages.push({ role: "assistant", tool_calls: output.calls.map(call => ({ id: call.id, type: "function", function: { name: call.name, arguments: call.arguments } })) });
      for (const [call, result] of results) messages.push({ role: "tool", tool_call_id: call.id, name: call.name, content: JSON.stringify(result) });
      continue;
    }
    if (!output || output.status !== "EXPLAINED") invalid();
    for (const point of output.points || []) {
      const refs = new Set();
      for (const ref of point.references || []) { if (!knownRefs.has(ref) || refs.has(ref)) invalid(); refs.add(ref); }
    }
    return { rationale: output, evidenceResults, toolTrace: { eligible, called } };
  }
  invalid();
}
