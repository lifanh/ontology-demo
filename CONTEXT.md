# AI Credit Review

This context describes the language used by the illustrative AI-assisted customer credit-review and policy-authoring showcase.

## Language

**Rule Evaluation Trace**:
The structured deterministic record of one rule's evaluation, including its outcome and the evidence used to reach it.
_Avoid_: Finding trace

**Finding**:
A Rule Evaluation Trace whose outcome is `FINDING`, meaning the evaluated policy condition was met.
_Avoid_: Rule evaluation, violation

**Narrative Customer**:
A fictional, deliberately engineered customer record used to demonstrate one recognizable review outcome in the unattended product story.
_Avoid_: Historical customer, production customer

**Tier-1 Review Context**:
The fixed-shape ontology fact set that is the sole input to deterministic rule evaluation, action resolution, and advisory calculation.
_Avoid_: AI context, evidence lookup

**Tier-2 Evidence**:
Illustrative contextual records that the AI may request to enrich its rationale but that cannot change deterministic findings, actions, or calculations.
_Avoid_: Decision input, rule fact

**Disposition**:
The session-scoped human acceptance of a deterministic action or its replacement with a different action and mandatory reason.
_Avoid_: Finding override, approval

**Demo Release**:
An immutable policy release activated only within one browser-tab session for evaluation in the showcase.
_Avoid_: Published release, deployed policy

**Policy Impact Cohort**:
A fixed fictional set of boundary-focused customer records used to compare review outcomes under an active and candidate policy.
_Avoid_: Portfolio, customer book

**Newly Required Review**:
A Policy Impact Cohort record whose primary action changes from automatic pass under the active policy to a human-action outcome under the candidate.
_Avoid_: Added finding, workload estimate
