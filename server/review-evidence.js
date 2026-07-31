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
const invalid = () => { throw new GatewayFailure("MODEL_OUTPUT_INVALID", 502, false); };

export async function explainReviewExecutor({ request, providerCall }) {
  const eligible = eligibleReviewTools(request.traces);
  const knownRefs = new Set([...request.traces.map(x => x.evaluationRef), ...request.facts.map(x => x.ref)]);
  const factRefs = new Set(request.facts.map(x => x.ref));
  if (request.traces.some(trace => !trace.evaluationRef.startsWith(`${request.release.id}/`) || trace.factRefs.some(ref => !factRefs.has(ref))) || request.facts.some(fact => !fact.ref.startsWith(`fact:${request.customer.number}/`))) throw new GatewayFailure("INVALID_REQUEST", 400, false);
  const called = [], evidenceResults = [], used = new Set();
  const messages = [{ role: "system", content: "Explain the supplied deterministic review. You may request only offered fictional evidence. Cite supplied references. Do not state or invent authoritative actions, findings, values, thresholds, scores, approvals, or dispositions. Return only the required JSON." }, { role: "user", content: JSON.stringify(request) }];
  const tools = eligible.map(name => ({
    name,
    description: `Return fixed illustrative ${name.replaceAll("_", " ")} for this customer. Call at most once.`,
    parameters: { type: "object", additionalProperties: false, required: [], properties: {} },
    handler: async argumentsValue => {
      if (!argumentsValue || typeof argumentsValue !== "object" || Array.isArray(argumentsValue) || Object.keys(argumentsValue).length || used.has(name)) invalid();
      used.add(name);
      called.push(name);
      const result = evidenceFor(request.customer.number, name);
      evidenceResults.push(result);
      knownRefs.add(result.evidenceRef);
      return result;
    }
  }));
  const output = await providerCall({ schemaName: "explain_review_v1", responseSchema: aiContracts.explain_review.result.properties.rationale, messages, ...(tools.length ? { tools } : {}) });
  if (!output || output.status !== "EXPLAINED") invalid();
  for (const point of output.points || []) {
    const refs = new Set();
    for (const ref of point.references || []) { if (!knownRefs.has(ref) || refs.has(ref)) invalid(); refs.add(ref); }
  }
  return { rationale: output, evidenceResults, toolTrace: { eligible, called } };
}
