export const STATES = ["DRAFT", "VALIDATED", "ANALYZED", "BATCH_PASSED"];

const immutable = value => {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.values(value).forEach(immutable);
  return Object.freeze(value);
};

const pinned = (evidence, revision, releaseId) => Object.fromEntries(Object.entries(evidence).map(([kind, value]) => [kind, immutable({ ...structuredClone(value), revision, releaseId })]));

export class Governance {
  constructor({ activeRelease, candidate }) {
    this.activeRelease = immutable(structuredClone(activeRelease));
    this.revisions = [immutable({ ...candidate, state: "DRAFT" })];
    this.evidence = {};
    this.staleEvidence = [];
  }
  get current() { return this.revisions.at(-1); }
  get releaseHistory() { return Object.freeze([this.activeRelease]); }
  updateDraft(changes) {
    if (this.current.state !== "DRAFT") throw new Error(`Cannot update a ${this.current.state} revision; create a new revision first`);
    this.revisions[this.revisions.length - 1] = immutable({ ...this.current, ...changes, state: "DRAFT" });
    return this.current;
  }
  edit(changes) {
    if (Object.keys(this.evidence).length) this.staleEvidence.push(immutable({ logicalId: this.current.logicalId, candidateRevision: this.current.revision, activeReleaseId: this.activeRelease.id, evidence: pinned(this.evidence, this.current.revision, this.activeRelease.id) }));
    this.revisions.push(immutable({ ...this.current, ...changes, revision: this.current.revision + 1, state: "DRAFT", ast: null }));
    this.evidence = {};
    return this.current;
  }
  record(kind, value) {
    const required = { validation: "DRAFT", analysis: "VALIDATED", batch: "ANALYZED" }[kind];
    if (this.current.state !== required) throw new Error(`Cannot record ${kind} from ${this.current.state}`);
    const compatible = ["REDUNDANT", "COMPATIBLE_REFINEMENT", "COMPATIBLE_RELAXATION"];
    const blocked = (kind === "validation" && value.valid !== true) || (kind === "analysis" && !compatible.includes(value.status)) || (kind === "batch" && !value.complete);
    this.evidence[kind] = immutable({ ...value, revision: this.current.revision, releaseId: this.activeRelease.id });
    if (!blocked) this.revisions[this.revisions.length - 1] = immutable({ ...this.current, state: STATES[STATES.indexOf(required) + 1] });
    return !blocked;
  }
  evidenceComplete() {
    const current = ["validation", "analysis", "batch"].every(kind => this.evidence[kind]?.revision === this.current.revision && this.evidence[kind]?.releaseId === this.activeRelease.id);
    const compatible = ["REDUNDANT", "COMPATIBLE_REFINEMENT", "COMPATIBLE_RELAXATION"].includes(this.evidence.analysis?.status);
    return this.current.state === "BATCH_PASSED" && current && this.evidence.validation?.valid === true && compatible && this.evidence.batch?.complete === true;
  }
  startDraft(candidate) {
    if (Object.keys(this.evidence).length) this.staleEvidence.push(immutable({ logicalId: this.current.logicalId, candidateRevision: this.current.revision, activeReleaseId: this.activeRelease.id, evidence: pinned(this.evidence, this.current.revision, this.activeRelease.id) }));
    this.revisions = [immutable({ ...candidate, state: "DRAFT" })];
    this.evidence = {};
    return this.current;
  }
  snapshot() { return structuredClone({ activeReleaseId: this.activeRelease.id, revisions: this.revisions, evidence: this.evidence, staleEvidence: this.staleEvidence }); }
  restore(snapshot) {
    if (snapshot?.releaseHistory || snapshot?.revisions?.some(item => item?.state === "APPROVED_AND_ACTIVATED")) throw new Error("Legacy activation or release state cannot be restored by the Policy Change workbench");
    if (snapshot?.activeReleaseId !== this.activeRelease.id || !snapshot?.revisions?.length) throw new Error("Invalid Policy Change session state");
    const revisions = snapshot.revisions.map(item => {
      if (!item?.logicalId || !Number.isInteger(item.revision) || !STATES.includes(item.state)) throw new Error("Invalid candidate revision in Policy Change session state");
      return immutable(structuredClone(item));
    });
    const current = revisions.at(-1);
    const evidence = snapshot.evidence && typeof snapshot.evidence === "object" && !Array.isArray(snapshot.evidence) ? structuredClone(snapshot.evidence) : {};
    if (Object.keys(evidence).some(kind => !["validation", "analysis", "batch"].includes(kind))) throw new Error("Unknown current evidence kind");
    for (const value of Object.values(evidence)) if (value?.revision !== current.revision || value?.releaseId !== this.activeRelease.id) throw new Error("Current evidence provenance does not match the candidate and baseline");
    const compatible = ["REDUNDANT", "COMPATIBLE_REFINEMENT", "COMPATIBLE_RELAXATION"].includes(evidence.analysis?.status);
    if ((current.state === "VALIDATED" && evidence.validation?.valid !== true)
      || (current.state === "ANALYZED" && (evidence.validation?.valid !== true || !compatible))
      || (current.state === "BATCH_PASSED" && (evidence.validation?.valid !== true || !compatible || evidence.batch?.complete !== true))) throw new Error("Candidate state is not supported by its current evidence");
    const staleEvidence = Array.isArray(snapshot.staleEvidence) ? snapshot.staleEvidence.map(item => {
      if (!item?.logicalId || !Number.isInteger(item.candidateRevision) || item.activeReleaseId !== this.activeRelease.id || !item.evidence || typeof item.evidence !== "object" || Array.isArray(item.evidence)) throw new Error("Invalid stale evidence snapshot");
      for (const value of Object.values(item.evidence)) if (value?.revision !== item.candidateRevision || value?.releaseId !== item.activeReleaseId) throw new Error("Stale evidence provenance does not match its candidate and baseline");
      return immutable(structuredClone(item));
    }) : [];
    this.revisions = [...revisions.slice(0, -1), immutable({ ...current, state: "DRAFT", ast: null })];
    this.evidence = {};
    this.staleEvidence = staleEvidence;
    return this;
  }
  reset({ activeRelease, candidate }) {
    this.activeRelease = immutable(structuredClone(activeRelease));
    this.revisions = [immutable({ ...candidate, state: "DRAFT" })];
    this.evidence = {};
    this.staleEvidence = [];
  }
}
