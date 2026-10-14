# GitHub Copilot Prompt: LangChain Model Switching (Final Merged Version)

## Role

You are a Principal Software Engineer and LangChain/TypeScript architect working inside an **existing** repository. You enhance it; you do not rebuild it.

## Project Context

An AI-powered **User Story-to-Test Case Generator** (Week 3 project).

- Frontend: React + TypeScript + Vite
- Backend: Node.js + Express + TypeScript (strict mode)
- Validation: Zod
- Current LLM integration: Groq API (direct SDK)
- External integration: Jira REST API (email + API token)
- Output: structured JSON test cases (positive, negative, edge, authorization, non-functional), shown in the UI with expandable details and Excel export

## Objective

Integrate LangChain into the existing backend and implement **configurable model switching with fallback**:

1. LangChain is integrated into the existing app.
2. A model-switching component built on LangChain.
3. Switching between **multiple providers (Groq, Google Gemini, OpenAI, Anthropic) and models** based on server-side configuration. Groq is the required default; the other providers must be fully implemented and activate automatically when their API key is present.
4. Handling of HTTP 429 rate limits, model availability issues, and task-specific model selection.
5. Automated tests proving the switching and fallback work.

**Expected outcome:** the same app, now using LangChain, with configurable model switching and appropriate fallback, and with all existing behavior unchanged.

---

# Global Rules (apply in every phase)

## 1. Inspect before modifying
- Examine the repo: structure, all `package.json` files, existing LLM service, Express routes, Zod schemas, error-handling middleware, env usage, Jira integration, frontend components, test setup.
- Trace the flow: `user story input -> API route -> Zod validation -> Groq call -> parse/validate JSON -> UI render -> Excel export`.
- The repository is the source of truth. **Do not assume** file names, function names, schema names, or env-variable names. Use the real ones.

## 2. Preserve existing functionality
- Keep existing endpoints, request/response contracts, Zod rules, Jira auth and retrieval, UI behavior, and Excel export working.
- Keep the generated test-case JSON schema and required fields unchanged.
- **Do not change the response shape consumed by the frontend.** If model metadata is useful (`modelUsed`, `provider`, `fallbackTriggered`), add it as an **optional, additive** field only after confirming the frontend and Excel exporter ignore unknown fields. Propose this to me first.
- Do not touch unrelated files. Avoid breaking changes to imports, signatures, and interfaces.

## 3. Protect configuration and secrets
- Never modify, overwrite, rename, or delete existing `.env` files or existing env-variable names/values.
- Never hardcode keys, expose secrets in code, logs, frontend responses, or docs.
- If new config is needed, **list the proposed new variables and their purpose first and wait for approval**. Reuse existing variables wherever possible.
- Update `.env.example` only if it exists and only with placeholders, never real secrets.
- Provider keys stay on the backend only. Never use `VITE_` variables for secrets.

## 4. Use LangChain natively
- Use LangChain JS/TS abstractions instead of hand-written try/catch retry loops:
  `RunnableSequence`, `ChatPromptTemplate`, `.withStructuredOutput()`, `.withFallbacks()`.
- Check installed package versions and official package interfaces before choosing APIs. Do not assume method names from memory. Do not upgrade unrelated dependencies.
- Prefer provider-specific packages: `@langchain/groq`, `@langchain/google-genai` (Gemini), `@langchain/openai`, `@langchain/anthropic`. Verify each is compatible with the installed `@langchain/core` before installing.
- Keep provider-specific code behind one common service interface.
- Do not leave two competing LLM implementations. Refactor the existing Groq call into the new service safely.

## 5. Security of model selection
- Model/provider selection must come from a **server-side allowlist/config**.
- A client may only request an allowed **tier or alias** (for example `fast` or `deep`), never a raw provider or model name.
- Validate any selection input with Zod, following existing conventions. Unknown values must be rejected with a safe error.

## 6. Controlled phases
- Do **only** the currently authorized phase.
- After each phase report: files inspected/changed, implementation details, commands run, **actual** test results, and remaining risks.
- Do not start the next phase until I explicitly approve.
- If blocked (missing credential, incompatible package, architectural issue), stop and ask. Do not invent a workaround.
- Never claim a test passed unless you ran it and checked the result. Clearly separate: passed / failed / skipped / could not run.

---

# Phase 1 - Discovery and Plan (authorized immediately)

**Do not write code, install packages, or edit files in this phase.**

## Tasks
1. Inspect and identify:
   - frontend and backend entry points
   - current Groq integration and invocation flow
   - the test-case generation prompt and output parsing
   - Zod schemas (exact names and fields)
   - Express routes and error middleware
   - Jira integration
   - env-variable usage (exact names)
   - package manager, Node version, `tsconfig` settings, test framework
   - existing tests
2. Trace the current workflow end to end.
3. Decide what is reusable and what must change.
4. Check LangChain dependency compatibility with current versions (core, groq, and any optional provider). Report the Groq models currently configured, and **verify they are still available** (Groq retires models often).
5. Propose the design for:
   - model/provider selection from config
   - tiers/profiles (`default`, `fast`, `deep`) mapped to configured models
   - fallback chain order
   - 429 handling, availability errors, timeouts, transient 5xx
   - structured output and invalid-output handling
   - task-specific model selection
   - how metadata about the model used reaches the response (additive, non-breaking)
6. List every expected file change with the reason.

## Required output
- Architecture summary and existing LLM flow
- Relevant files and responsibilities
- Proposed LangChain architecture
- Config strategy (including any **new** env variables, proposed but not created)
- Error-handling and fallback strategy
- File-by-file change list
- Dependency changes
- Risks, assumptions, open questions
- Phase-by-phase plan

**Stop and wait for my approval.**

---

# Phase 2 - LangChain Integration (Groq only, behavior unchanged)

**Prerequisite: my approval of Phase 1.**

## Tasks
1. Install only the approved LangChain packages at compatible versions.
2. Create a dedicated backend service (for example `LLMService` / `TestCaseGenerationService`; follow the repo's naming conventions) that wraps the existing generation through LangChain.
3. Build the pipeline with native abstractions:
   `ChatPromptTemplate -> model (.withStructuredOutput(existingZodSchema)) -> RunnableSequence`.
   - Preserve the **existing prompt content** and the **existing Zod schema**; do not redefine them.
   - Inputs to the prompt should match what the current code already passes (for example story title, description, acceptance criteria), flattened the same way as today.
   - Set a low temperature (0.1-0.2) for deterministic output, unless the existing config already sets one.
4. Route the existing Groq call through this service. The Express route and its response contract stay the same.
5. Do not modify the frontend.

## Validation
- TypeScript compile and build pass.
- Existing tests pass.
- No broken imports or dependency conflicts.
- Generation flow still works with the same output shape (use a mock or, if I allow it, one live call).

**Exit criteria:** LangChain is integrated, Groq flow works through it, nothing else changed. Report and stop.

---

# Phase 3 - Configurable Model Switching

**Prerequisite: my approval of Phase 2.**

## Tasks
1. Implement a **model factory / registry** (for example `LLMFactory`) separate from generation logic:
   - Reads provider config and API keys from `process.env` (reuse existing names; propose new ones for approval).
   - Builds a LangChain chat model per allowlisted entry: provider, model name, temperature, timeout.
   - Fails with a **clear backend error** when a required key or config is missing.
2. Define typed config for:
   - Providers: `groq` (required default), `gemini` (Google), `openai`, `anthropic`. **All four must be implemented in the factory.** Each non-Groq provider is **enabled at runtime only when its API key is present**; if the key is missing it is skipped cleanly (not an error), and requesting it explicitly gives a clear safe error. Propose env variable names (for example `GOOGLE_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`) and exact model IDs for approval first, and verify the model IDs exist before use.
   - Tiers/profiles: `default`, `fast`, `deep` (names may follow the repo's conventions).
3. Task-specific routing through config or an explicit routing policy, for example:
   - test-case generation
   - JSON correction/recovery (only if needed)
   - future tasks
   Do not add extra model calls or change the generation workflow unless required and approved. Do not assume a different model is automatically better.
4. Allow the request to optionally pick a **tier** (for example `tier: "fast" | "deep"`), validated with Zod and mapped server-side. The frontend cannot override server restrictions.
5. Selection must be deterministic and unit-testable.

## Validation
- Default model is selected when nothing is specified.
- A supported alternative tier resolves to the configured model (for example `deep` routes to the configured reasoning model).
- Unsupported provider/model/tier is rejected safely.
- Missing config/key gives a clear backend error.
- Verify with an isolated test that `LLMFactory` returns a working `BaseChatModel` for Groq and validates required keys.

**Exit criteria:** selection works through the backend with no change to output contracts. Report and stop.

---

# Phase 4 - Fallback and Failure Handling

**Prerequisite: my approval of Phase 3.**

## Design requirements
- Build the fallback chain with LangChain's native `.withFallbacks()`.
- **Order matters:** apply `.withStructuredOutput(schema)` to **each** model first, then wrap the structured runnables with `.withFallbacks({ fallbacks: [...] })`. (The fallback wrapper does not expose `.withStructuredOutput()`, so doing it the other way round will fail.) Confirm this against the installed version.
- Chain: **primary -> secondary -> emergency model**, built from the configured, enabled providers. Example order: Groq primary -> second Groq model -> Gemini -> OpenAI/Anthropic (whichever have keys). The chain must support **cross-provider fallback** (for example Groq 429 -> Gemini), not just same-provider model swaps. Disabled providers are skipped automatically.
- Configure the primary model with **low `maxRetries` (0 or 1)** so fallback triggers quickly instead of waiting through long default retry cycles. Retries must be bounded.
- Fallback order is explicit and configurable. Do not assume every provider supports every model.

## Error eligibility (do not switch on every error)

| Error type | Behavior |
|---|---|
| HTTP 429 / rate limit | Respect `Retry-After` if present, bounded retry with backoff + jitter, then fallback |
| Quota exhausted | Fallback |
| Model not found / decommissioned / provider unavailable | Fallback if configured, else clear sanitized error |
| 5xx / network failure / timeout | Bounded retry, then fallback |
| 401/403 auth, 400 invalid request, bad model config | **No retry, no silent fallback**; fail with a controlled error |
| Invalid LLM output (fails Zod) | Do not return as success; at most one bounded correction attempt, never an unlimited loop |

Use `exceptionsToHandle` / error filtering so only eligible errors trigger fallback.

## Observability
- On a switch, log exactly:
  `[ModelSwitch] Primary model failed with status <STATUS/ERROR>. Falling back to <FALLBACK_MODEL_NAME>`
- Log safe diagnostics only: provider, model id, attempt count, error category. Never log secrets or full user-story content.
- Capture which model **actually served** the request (via a LangChain callback or equivalent) and expose `modelUsed`, `provider`, `fallbackTriggered` through the approved additive metadata field.

## Total failure
- If all models fail, return a **controlled HTTP 503** through the existing error-handling conventions, with a structured, sanitized body (no stack traces, no secrets, no raw provider payloads).

## Validation (mocked, no real quota)
- Primary success
- 429 then recovery
- 429 after retries exhausted -> fallback success
- Primary unavailable -> fallback success
- Primary and fallback both fail -> 503
- Auth / invalid-request failure -> no inappropriate retry
- Network timeout -> bounded handling
- Invalid model output -> not returned as success
- Switch log line is emitted

**Exit criteria:** fallback is deterministic, bounded, observable, and tested. Report and stop.

---

# Phase 5 - Automated Tests and Regression

**Prerequisite: my approval of Phase 4.**

Use the repo's **existing** test framework. Do not add a new one without approval. Mock all LLM and Jira calls; ordinary tests must not need live keys or consume quota.

Create `testCaseGenerator.test.ts` (or follow the repo's naming) plus unit tests for the factory/selection, covering:

| Scenario | Expected result |
|---|---|
| Happy path | Generation succeeds on the primary model |
| Default selection | Configured default is chosen |
| Dynamic switching (`tier: "deep"`) | Routes to the configured reasoning model |
| Unsupported tier/model | Safe validation error |
| Simulated 429 on primary | Fallback transparently serves the request; API call still returns 200 |
| Cross-provider fallback | Groq fails (429) -> Gemini (mocked) serves the request |
| Provider without API key | Skipped cleanly in the chain; explicit request gives safe error |
| Each provider builds | Factory returns a valid chat model for Groq, Gemini, OpenAI, Anthropic when keys are mocked |
| Model unavailable | Eligible fallback or controlled failure |
| Auth failure | No inappropriate retry |
| Network timeout | Bounded handling |
| Complete exhaustion | API returns **HTTP 503** with a structured sanitized error |
| Valid LLM JSON | Existing schema accepts it, no raw markdown fences |
| Invalid LLM JSON | Existing validation/error handling applies |
| Express integration (supertest) | Valid POST returns 200 with test cases (and metadata if approved) |
| Jira story retrieval | Still works |
| Frontend test-case rendering | Still works |
| Excel export | Still works |

Run the full available regression suite and report passed / failed / skipped / could not run.

**Exit criteria:** switching and failure scenarios are meaningfully covered and existing functionality is regression-tested. Report and stop.

---

# Phase 6 - Final Verification and Documentation

**Prerequisite: my approval of Phase 5.**

1. Run backend tests, frontend tests, type checks, and builds.
2. Review the final diff for unrelated changes.
3. Confirm `.env` files and existing variable names/values were untouched.
4. Confirm the Jira integration, UI rendering, and Excel export are compatible.
5. Update existing docs (do not create duplicates) covering:
   - LangChain architecture
   - supported providers and configured models
   - how selection and tiers work
   - how to configure a fallback chain
   - rate-limit and availability handling
   - how to run the tests
   - known limitations and prerequisites
6. Do not claim production readiness based only on mocked tests or a successful compile.

## Final report
Summary, files created/modified and why, dependencies changed, selection and fallback behavior, test commands with **actual** results, regression results, config requirements, remaining limitations, and confirmation that existing functionality and configuration were preserved.

---

# Definition of Done

- LangChain is integrated into the existing backend.
- The Groq flow still works through the new service.
- Selection follows server-side config and an allowlist; clients cannot pass raw model names.
- Groq, Gemini, OpenAI and Anthropic are all supported; each is enabled when its key is present, and cross-provider fallback works.
- Eligible failures trigger the configured fallback chain; ineligible ones fail safely.
- 429 handling uses bounded retries with backoff.
- Fallback transitions are logged in the required format and the serving model is reported.
- Total failure returns a controlled 503.
- Output keeps the existing JSON schema and UI contract.
- Jira retrieval and Excel export still work.
- Automated tests cover switching and failure scenarios; builds and regressions were actually run and reported.
- `.env` files, credentials, and variable names are unchanged.
- No unrelated code was modified.

---

## Immediate instruction

**Start Phase 1 only.** Inspect the repository, trace the current implementation, and present the discovery report and plan. Do not write code, install packages, or modify any file. Wait for my explicit approval before Phase 2.
