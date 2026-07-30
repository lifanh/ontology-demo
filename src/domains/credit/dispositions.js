export const DISPOSITION_STORAGE_KEY = "customer-review:dispositions:v1";

export const dispositionActions = Object.freeze([
  "AUTO_REVIEW_PASS",
  "REQUEST_UPDATED_FINANCIAL_STATEMENTS",
  "NEED_MANUAL_REVIEW",
  "NEED_CREDIT_MANAGER_REVIEW",
  "RECOMMEND_CREDIT_LIMIT_REASSESSMENT",
  "NEED_TO_RESTRICT"
]);

const keyFor = ({ customerNumber, releaseId }) => `${customerNumber}::${releaseId}`;

export function createDisposition(input) {
  const customerNumber = Number(input.customerNumber);
  const releaseId = String(input.releaseId || "");
  const evaluationRefs = input.evaluationRefs;
  const deterministicAction = input.deterministicAction;
  if (!Number.isInteger(customerNumber) || !releaseId) throw new Error("Disposition requires a Narrative Customer and Demo Release");
  if (!Array.isArray(evaluationRefs) || !evaluationRefs.length || evaluationRefs.some(ref => typeof ref !== "string" || !ref.startsWith(`${releaseId}/`))) throw new Error("Disposition requires exact evaluation references from its Demo Release");
  if (!dispositionActions.includes(deterministicAction)) throw new Error("Deterministic action is outside the allowed action vocabulary");
  if (input.status === "ACCEPTED") {
    return Object.freeze({ status: "ACCEPTED", customerNumber, releaseId, evaluationRefs: Object.freeze([...evaluationRefs]), deterministicAction, action: deterministicAction, reason: null });
  }
  if (input.status !== "OVERRIDDEN") throw new Error("Disposition must be ACCEPTED or OVERRIDDEN");
  if (!dispositionActions.includes(input.action) || input.action === deterministicAction) throw new Error("Override action must be a different allowed action");
  const reason = typeof input.reason === "string" ? input.reason.trim() : "";
  if (reason.length < 10 || reason.length > 500) throw new Error("Override reason must be 10–500 characters after trimming");
  return Object.freeze({ status: "OVERRIDDEN", customerNumber, releaseId, evaluationRefs: Object.freeze([...evaluationRefs]), deterministicAction, action: input.action, reason });
}

export function createDispositionStore(storage) {
  const readAll = () => {
    try {
      const value = JSON.parse(storage.getItem(DISPOSITION_STORAGE_KEY) || "{}");
      return value && typeof value === "object" && !Array.isArray(value) ? value : {};
    } catch { return {}; }
  };
  return Object.freeze({
    save(input) {
      const record = createDisposition(input);
      storage.setItem(DISPOSITION_STORAGE_KEY, JSON.stringify({ ...readAll(), [keyFor(record)]: record }));
      return record;
    },
    load(context) {
      const candidate = readAll()[keyFor(context)];
      if (!candidate) return null;
      try {
        const record = createDisposition(candidate);
        return record.deterministicAction === context.deterministicAction && JSON.stringify(record.evaluationRefs) === JSON.stringify(context.evaluationRefs) ? record : null;
      } catch { return null; }
    },
    clear() {
      storage.removeItem(DISPOSITION_STORAGE_KEY);
    }
  });
}
