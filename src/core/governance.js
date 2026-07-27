export const STATES = ["DRAFT", "VALIDATED", "ANALYZED", "BATCH_PASSED", "APPROVED_AND_PUBLISHED"];

export class Governance {
  constructor({ activeRelease, candidate }) {
    this.activeRelease = activeRelease;
    this.revisions = [Object.freeze({ ...candidate, state: "DRAFT" })];
    this.evidence = {};
    this.releaseHistory = [activeRelease];
  }
  get current() { return this.revisions.at(-1); }
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
    const blocked = kind === "analysis" && ["CONFLICT", "INDETERMINATE"].includes(value.status);
    const blockedBatch = kind === "batch" && !value.complete;
    this.evidence[kind] = { ...value, revision: this.current.revision, releaseId: this.activeRelease.id };
    if (!blocked && !blockedBatch) this.revisions[this.revisions.length - 1] = Object.freeze({ ...this.current, state: STATES[STATES.indexOf(required) + 1] });
    return !blocked && !blockedBatch;
  }
  canPublish() {
    return this.current.state === "BATCH_PASSED" && ["validation", "analysis", "batch"].every(k => this.evidence[k]?.revision === this.current.revision && this.evidence[k]?.releaseId === this.activeRelease.id);
  }
  publish(release) {
    if (!this.canPublish()) throw new Error("Approval blocked: current validation, non-conflicting analysis, and complete batch are required");
    if (!release?.rules?.some(rule => rule.id === this.current.logicalId && rule.revision === this.current.revision)) throw new Error("Published release must include the approved rule revision");
    this.revisions[this.revisions.length - 1] = Object.freeze({ ...this.current, state: "APPROVED_AND_PUBLISHED" });
    this.activeRelease = Object.freeze({ ...release, publishedAt: new Date().toISOString() });
    this.releaseHistory.push(this.activeRelease);
    return this.activeRelease;
  }
}
