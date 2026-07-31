export const STATES = ["DRAFT", "VALIDATED", "ANALYZED", "BATCH_PASSED", "APPROVED_AND_ACTIVATED"];

const immutable = value => {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.values(value).forEach(immutable);
  return Object.freeze(value);
};

export class Governance {
  constructor({ activeRelease, candidate }) {
    this.activeRelease = immutable(structuredClone(activeRelease));
    this.revisions = [Object.freeze({ ...candidate, state: "DRAFT" })];
    this.evidence = {};
    this._releaseHistory = [this.activeRelease];
  }
  get current() { return this.revisions.at(-1); }
  get releaseHistory() { return Object.freeze([...this._releaseHistory]); }
  updateDraft(changes) {
    if (this.current.state !== "DRAFT") throw new Error(`Cannot update a ${this.current.state} revision; create a new revision first`);
    this.revisions[this.revisions.length - 1] = Object.freeze({ ...this.current, ...changes, state: "DRAFT" });
    return this.current;
  }
  edit(changes) {
    this.revisions.push(Object.freeze({ ...this.current, ...changes, revision: this.current.revision + 1, state: "DRAFT", ast: null }));
    this.evidence = {};
    return this.current;
  }
  record(kind, value) {
    const required = { validation: "DRAFT", analysis: "VALIDATED", batch: "ANALYZED" }[kind];
    if (this.current.state !== required) throw new Error(`Cannot record ${kind} from ${this.current.state}`);
    const compatible = ["REDUNDANT", "COMPATIBLE_REFINEMENT", "COMPATIBLE_RELAXATION"];
    const blockedValidation = kind === "validation" && value.valid !== true;
    const blocked = kind === "analysis" && !compatible.includes(value.status);
    const blockedBatch = kind === "batch" && !value.complete;
    this.evidence[kind] = { ...value, revision: this.current.revision, releaseId: this.activeRelease.id };
    if (!blockedValidation && !blocked && !blockedBatch) this.revisions[this.revisions.length - 1] = Object.freeze({ ...this.current, state: STATES[STATES.indexOf(required) + 1] });
    return !blockedValidation && !blocked && !blockedBatch;
  }
  canActivate() {
    const currentEvidence = ["validation", "analysis", "batch"].every(k => this.evidence[k]?.revision === this.current.revision && this.evidence[k]?.releaseId === this.activeRelease.id);
    const compatible = ["REDUNDANT", "COMPATIBLE_REFINEMENT", "COMPATIBLE_RELAXATION"].includes(this.evidence.analysis?.status);
    return this.current.state === "BATCH_PASSED" && currentEvidence && this.evidence.validation?.valid === true && compatible && this.evidence.batch?.complete === true;
  }
  activate(release) {
    if (!this.canActivate()) throw new Error("Activation blocked: current validation, non-conflicting analysis, and complete Review impact are required");
    if (this._releaseHistory.some(item => item.id === release?.id)) throw new Error("Demo Release ID must be unique in this browser tab");
    const activeRuleIds = this.activeRelease.rules.map(rule => rule.id).sort();
    const releaseRuleIds = release?.rules?.map(rule => rule.id).sort();
    if (!releaseRuleIds || new Set(releaseRuleIds).size !== releaseRuleIds.length || JSON.stringify(releaseRuleIds) !== JSON.stringify(activeRuleIds)) throw new Error("Demo Release must contain the complete active rule set");
    if (!release?.rules?.some(rule => rule.id === this.current.logicalId && rule.revision === this.current.revision)) throw new Error("Demo Release must include the approved candidate revision");
    this.revisions[this.revisions.length - 1] = Object.freeze({ ...this.current, state: "APPROVED_AND_ACTIVATED" });
    this.activeRelease = immutable(structuredClone({ ...release, status: "APPROVED_AND_ACTIVATED" }));
    this._releaseHistory.push(this.activeRelease);
    return this.activeRelease;
  }
  selectRelease(releaseId) {
    const selected = this._releaseHistory.find(item => item.id === releaseId);
    if (!selected) throw new Error("Unknown Demo Release for this browser tab");
    this.activeRelease = selected;
    return selected;
  }
  startDraft(candidate) {
    this.revisions = [Object.freeze({ ...candidate, state: "DRAFT" })];
    this.evidence = {};
    return this.current;
  }
  snapshot() { return structuredClone({ activeReleaseId: this.activeRelease.id, revisions: this.revisions, evidence: this.evidence, releaseHistory: this._releaseHistory }); }
  restore(snapshot) {
    if (!snapshot?.releaseHistory?.length || !snapshot.revisions?.length) throw new Error("Invalid Policy Studio session state");
    const releaseHistory = snapshot.releaseHistory.map(item => {
      if (!item?.id || !Array.isArray(item.rules) || !item.rules.length) throw new Error("Invalid Demo Release in Policy Studio session state");
      return immutable(structuredClone(item));
    });
    if (new Set(releaseHistory.map(item => item.id)).size !== releaseHistory.length) throw new Error("Duplicate Demo Release in Policy Studio session state");
    const activeRelease = releaseHistory.find(item => item.id === snapshot.activeReleaseId);
    if (!activeRelease) throw new Error("Invalid active Demo Release in Policy Studio session state");
    const revisions = snapshot.revisions.map(item => {
      if (!item?.logicalId || !Number.isInteger(item.revision) || !STATES.includes(item.state)) throw new Error("Invalid candidate revision in Policy Studio session state");
      return immutable(structuredClone(item));
    });
    const current = revisions.at(-1);
    if (current.state === "APPROVED_AND_ACTIVATED" && !releaseHistory.some(item => item.rules.some(rule => rule.id === current.logicalId && rule.revision === current.revision))) throw new Error("Activated candidate is absent from Demo Release history");
    const restoredRevisions = current.state === "APPROVED_AND_ACTIVATED"
      ? revisions
      : [...revisions.slice(0, -1), immutable({ ...current, state: "DRAFT" })];
    this._releaseHistory = releaseHistory;
    this.activeRelease = activeRelease;
    this.revisions = restoredRevisions;
    this.evidence = {};
    return this;
  }
  reset({ activeRelease, candidate }) {
    this.activeRelease = immutable(structuredClone(activeRelease));
    this._releaseHistory = [this.activeRelease];
    this.revisions = [Object.freeze({ ...candidate, state: "DRAFT" })];
    this.evidence = {};
  }
}
