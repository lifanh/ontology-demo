import assert from "node:assert/strict";
import { test } from "vite-plus/test";
import { eligibleReviewTools, evidenceFor, explainReviewExecutor } from "../server/review-evidence.js";

const ref = "credit-1.4.0/NET30_PAST_DUE_MAX@4";
const request = (number = 2002, reasons = ["NET30_PAST_DUE_LIMIT_EXCEEDED"]) => ({
  schemaVersion: "1", customer: { number, name: "Fictional customer" }, release: { id: "credit-1.4.0" }, action: "NEED_MANUAL_REVIEW",
  traces: reasons.map((reasonCode, index) => ({ evaluationRef: `${ref}-${index}`, outcome: "FINDING", reasonCode, policyStatement: "Illustrative policy statement.", factRefs: [`fact:${number}/past_due_amount`] })),
  facts: [{ ref: `fact:${number}/past_due_amount`, factId: "past_due_amount", value: number === 2002 ? "$18,000" : "$20,000" }]
});
const final = references => ({ status: "EXPLAINED", summary: "Grounded explanation.", points: [{ text: "Grounded point.", references }] });

test("reason codes produce every approved Narrative Customer eligibility set", () => {
  assert.deepEqual(eligibleReviewTools([]), []);
  assert.deepEqual(eligibleReviewTools(request().traces), ["get_payment_history", "get_open_disputes"]);
  assert.deepEqual(eligibleReviewTools(request(2004, ["CRITICAL_RESTRICTION_TRIGGER"]).traces), ["get_payment_history", "get_open_disputes", "get_recent_orders"]);
  assert.deepEqual(eligibleReviewTools(request(2003, ["FINANCIAL_STATEMENTS_STALE"]).traces), []);
});

test("exact fixtures reconcile overdue payments, disputes, and order window", () => {
  for (const [number, total] of [[2002, 18000], [2004, 20000]]) {
    const payments = evidenceFor(number, "get_payment_history");
    assert.equal(payments.asOfDate, "2026-06-30");
    assert.equal(payments.fixtureVersion, "1");
    assert.equal(payments.records.filter(x => x.status === "OPEN").reduce((sum, x) => sum + x.openAmount, 0), total);
    const invoices = new Map(payments.records.map(x => [x.invoiceRef, x]));
    for (const dispute of evidenceFor(number, "get_open_disputes").records) assert.ok(invoices.has(dispute.invoiceRef) && dispute.disputedAmount <= invoices.get(dispute.invoiceRef).openAmount);
  }
  const orders = evidenceFor(2004, "get_recent_orders").records;
  assert.equal(orders.reduce((sum, x) => sum + x.amount, 0), 105000);
  assert.ok(orders.every(x => x.orderDate >= "2026-04-01" && x.orderDate <= "2026-06-30"));
  assert.equal(evidenceFor(2002, "get_payment_history").records[0].invoiceRef, "CF-1019");
  assert.equal(evidenceFor(2004, "get_open_disputes").records[0].disputeRef, "IM-D08");
  assert.deepEqual(evidenceFor(2002, "get_payment_history"), {
    schemaVersion: "1", evidenceRef: "evidence:2002/get_payment_history@1", toolName: "get_payment_history", fixtureVersion: "1", customerNumber: 2002, asOfDate: "2026-06-30", records: [
      { invoiceRef: "CF-1019", invoiceDate: "2026-03-15", dueDate: "2026-04-14", originalAmount: 22000, openAmount: 0, currency: "USD", status: "PAID", paidDate: "2026-04-09", daysToPay: 25, daysPastDue: 0 },
      { invoiceRef: "CF-1026", invoiceDate: "2026-04-02", dueDate: "2026-05-02", originalAmount: 18000, openAmount: 0, currency: "USD", status: "PAID", paidDate: "2026-04-27", daysToPay: 25, daysPastDue: 0 },
      { invoiceRef: "CF-1042", invoiceDate: "2026-05-03", dueDate: "2026-06-02", originalAmount: 7000, openAmount: 7000, currency: "USD", status: "OPEN", paidDate: null, daysToPay: null, daysPastDue: 28 },
      { invoiceRef: "CF-1055", invoiceDate: "2026-05-12", dueDate: "2026-06-11", originalAmount: 6000, openAmount: 6000, currency: "USD", status: "OPEN", paidDate: null, daysToPay: null, daysPastDue: 19 },
      { invoiceRef: "CF-1061", invoiceDate: "2026-05-19", dueDate: "2026-06-18", originalAmount: 5000, openAmount: 5000, currency: "USD", status: "OPEN", paidDate: null, daysToPay: null, daysPastDue: 12 }
    ]
  });
  assert.deepEqual(evidenceFor(2002, "get_open_disputes").records, [
    { disputeRef: "CF-D17", invoiceRef: "CF-1042", openedDate: "2026-06-05", reasonCode: "PRICING_DIFFERENCE", reasonLabel: "Pricing difference", disputedAmount: 7000, currency: "USD", status: "OPEN", ageDays: 25 },
    { disputeRef: "CF-D19", invoiceRef: "CF-1055", openedDate: "2026-06-14", reasonCode: "FREIGHT_CHARGE", reasonLabel: "Freight charge", disputedAmount: 6000, currency: "USD", status: "OPEN", ageDays: 16 }
  ]);
  assert.deepEqual(evidenceFor(2004, "get_payment_history").records, [
    { invoiceRef: "IM-2178", invoiceDate: "2026-01-10", dueDate: "2026-02-24", originalAmount: 30000, openAmount: 0, currency: "USD", status: "PAID", paidDate: "2026-02-04", daysToPay: 25, daysPastDue: 0 },
    { invoiceRef: "IM-2191", invoiceDate: "2026-02-14", dueDate: "2026-03-31", originalAmount: 24000, openAmount: 0, currency: "USD", status: "PAID", paidDate: "2026-03-10", daysToPay: 24, daysPastDue: 0 },
    { invoiceRef: "IM-2204", invoiceDate: "2026-03-16", dueDate: "2026-04-30", originalAmount: 12000, openAmount: 12000, currency: "USD", status: "OPEN", paidDate: null, daysToPay: null, daysPastDue: 61 },
    { invoiceRef: "IM-2210", invoiceDate: "2026-03-30", dueDate: "2026-05-14", originalAmount: 8000, openAmount: 8000, currency: "USD", status: "OPEN", paidDate: null, daysToPay: null, daysPastDue: 47 }
  ]);
  assert.deepEqual(evidenceFor(2004, "get_open_disputes").records, [{ disputeRef: "IM-D08", invoiceRef: "IM-2204", openedDate: "2026-05-20", reasonCode: "SHORT_SHIPMENT", reasonLabel: "Short shipment", disputedAmount: 2000, currency: "USD", status: "OPEN", ageDays: 41 }]);
  assert.deepEqual(evidenceFor(2004, "get_recent_orders").records, [
    { orderRef: "IM-O330", orderDate: "2026-04-08", amount: 45000, currency: "USD", status: "INVOICED" },
    { orderRef: "IM-O347", orderDate: "2026-05-22", amount: 32000, currency: "USD", status: "SHIPPED" },
    { orderRef: "IM-O351", orderDate: "2026-06-18", amount: 28000, currency: "USD", status: "PENDING_FULFILLMENT" }
  ]);
  assert.throws(() => evidenceFor(2001, "get_payment_history"), /MODEL_OUTPUT_INVALID/);
});

test("zero tools omits provider tools and zero calls is valid", async () => {
  let input;
  const result = await explainReviewExecutor({ request: request(2001, []), providerCall: async value => { input = value; return final(["fact:2001/past_due_amount"]); } });
  assert.equal(Object.hasOwn(input, "tools"), false);
  assert.deepEqual(result.toolTrace, { eligible: [], called: [] });
});

test("multiple calls execute deterministically while visible trace retains model order", async () => {
  let call = 0;
  let finalInput;
  const result = await explainReviewExecutor({ request: request(), providerCall: async input => {
    if (++call === 1) return { type: "tool_calls", calls: [{ id: "b", name: "get_payment_history", arguments: "{}" }, { id: "a", name: "get_open_disputes", arguments: "{}" }] };
    finalInput = input;
    return final(["evidence:2002/get_payment_history@1"]);
  } });
  assert.deepEqual(result.toolTrace.called, ["get_payment_history", "get_open_disputes"]);
  assert.deepEqual(result.evidenceResults.map(x => x.toolName), ["get_open_disputes", "get_payment_history"]);
  assert.deepEqual(finalInput.messages.filter(message => message.role === "tool").map(message => [message.tool_call_id, message.name]), [["a", "get_open_disputes"], ["b", "get_payment_history"]]);
});

test("all malformed round types reject before fixture execution and return no partial result", async () => {
  const malformed = [
    [{ id: "1", name: "unknown", arguments: "{}" }],
    [{ id: "1", name: "get_recent_orders", arguments: "{}" }],
    [{ id: "1", name: "get_payment_history", arguments: "{\"customer\":2004}" }],
    [{ id: "1", name: "get_payment_history", arguments: "{}" }, { id: "2", name: "get_payment_history", arguments: "{}" }],
    [{ id: "1", name: "get_payment_history", arguments: "{}" }, { id: "1", name: "get_open_disputes", arguments: "{}" }]
  ];
  for (const calls of malformed) await assert.rejects(explainReviewExecutor({ request: request(), providerCall: async () => ({ type: "tool_calls", calls }) }), error => error.code === "MODEL_OUTPUT_INVALID");
  let round = 0;
  await assert.rejects(explainReviewExecutor({ request: request(), providerCall: async () => ++round === 1 ? { type: "tool_calls", calls: [{ id: "1", name: "get_payment_history", arguments: "{}" }] } : { type: "tool_calls", calls: [{ id: "2", name: "get_payment_history", arguments: "{}" }] } }), error => error.code === "MODEL_OUTPUT_INVALID");
});

test("two tool rounds and three calls are maximum; unknown and duplicate final references reject all prose", async () => {
  let count = 0;
  await assert.rejects(explainReviewExecutor({ request: request(2004, ["CRITICAL_RESTRICTION_TRIGGER"]), providerCall: async () => ({ type: "tool_calls", calls: [{ id: String(++count), name: ["get_payment_history", "get_open_disputes", "get_recent_orders"][count - 1], arguments: "{}" }] }) }), error => error.code === "MODEL_OUTPUT_INVALID");
  for (const references of [["unknown:ref"], [`${ref}-0`, `${ref}-0`]]) await assert.rejects(explainReviewExecutor({ request: request(), providerCall: async () => final(references) }), error => error.code === "MODEL_OUTPUT_INVALID");
});
