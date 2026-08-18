# AI Credit Review Demo

An illustrative POC showing a controlled credit-review pattern: a real LLM drafts and explains; deterministic code validates, compares, evaluates, and resolves; a person records the final session-scoped Disposition.

The product has two independent views:

- **Customer Review** evaluates four engineered fictional Narrative Customers against six illustrative rules, then optionally asks GitHub Copilot for a grounded rationale and bounded fictional Tier-2 Evidence.
- **Review Policy** is a session-scoped Policy Change workbench. It compares a structured candidate with the Active Policy Version and pins deterministic validation, compatibility, and Review impact evidence to the exact candidate revision and baseline. GitHub Copilot may optionally draft or explain; deterministic-only mode offers example candidates and manual source editing. Evidence complete is the terminal POC state—not approval, publication, or activation.

This is not a production credit system. It has no production customer data, durable audit, user identities or roles, production policy publication, or automatic customer-state mutation. Apache Jena, SHACL, DMN/Kogito/Drools, and Z3 do not run in this POC. See [`NEXT_STEPS.md`](NEXT_STEPS.md) for the separate production integration direction.

A second demo, **v2**, is served at `/v2/`. Its structure and style follow the SE vision prototype (`docs/prototypes/customer_review_prototype.html`) under the framing *AI proposes the review result of every account; credit analysts decide*. The v1 demo at `/` stays unchanged. See `docs/prototypes/v2-plan.md` for the phased plan; Phases 0–2 are in place: the v2 worklist and review detail are driven by the shared deterministic engine (`src/core/runtime.js` + the credit pack), decisions are recorded per policy release in browser-tab state, and Configure rules opens a v2 Policy Change workbench with bounded drafting, deterministic validation, compatibility, Review impact, and candidate-preview badges.

## Runtime modes

### Deterministic-only mode

Static mode needs no password or provider credentials. AI controls are disabled; deterministic review, candidate validation and comparison, impact assessment, and session-scoped Dispositions remain usable.

```sh
npm clean-install
npm run build
AI_ENABLED=false npm start
```

Persistent product label:

> Illustrative POC · Fictional data · Deterministic mode

For development, `npm run dev` defaults to this mode and serves the product at `/`. Run `npm run slides:dev` separately while authoring the independent deck. After `npm run build`, `npm start` serves the product at `/` and the deck at `/slides/`.

### AI-enabled Node mode

The canonical full-mode gateway is the Hono application served by Node. Build first, configure the following **server-side environment variable names**, then run `npm start`:

- `AI_ENABLED`
- `DEMO_PASSWORD`
- `SESSION_SECRET`
- `COPILOT_GITHUB_TOKEN` (optional locally; recommended for hosted automation)
- `COPILOT_MODEL` (optional; defaults to `gpt-5.6-luna`)
- `COPILOT_HOME` (optional; defaults to `~/.copilot`)
- `TRUST_PROXY`
- `PORT` (optional)

For a local single-operator demo, omit `COPILOT_GITHUB_TOKEN` to let the SDK use stored Copilot CLI credentials or `gh auth` credentials from `~/.copilot`; the account needs Copilot access. The SDK can also discover `COPILOT_GITHUB_TOKEN`, `GH_TOKEN`, or `GITHUB_TOKEN` from the environment. The SDK disables keychain access in server-safe `empty` mode, so local stored credentials require its `copilot-cli` client mode; the session still receives only the server-owned custom-tool allowlist and no config discovery, memory, or embedding retrieval. Do not use that fallback for hosted or shared deployments: set an explicit `COPILOT_GITHUB_TOKEN`, which enables `empty` mode and prevents the process from inheriting a machine user's identity. `COPILOT_MODEL` selects a model available to that identity, and `COPILOT_HOME` selects a writable SDK runtime-state directory. Do not expose tokens to browser code or commit them. `.env.example` documents the shape without usable credentials.

Persistent product label:

> Illustrative POC · Fictional data · AI enabled

The shared-password gate warns:

> This POC uses fictional customer data. In AI-enabled mode, policy text and fictional review context are sent through the GitHub Copilot SDK. Do not enter production customer data or confidential policy.

The gateway provides exactly three non-streaming operations: `draft_rule`, `explain_review`, and `explain_policy_analysis`. The browser supplies the selected fictional customer in a minimized review snapshot; the model cannot choose or override that binding, and evidence tools accept no customer argument. The browser cannot choose a provider, model, system prompt, or evidence-tool arguments. Configuration and credentials remain server-side. Deliberate browser tampering is outside this illustrative POC's security claims; generated prose remains non-authoritative and cannot mutate state.

## Portable hosting

`npm start` is vendor-neutral and serves both built assets and same-origin `/api/*` routes from Node. It can run locally, in a container, or on a Node-capable hosting platform. Put TLS in front of it and set `TRUST_PROXY=true` only when Node is reachable exclusively through one trusted immediate proxy. That proxy must sanitize forwarded headers; the gateway treats the rightmost `X-Forwarded-For` entry as the address appended by that one trusted hop.

Cloudflare is optional:

- The checked-in Wrangler configuration deploys the assembled site as **deterministic-only static assets**.
- AI-enabled mode requires a Node host that can run the Copilot SDK and its bundled CLI runtime; it does not run on Cloudflare Workers. A separate edge deployment would need to proxy same-origin `/api/*` to that trusted Node service while preserving the cookie, origin, and body-limit behavior.
- Teammates do not need Cloudflare to run or share the full demo; the Node runtime is canonical.

Do not deploy the repository root. [`scripts/build-site.mjs`](scripts/build-site.mjs) assembles an allowlisted `dist/`: the product at `/`, the independent deck at `/slides/`, and no server source, package metadata, or credentials.

## Install, test, and build

Node 24 is pinned in `.node-version`; `package.json` supports Node 22 through 24.

```sh
curl -fsSL https://vite.plus | bash
export PATH="$HOME/.vite-plus/bin:$PATH"
npm clean-install
npm test
```

`npm test` runs domain and gateway tests, lint, the allowlisted build, site/claim/secret checks, and an isolated Chromium state workflow. Default tests never call a real provider.

An explicit opt-in smoke calls all three operations with fictional inputs and validates the returned schemas and references without printing prompts, generated content, endpoint details, or secrets:

```sh
LIVE_AI_SMOKE=true AI_ENABLED=true npm run test:live-ai
```

Supply the same server-side AI configuration names listed above. This command is intentionally excluded from `npm test` and CI.

Build and preview the two applications:

```sh
npm run build
AI_ENABLED=false npm start
```

Run the Slidev authoring server or export the deck:

```sh
npm run slides:dev
npm run export:pdf
```

Generated `dist/` and `build/` output is intentionally untracked.

## Trust and state boundaries

- CIS APIs would supply authoritative fact values in production. In this POC all customer and evidence data is fictional and fixed.
- Tier-1 Review Context alone drives deterministic Findings, actions, and calculations. Tier-2 Evidence can enrich generated prose but cannot change them.
- AI output is untrusted. Deterministic code owns DSL parsing, types, units, compatibility, impact, rule evaluation, and action resolution. The current workbench does not expose policy approval, publication, or activation.
- Mutable product state is isolated to `sessionStorage` in one browser tab. Successful artifacts are keyed to their customer/policy-version evidence; auth, loading, failures, provider internals, and quota state are not product state.
- Review workflow, Dispositions, and policy authoring state are session-scoped illustrations, not identities, approvals, publications, customer updates, or audit records.

## Code boundaries

- `src/core/`: domain-neutral facts, authoring, governance, and deterministic runtime.
- `src/domains/credit/`: illustrative ontology, policies, fixtures, action resolution, calculator, and Dispositions.
- `src/ui/`: the two-view browser product and access gate.
- `server/`: Hono auth, operation contracts, GitHub Copilot SDK provider, and bounded orchestration.
- `slides/`: independent Slidev presentation.
- `artifacts/`: illustrative production-direction examples; not executed by the browser POC.
