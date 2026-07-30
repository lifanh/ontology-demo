# AI Credit Review Demo

An illustrative POC showing a controlled credit-review pattern: a real LLM drafts and explains; deterministic code validates, compares, evaluates, and resolves; a person records the final session-scoped Disposition.

The product has two independent views:

- **Customer Review** evaluates four engineered fictional Narrative Customers against six illustrative rules, then optionally asks GPT-5.6 Luna for a grounded rationale and bounded fictional Tier-2 Evidence.
- **Policy Studio** accepts one of two supported policy families, asks GPT-5.6 Luna for a bounded rule draft, validates and compares it deterministically, measures Review impact on a fixed fictional cohort, and activates a Demo Release in the current browser tab only.

This is not a production credit system. It has no production customer data, durable audit, user identities or roles, production policy publication, or automatic customer-state mutation. Apache Jena, SHACL, DMN/Kogito/Drools, and Z3 do not run in this POC. See [`NEXT_STEPS.md`](NEXT_STEPS.md) for the separate production integration direction.

## Runtime modes

### Deterministic-only mode

Static mode needs no password or provider credentials. AI controls are disabled; deterministic review, governance, impact, Dispositions, and tab-scoped Demo Releases remain usable.

```sh
npm clean-install
npm run build
AI_ENABLED=false npm start
```

Persistent product label:

> Illustrative POC · Fictional customer data · AI features disabled

For development, `npm run dev` defaults to this mode and serves the product at `/`. Run `npm run slides:dev` separately while authoring the independent deck. After `npm run build`, `npm start` serves the product at `/` and the deck at `/slides/`.

### AI-enabled Node mode

The canonical full-mode gateway is the Hono application served by Node. Build first, configure the following **server-side environment variable names**, then run `npm start`:

- `AI_ENABLED`
- `DEMO_PASSWORD`
- `SESSION_SECRET`
- `LLM_CHAT_COMPLETIONS_URL`
- `LLM_API_KEY`
- `LLM_MODEL_DISPLAY_NAME`
- `TRUST_PROXY`
- `PORT` (optional)

The chat-completions URL includes the company-approved model destination. `LLM_MODEL_DISPLAY_NAME` is fixed to GPT-5.6 Luna for this POC. Do not expose any of these values to browser code or commit them. `.env.example` documents the shape without usable credentials.

Persistent product label:

> Illustrative POC · Fictional customer data · Real GPT-5.6 Luna calls

The shared-password gate warns:

> This POC uses fictional customer data. In AI-enabled mode, policy text and fictional review context are sent to the company-approved GPT-5.6 Luna endpoint. Do not enter production customer data or confidential policy.

The gateway provides exactly three non-streaming operations: `draft_rule`, `explain_review`, and `explain_policy_analysis`. The browser cannot choose a provider, model, system prompt, customer binding, or evidence-tool arguments. Configuration and credentials remain server-side.

## Portable hosting

`npm start` is vendor-neutral and serves both built assets and same-origin `/api/*` routes from Node. It can run locally, in a container, or on a Node-capable hosting platform. Put TLS in front of it and set `TRUST_PROXY=true` only when the immediate proxy is trusted.

Cloudflare is optional:

- The checked-in Wrangler configuration deploys the assembled site as **deterministic-only static assets**.
- A team that wants AI mode on Workers can add a thin environment/asset adapter around `server/app.js`; the Hono routes, contracts, provider `fetch`, and deterministic executors remain the application boundary. The adapter must keep secrets in Worker bindings, preserve same-origin `/api/*`, and reproduce the Node cookie/origin/body-limit behavior.
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
- AI output is untrusted. Deterministic code owns DSL parsing, types, units, compatibility, impact, rule evaluation, action resolution, and activation gates.
- Mutable product state is isolated to `sessionStorage` in one browser tab. Successful artifacts are keyed to their customer/release evidence; auth, loading, failures, provider internals, and quota state are not product state.
- Dispositions and Demo Releases are session-scoped illustrations, not identities, approvals, publications, customer updates, or audit records.

## Code boundaries

- `src/core/`: domain-neutral facts, authoring, governance, and deterministic runtime.
- `src/domains/credit/`: illustrative ontology, policies, fixtures, action resolution, calculator, and Dispositions.
- `src/ui/`: the two-view browser product and access gate.
- `server/`: Hono auth, operation contracts, OpenAI-compatible provider, and bounded orchestration.
- `slides/`: independent Slidev presentation.
- `artifacts/`: illustrative production-direction examples; not executed by the browser POC.
