# LangChain Persistent Memory with MongoDB — Implementation Plan

## Goal

Add persistent conversational context and generation history to the existing RAG application without changing the behavior of its current ingestion, embedding, search, reranking, summarization, or generic prompt-testing flows.

## Current Project Baseline

- The backend is an Express application in `server/index.js`.
- MongoDB access uses the official `mongodb` Node.js driver and the configured `DB_NAME`.
- Existing collections are configured for test cases and user stories; the application already performs vector and BM25/hybrid retrieval.
- LLM calls are routed through the existing multi-provider service in `src/scripts/utilities/llmService.js`.
- The frontend is a React/Vite app. Search features are present, but a dedicated test-case-generation workflow is not clearly exposed in the current UI. `/api/test-prompt` is a generic prompt-testing endpoint, not a dedicated generation-history API.
- The root project currently has no LangChain dependencies.
- The repository currently has no identified authentication/user identity flow. A conversation ID should therefore be treated as a client/browser conversation identifier, not as an authenticated user identity.

## Compatibility Principle

Implement this as an additive feature:

1. Add a dedicated test-case-generation request flow, rather than repurposing existing search or `/api/test-prompt` routes.
2. Add LangChain/MongoDB persistence behind that flow.
3. Keep the existing `chatCompletion` provider/fallback configuration where practical so provider selection and existing behavior are preserved.
4. Do not change existing search collections or their document/index schemas.
5. Ensure a persistence failure is reported explicitly. Do not claim a generation was saved when it was not. Decide whether a successful model response is returned if persistence fails before implementation; recommended default is return a clear error with the generated result available only if the API contract can represent partial success safely.

## Required Phase-Completion Handoff

At the end of **every phase**, provide a phase-completion report before starting the next phase. It must include:

- What was implemented and which files/configuration changed.
- What automated checks were run and their results.
- How to validate that phase manually.
- If an API is available: the exact local URL, HTTP method, headers, copy-paste Postman payload, expected response fields, and error cases to try.
- If a UI is available: the exact navigation/actions and expected visible behavior.
- If MongoDB persistence is available: the database/collection names and concrete MongoDB Compass or `mongosh` query to verify saved records, IDs, timestamps, and conversation isolation.
- Any prerequisite not yet available and the specific validation that must wait for a later phase.

Do not present a future-phase API or UI as already implemented. Mark sample endpoint paths/payloads as proposed until the corresponding phase is complete. Use placeholders for credentials and never include `.env` secrets in reports.

## Proposed Architecture

```text
React generation UI
    |
    | conversationId + query + optional executionId
    v
New Express generation endpoint
    |
    +--> Existing RAG retrieval functions / existing MongoDB test-case data
    |
    +--> Existing LLM service (unless a LangChain model adapter is selected)
    |
    +--> LangChain MongoDB chat history <--> dedicated memory collection
    |
    +--> Generation metadata persistence <--> dedicated generation-history collection
```

Use two dedicated collections, separate from `test_cases` and `user_stories`:

- `conversation_memory`: LangChain-compatible chat messages keyed by `conversationId`.
- `test_case_generation_history`: one durable record per generation execution, including the query, output, timestamps, and correlation IDs.

This separation keeps LangChain's message-history storage format independent from the generation record schema while allowing both stores to share the configured MongoDB database.

### LangChain integration decision

Before implementation, confirm the supported package/API versions and select one integration pattern:

- **Preferred compatibility path:** use LangChain's MongoDB chat-history integration (for example `MongoDBChatMessageHistory`) to load and persist messages, and adapt those messages into the existing `chatCompletion` call. This avoids replacing existing provider/fallback behavior.
- **Alternative:** use LangChain's message-history runnable (`RunnableWithMessageHistory`) with a supported LangChain chat model. This may require provider adapters and could duplicate or change the existing provider/fallback path, so use it only if it can preserve current configuration and behavior.

Do not introduce deprecated LangChain memory APIs without checking the currently installed package documentation and version compatibility.

## Identifiers and Data Model

Generate identifiers server-side using a collision-resistant UUID (for example `crypto.randomUUID()`):

- `conversationId`: stable across turns in the same conversation; generated on first use and returned to the client.
- `executionId`: unique for every test-case generation request; supplied by the client only if there is a defined retry/idempotency need, otherwise generated by the server.
- `memoryRecordId`: unique ID for each persisted conversation turn/message. Use LangChain's supported message ID mechanism if available; otherwise persist a separately generated ID alongside the message.

### `conversation_memory` message record

The inspected `@langchain/mongodb` `MongoDBChatMessageHistory` implementation uses one document per conversation/session and appends serialized messages to a `messages` array. It keys the document using `sessionId`; it does not expose a separate per-message record ID option. The likely mapping is `sessionId = conversationId`. Preserve the LangChain schema rather than replacing it with an incompatible custom shape.

Create one application-level `memoryRecordId` per generation turn and associate it with both the corresponding human/AI messages (through supported message metadata if verified during implementation) and the generation-history record. Do not claim that the LangChain history document itself has one MongoDB record per message.

```json
{
  "_id": "mongodb-generated-session-document-id",
  "sessionId": "conversation-uuid",
  "messages": [
    {
      "type": "human | ai",
      "data": {
        "content": "message text or serialized structured content",
        "additional_kwargs": {
          "memoryRecordId": "generation-turn-uuid",
          "executionId": "generation-execution-uuid"
        }
      }
    }
  ]
}
```

Treat the message serialization above as illustrative; use the package's actual serialization and verify whether it preserves the additional metadata. If it does not, retain `memoryRecordId` and the message-to-execution mapping in `test_case_generation_history` without patching LangChain's private internals.

### `test_case_generation_history` record

```json
{
  "_id": "generation-record-uuid",
  "conversationId": "conversation-uuid",
  "executionId": "generation-execution-uuid",
  "userQuery": "request used to generate test cases",
  "generatedTestCases": [],
  "retrievalMetadata": {
    "sourceCollection": "test_cases",
    "retrievedIds": []
  },
  "generationMetadata": {
    "provider": "provider-name",
    "model": "model-name",
    "fallbackUsed": false
  },
  "createdAt": "ISO-8601 timestamp"
}
```

The record may include RAG context references and token/model metadata already returned by the existing LLM service. Avoid storing API keys, credentials, or unnecessary copies of retrieved source documents.

## Phased Implementation

### Phase 1 — Confirm contracts and compatibility

- [x] Identify the intended test-case-generation user flow and define the expected input/output shape.
- [x] Confirm the proposed execution-ID policy: one new server-generated `executionId` per generation request; retries are separate executions unless idempotency is explicitly added later.
- [x] Select a compatible LangChain MongoDB chat-history package candidate for this Node.js project.
- [x] Verify the package's session-level MongoDB storage model and clear behavior; message-ID metadata support remains a Phase 2/3 prototype check.
- [x] Choose the compatibility-first pattern: use MongoDBChatMessageHistory to load/store context and adapt it into existing `chatCompletion`, preserving current provider/fallback behavior.
- [x] Record current endpoint behavior as regression expectations: keep `/api/test-prompt` generic and add a distinct generation endpoint.

**Deliverable:** proposed API and persistence contracts, pending user approval; no changes to existing routes.

**Phase 1 findings and recommendations**

- Runtime found: Node.js `v24.12.0`; npm `11.19.1`.
- Current published package metadata checked: `@langchain/mongodb@1.3.1` requires Node.js `>=20` and peers with `@langchain/core@^1.0.0`. The checked `@langchain/core@1.2.17` also requires Node.js `>=20`; the current runtime satisfies both requirements.
- Package API checked: `MongoDBChatMessageHistory` accepts `{ collection, sessionId }` and provides `getMessages()`, `addMessage()`, and `clear()`. It stores a session document keyed by `sessionId` with serialized messages in a `messages` array. Its documented `clear()` deletes that conversation's history document, so do not expose it as an ordinary UI action without an explicit deletion policy.
- Recommended mapping: `sessionId` is the `conversationId`; persist a per-generation `memoryRecordId` and `executionId` in the generation-history record and message metadata only if serialization preserves it.
- Proposed additional collections: `conversation_memory` and `test_case_generation_history`, both in the configured `DB_NAME`; do not modify `test_cases` or `user_stories`.
- Proposed generation API: `POST /api/test-cases/generate`, a new route separate from `/api/test-prompt` and search endpoints.
- Proposed conversation policy: the server generates `conversationId` if omitted; the UI retains and sends it for follow-up turns. IDs are correlation values, not user authentication. This matches the current repository baseline, which has no identified authentication flow.
- Proposed execution policy: server-generated UUID per generation request. A retry is a new execution for now; add idempotency only if duplicate suppression becomes a requirement.
- Proposed RAG/generation flow: reuse existing test-case retrieval and `chatCompletion`; include prior conversation messages in the generation prompt; store user query and generated test cases in the generation-history record; store corresponding human/AI messages in LangChain history.
- Proposed persistence failure behavior: return an explicit error with `persisted: false` and correlation IDs if generation has run but MongoDB persistence fails. Do not indicate success or silently drop history.
- Retention/history-window behavior is a remaining design choice. Recommended initial behavior: retain persisted history and bound only the messages sent to the model by a documented configurable context/token window.
- No API, UI, MongoDB collection, dependency, or application code has been changed in Phase 1.

### Detailed proposed Phase 1 contract for approval

#### User journey

1. User opens a dedicated test-case generation screen; existing search screens remain unchanged.
2. User submits a request describing a feature or workflow.
3. The backend reuses existing test-case retrieval, loads prior LangChain messages for this conversation, and calls the existing configured LLM service.
4. The backend stores the human/AI exchange in `conversation_memory` and the generation result/metadata in `test_case_generation_history`.
5. The UI displays generated test cases and retains the returned `conversationId` for a follow-up request.
6. “New conversation” starts a new conversation ID. It does not delete prior MongoDB records.

#### Request proposal

```http
POST http://localhost:3001/api/test-cases/generate
Content-Type: application/json
```

```json
{
  "conversationId": "optional-uuid-from-a-prior-response",
  "query": "Generate test cases for the password reset flow",
  "filters": {},
  "limit": 10
}
```

- `query`: required, trimmed, non-empty string.
- `conversationId`: optional UUID. Generate one on the server if omitted. Reuse it for follow-up turns.
- `filters`: optional object using supported test-case metadata filters from current retrieval.
- `limit`: optional positive integer controlling retrieval/context count; proposed default `10`. Agree/validate the maximum during implementation.
- `executionId`: server-generated UUID for every request. Retries are distinct executions in the initial version.
- `memoryRecordId`: server-generated UUID for this generation exchange (human + assistant turn).

No caller-supplied execution ID is proposed for the first implementation; this avoids ambiguous duplicate/replay behavior. If retry idempotency is needed, add it as a separately specified contract.

#### Success response proposal

```json
{
  "success": true,
  "persisted": true,
  "conversationId": "conversation-uuid",
  "executionId": "execution-uuid",
  "memoryRecordId": "memory-turn-uuid",
  "generatedAt": "2026-10-14T09:45:00.000Z",
  "generatedTestCases": [
    {
      "id": "generated-id",
      "module": "Authentication",
      "title": "Reset password with a valid registered email",
      "description": "A registered user requests a password reset.",
      "steps": ["Open the reset page", "Submit a registered email"],
      "expectedResults": "A reset confirmation is displayed and the email is sent",
      "priority": "High",
      "preRequisites": "A registered account exists"
    }
  ],
  "retrieval": {
    "count": 0,
    "sourceIds": []
  },
  "generation": {
    "provider": "configured-provider",
    "model": "configured-model",
    "fallbackUsed": false
  }
}
```

Generated test case fields should align with existing document conventions (`id`, `module`, `title`, `description`, `steps`, `expectedResults`, `priority`, `preRequisites`). Confirm required fields when implementing the concrete output schema.

#### Failure response proposal

- Invalid request: HTTP `400`, `{ "success": false, "error": "..." }`.
- Retrieval/model failure: return a non-2xx status with an explicit error; do not substitute empty memory/results.
- Persistence failure after model completion: return HTTP `503` (or another agreed service-unavailable status), with `{ "success": false, "persisted": false, "conversationId": "...", "executionId": "...", "memoryRecordId": "...", "error": "Generation completed but history could not be saved" }`. Do not report success or durable storage. Decide before API implementation whether generated results are included in this error response.
- Do not unnecessarily log prompts, generated private data, MongoDB URI, or provider secrets.

#### Persistence proposal

`conversation_memory`:

- Use `MongoDBChatMessageHistory` with `sessionId = conversationId`.
- Store the human query and assistant response as LangChain message types.
- Attach `memoryRecordId`, `executionId`, and timestamps as serialized message metadata only after verifying the package preserves them. If not, correlate through the generation-history record; do not patch LangChain internals.
- The package stores a session document with a `messages` array, not a MongoDB document per message.
- Its `clear()` deletes the session document. Do not expose this operation in the first UI release.

`test_case_generation_history`:

- One document per successful generation execution.
- Required fields: `_id` (record UUID), `conversationId`, `executionId`, `memoryRecordId`, `userQuery`, `generatedTestCases`, `retrievalMetadata`, `generationMetadata`, and UTC `createdAt`/`generatedAt`.
- Store source IDs and retrieval metadata, not duplicate full source documents or credentials.
- Suggested indexes: unique `{ executionId: 1 }`; `{ conversationId: 1, createdAt: 1 }`; create the memory lookup index required by the actual LangChain store only after verifying its schema.

#### Context and retention proposal

- Retain the complete persisted exchange history unless a separate retention policy is approved.
- Pass only the most recent turns that fit the generation context budget to the LLM; do not truncate or delete persisted history to fit.
- Set a specific history token budget before Phase 4. Reuse existing token optimization settings only if the prompt budget calculation accounts for retrieved documents, history, and generated output.
- Serialize generated results into assistant message content in a stable documented format (proposed JSON), so later turns can refer to the cases.
- Prevent or serialize concurrent generation requests for the same conversation to preserve deterministic ordering/context.

#### Postman verification proposal (not available until Phase 4)

1. Send the request above without `conversationId`; verify the response returns new `conversationId`, `executionId`, and `memoryRecordId`.
2. Send a different query with that returned `conversationId`; verify the same conversation ID and new execution/memory IDs.
3. Send a request with a different conversation ID; verify it does not receive the first conversation's messages.
4. Send an empty query; verify HTTP `400` and no new memory/history record.
5. Simulate MongoDB unavailability in a safe test environment; verify a clear non-success response that does not claim persistence.

#### MongoDB verification proposal (collections are not created until persistence implementation)

```javascript
use <DB_NAME>

// LangChain chat-history session and serialized messages
db.conversation_memory.findOne(
  { sessionId: "<conversation-id>" }
)

// Per-execution query, generated output, metadata, timestamps, and IDs
db.test_case_generation_history.find(
  { conversationId: "<conversation-id>" },
  {
    executionId: 1,
    memoryRecordId: 1,
    userQuery: 1,
    generatedTestCases: 1,
    retrievalMetadata: 1,
    generationMetadata: 1,
    createdAt: 1,
    generatedAt: 1
  }
).sort({ createdAt: 1 })

// A different conversation must not share this session history
db.conversation_memory.findOne(
  { sessionId: "<different-conversation-id>" }
)
```

**Proposed Postman smoke test (not available until Phase 4)**

```http
POST http://localhost:3001/api/test-cases/generate
Content-Type: application/json
```

```json
{
  "conversationId": "optional-client-held-uuid",
  "query": "Generate three test cases for password reset",
  "filters": {},
  "limit": 10
}
```

Expected eventual success fields: `success`, `conversationId`, `executionId`, `memoryRecordId`, `generatedAt`, `generatedTestCases`, and generation provider/model metadata. For a context check, send a second distinct `query` with the returned `conversationId`; use a different ID to verify isolation. This sample is a proposal only, not an implemented API.

**Proposed MongoDB validation (collections are not created until Phase 3)**

```javascript
use <DB_NAME>
db.conversation_memory.find(
  { sessionId: "<conversation-id>" }
)

db.test_case_generation_history.find(
  { conversationId: "<conversation-id>" }
).sort({ createdAt: -1 })
```

In Phase 3/4, verify the LangChain session document's message array and the generation records' `memoryRecordId`, `executionId`, query, generated cases, and UTC timestamp. Querying a different conversation ID must not return the first conversation's messages.

**Phase 1 validation and handoff**

- No application API or UI is available yet. Validate this phase by reviewing and approving the endpoint contract, ID/idempotency rules, LangChain package/API selection, collection schemas, and failure/retention behavior.
- Include the proposed Postman method, URL, and payload in the handoff, clearly labeled **not available until Phase 4**.
- Include proposed MongoDB collection names and verification fields in the handoff, clearly labeled **collections are not created until persistence implementation**.
- Package versions/API were checked against current published package metadata and declarations; implementation-time lockfile resolution and a real MongoDB round-trip must still be verified in later phases.
- Approval is pending on the proposed API shape, ID policy, partial-persistence error behavior, history-window/retention policy, and collection design. Resolve those before proceeding to Phase 2.

#### Manual Phase 1 checks

Run these from the repository root in PowerShell. They verify the proposal/runtime facts only; they do not install dependencies or modify the project:

```powershell
node --version
npm --version
npm view @langchain/mongodb@1.3.1 engines peerDependencies --json
npm view @langchain/core@1.2.17 engines --json
npm ls @langchain/mongodb @langchain/core --depth=0
```

Expected at the time of this Phase 1 review:

- Node.js `v24.12.0` and npm `11.19.1`.
- `@langchain/mongodb@1.3.1` requires Node.js `>=20` and `@langchain/core@^1.0.0`.
- `@langchain/core@1.2.17` requires Node.js `>=20`.
- The LangChain packages are not yet project dependencies; `npm ls` may therefore report them as absent. Do not install them before Phase 2 approval.

To manually inspect the chat-history contract, open this public package declaration in a browser:

```text
https://unpkg.com/@langchain/mongodb@1.3.1/dist/chat_history.d.ts
```

Confirm it declares `MongoDBChatMessageHistory`, constructor input `{ collection, sessionId }`, and `getMessages()`, `addMessage()`, and `clear()`. The package implementation was also inspected and uses a session document with a `messages` array; it does not create a separate MongoDB document for every message.

Optional check of the current API baseline (requires the app already running with its local configuration):

```powershell
Invoke-RestMethod -Uri "http://localhost:3001/api/health" -Method Get
Invoke-RestMethod -Uri "http://localhost:3001/api" -Method Get
```

Expected: the existing health endpoint reports that the server is running, and `/api` lists current routes. This is only a baseline check; it does not validate generation or persistent memory.

**Do not try the proposed generator POST request yet.** `POST /api/test-cases/generate` is not implemented in Phase 1 and is expected not to provide the proposed success response until Phase 4. Likewise, in MongoDB Compass, select the configured database from the local `.env` without sharing its URI or credentials; inspect existing collections only. `conversation_memory` and `test_case_generation_history` are proposed names and should not be expected to exist until persistence implementation.

### Phase 2 — Add isolated configuration and dependencies

- [x] Add only the required LangChain packages to the root dependency manifest and lockfile.
- [x] Add `CONVERSATION_MEMORY_COLLECTION=conversation_memory`.
- [x] Add `GENERATION_HISTORY_COLLECTION=test_case_generation_history`.
- [x] Add these non-secret settings to `.env.example` and the settings/env handling code.
- [x] Use the existing `MONGODB_URI` and `DB_NAME`; no second database connection configuration was added.
- [ ] Validate required collection names at startup or when the new feature is called. Defer this to the Phase 3/4 history service so Phase 2 does not add a new startup behavior before a feature consumes these settings.

**Deliverable:** dependency/configuration support that does not alter existing defaults.

**Phase 2 validation and handoff**

#### Phase 2 changes

- Added `@langchain/core` and `@langchain/mongodb` to the root dependencies and lockfile.
- Added the two collection-name settings to `.env.example`.
- Added defaults and env read/write support in `server/index.js`, including the existing Settings env API.
- Added fields/defaults to the Settings UI database tab. No current search or generation behavior was changed.
- Did not modify the private `.env` file, create MongoDB collections, add API routes, or add generation UI.

#### Phase 2 validation scope and implementation detail

Phase 2 validates **dependency and configuration wiring only**:

1. The selected LangChain packages resolve and can be imported by the installed Node runtime.
2. The backend configuration route resolves both collection names, including defaults when they are absent from `.env`.
3. The Settings screen exposes the two names through the existing settings UI/config save mechanism.
4. Existing backend syntax and frontend production build remain valid.

Phase 2 does **not** validate MongoDB connectivity for this feature, collection-name syntax, collection creation, message writes/reads, generation persistence, or conversation isolation. No new code uses these collection names yet, so attempting those checks now would either test nothing or risk creating/altering collections before the persistence service exists.

The implementation is additive and is limited to:

- Root dependencies: `@langchain/core` provides LangChain message types; `@langchain/mongodb` provides MongoDB chat-message history.
- `.env.example`: documents `CONVERSATION_MEMORY_COLLECTION` and `GENERATION_HISTORY_COLLECTION` defaults.
- Backend `/api/env`: supplies defaults, includes both keys in the known-key configuration serializer, and writes their values when the existing Settings screen saves configuration.
- Frontend Settings: supplies defaults and displays the two editable collection-name fields on the existing database/index tab.
- The app's actual `.env` and MongoDB are not edited by this implementation. The local config API was queried read-only and output was restricted to these two names.

Collection-name syntax validation should run in the **new memory/history service when it is initialized or first used**, not globally at backend startup. This avoids changing startup behavior for unrelated search features. That service should reject missing/blank or MongoDB-invalid names with a clear error before attempting writes. The service should use the existing `MONGODB_URI` and `DB_NAME`, report connection/index/write failures explicitly, and avoid silently creating a success response when persistence fails. Detailed MongoDB integration validation belongs to Phase 3; generation/RAG/API validation belongs to Phase 4.

#### Automated validation results

- `npm ls @langchain/core @langchain/mongodb --depth=0` — passed; resolved `@langchain/core@1.2.17` and `@langchain/mongodb@1.3.1`.
- Node import smoke test for `MongoDBChatMessageHistory`, `HumanMessage`, and `AIMessage` — passed.
- `node --check server/index.js` — passed.
- `npm run build` — passed; Vite built the frontend successfully. Existing large-chunk warning remains (bundle exceeds 500 kB).
- `npm install` reported 18 dependency audit advisories (6 moderate, 9 high, 3 critical). No audit auto-fix was run; investigate dependency advisories separately before production.
- Runtime config check requested `/api/env` locally and printed only the two new collection names, not credentials — returned `conversation_memory` and `test_case_generation_history`.

#### Manual Phase 2 checks

1. In the running app, open **Settings → Database & Indexes**. Confirm the two fields are visible with these defaults:
   - Conversation Memory Collection: `conversation_memory`
   - Test Case Generation History Collection: `test_case_generation_history`
2. In Postman, `GET http://localhost:3001/api/health` should return HTTP `200`. `GET http://localhost:3001/api` should still return the existing route list. No generation endpoint is expected yet.
3. To verify the new values from PowerShell without printing other environment settings (the existing `/api/env` response includes sensitive configuration), run:

```powershell
$cfg = Invoke-RestMethod -Uri "http://localhost:3001/api/env" -Method Get
$cfg | Select-Object CONVERSATION_MEMORY_COLLECTION, GENERATION_HISTORY_COLLECTION | Format-List
```

Expected output contains only the two collection names above. Do not paste or share the unfiltered `/api/env` response.
4. In MongoDB Compass, open the database named by the local `.env` `DB_NAME`. No new collection or documents should exist yet; Phase 2 only configures names. Collection/document validation starts in Phase 3.

**Phase 2 status:** dependency/configuration work and its checks are complete. Collection-name syntax validation is intentionally deferred to the Phase 3 history service; live MongoDB and generation behavior are deferred to Phases 3 and 4. Await user approval before beginning Phase 3.

### Phase 3 — Implement persistent conversation history service

- [x] Add a focused service module for LangChain MongoDB chat history and generation-history persistence.
- [x] Keep MongoClient ownership with the caller; the service takes a connected database and does not unexpectedly open/close the shared client.
- [x] Load prior messages by `conversationId` through `MongoDBChatMessageHistory`.
- [x] Persist the human query, assistant response, generated test cases, retrieval/generation metadata, timestamps, and correlation IDs.
- [x] Generate execution, memory-turn, and history-record UUIDs server-side when omitted.
- [x] Store the unique `memoryRecordId` and `executionId` in LangChain message `additional_kwargs` and the corresponding generation-history document.
- [x] Create indexes for LangChain session ID, unique execution ID, unique memory-record ID, and conversation/time lookup.
- [x] Preserve persisted history; context windowing is intentionally left to the Phase 4 generation orchestration. No clear/delete API is exposed.

**Deliverable:** independently testable history load/save operations and index setup.

**Phase 3 validation and handoff**

- Run focused tests for append/load, message ordering, unique memory IDs, timestamps, and separation between two conversation IDs. Include command and pass/fail summary.
- If the service has a direct test harness, provide its command and sample test data. The public generation API is not expected until Phase 4.
- Verify MongoDB setup using Compass or `mongosh` after the service is invoked with a connected database (Phase 2 configuration alone does not initialize collections):

```javascript
use <DB_NAME>
show collections
db.conversation_memory.find(
  { sessionId: "<test-conversation-id>" }
)
db.test_case_generation_history.find(
  { conversationId: "<test-conversation-id>" }
).sort({ createdAt: 1 }).limit(20)
```

- Explain the actual LangChain message schema found in the collection (it may differ from the illustrative shape above) and identify where `conversationId`, execution correlation, unique message IDs, and timestamps are stored.
- Verify that a second conversation ID returns no records from the first conversation's history. Do not use production conversation data as test data.

#### Phase 3 implementation and validation results

- Implementation: `src/scripts/utilities/persistentGenerationHistory.js` exports `PersistentGenerationHistory`, `GenerationHistoryPersistenceError`, and collection-name validation. The constructor rejects invalid configured names before requesting collections from the database.
- The service is initialized with a database handle obtained by the caller from the existing MongoDB driver. It does not establish another connection or alter existing route behavior.
- `initialize()` obtains the configured collections and creates idempotent indexes: unique `sessionId` in `conversation_memory`, unique `executionId` and `memoryRecordId` in generation history, and `{ conversationId, createdAt }` for ordered history lookup.
- `loadMessages(conversationId)` returns LangChain `BaseMessage` instances in stored order.
- `saveGeneration(...)` creates a pending generation document first, appends a `HumanMessage` and `AIMessage` with `memoryRecordId`, `executionId`, and timestamp metadata, then marks the history record complete. If persistence fails after the record insert, it marks that record `persistence_failed` with the failure stage and throws `GenerationHistoryPersistenceError`; it does not return success.
- Added six focused Node built-in tests in `src/scripts/utilities/persistentGenerationHistory.test.js`; run them with `npm run test:memory`.
- Validation: focused tests pass (6/6); `node --check` and frontend build had passed in Phase 2; package import works. No live MongoDB writes were performed, and there is no public memory/generation endpoint or UI in Phase 3.
- Manual test: rerun `npm run test:memory`. It uses fake collections and is safe; it validates serialization/order, metadata, index definitions, input validation, partial write failure reporting, and conversation isolation without accessing `.env` or MongoDB.
- No Postman request can exercise `saveGeneration` directly yet. `GET http://localhost:3001/api/health` remains the existing server check; `POST /api/test-cases/generate` is still not implemented until Phase 4.
- No actual MongoDB documents or indexes should be expected yet because the service is not connected to the running application and `initialize()` has not been called. After Phase 4 wires it, validate in Compass using `DB_NAME` → `conversation_memory` and `test_case_generation_history`; query memory by `sessionId` and generation records by `conversationId`.
- Remaining Phase 3 validation limitation: the database tests use fake collections, so the Atlas schema/index/write round-trip remains unverified. Perform that round-trip after Phase 4 invokes the service using an isolated test conversation and only targeted test data.

### Phase 4 — Add a dedicated generation API

- [x] Add `POST /api/test-cases/generate` without changing `/api/test-prompt` or existing search endpoints.
- [x] Validate query, UUID conversation ID, supported filters, and result limit.
- [x] Retrieve test-case context with the existing weighted BM25 + vector hybrid approach (including vector-only fallback when BM25 is unavailable).
- [x] Construct generation context from retrieved records and prior LangChain messages.
- [x] Invoke the existing multi-provider `chatCompletion` service to retain provider/fallback behavior.
- [x] Parse/validate generated test cases and normalize their key fields.
- [x] Persist the human turn, assistant turn, and generation-history record with IDs/timestamps.
- [x] Return conversation/execution/memory IDs, generated cases, retrieval sources, and model metadata.
- [x] Report history-read, generation, and persistence failures explicitly; do not replace unavailable history with an empty conversation.

**Deliverable:** an additive end-to-end backend generation path.

**Phase 4 validation and handoff**

#### Postman positive test (requires MongoDB Atlas, a valid vector index/documents, and configured embedding/LLM API keys)

```http
POST http://localhost:3001/api/test-cases/generate
Content-Type: application/json
```

```json
{
  "conversationId": "6ba7b810-9dad-41d1-80b4-00c04fd430c8",
  "query": "Generate three test cases for a password reset flow",
  "filters": {},
  "limit": 10
}
```

There is no authentication middleware in the current project, so no auth header is required. `executionId` and `memoryRecordId` are generated by the server; do not send them in the request. Expect HTTP `200` with `success: true`, `persisted: true`, returned `conversationId`, `executionId`, `memoryRecordId`, ISO `generatedAt`, `generatedTestCases`, retrieval count/source IDs, retrieval method (`hybrid` or `vector-only`), BM25/vector candidate counts, the 0.5/0.5 weights, and generation provider/model/fallback/token metadata.

For continuity, send a second request with the same `conversationId` and a different query, for example:

```json
{
  "conversationId": "6ba7b810-9dad-41d1-80b4-00c04fd430c8",
  "query": "Add cases for an expired reset link, building on the previous generation",
  "filters": {},
  "limit": 10
}
```

The second response must retain the conversation ID while returning new execution/memory IDs. A request with a different UUID must use isolated history.

#### Postman negative checks

- `{"query":" "}` → HTTP `400`, `{"success":false,"error":"Query is required"}`. This was manually checked against the running API.
- Invalid UUID or unsupported filter → HTTP `400` with a validation error.
- Missing/empty test collection, vector index, or documents → HTTP `400` from configuration/collection validation or `422` if vector retrieval returns no relevant cases.
- Embedding/LLM provider failure → HTTP `502`, `success:false`, and a stage/error; prior-history failures return HTTP `503` and `stage:"conversation_history"`.
- MongoDB connection or history persistence failure → non-2xx, `persisted:false`; a post-generation save failure returns HTTP `503` with the IDs and `persistenceStage`.

#### MongoDB Compass / mongosh verification

After one or more successful positive requests, select `DB_NAME` in Compass or run:

```javascript
use <DB_NAME>
db.conversation_memory.findOne(
  { sessionId: "6ba7b810-9dad-41d1-80b4-00c04fd430c8" }
)

db.test_case_generation_history.find(
  { conversationId: "6ba7b810-9dad-41d1-80b4-00c04fd430c8" },
  {
    executionId: 1,
    memoryRecordId: 1,
    userQuery: 1,
    generatedTestCases: 1,
    retrievalMetadata: 1,
    generationMetadata: 1,
    status: 1,
    createdAt: 1,
    generatedAt: 1
  }
).sort({ createdAt: 1 })
```

Confirm the LangChain document is keyed by `sessionId`, its `messages` array contains the human/AI exchange and correlation metadata, and each generation-history document has a distinct execution/memory ID, query/output matching the API response, and BSON Date timestamps. Query with a different `sessionId` to confirm isolation.

#### Phase 4 implementation and validation results

- Added `src/scripts/utilities/testCaseGenerationService.js` for request validation, history-to-chat role mapping, bounded recent-message context, RAG prompt construction, JSON parsing, and output normalization.
- Added `src/scripts/utilities/hybridTestCaseRetrieval.js` for the generation route's weighted BM25 + vector candidate retrieval, score fusion, deduplication, filters, and graceful BM25-unavailable vector fallback. Candidate indexing and default 0.5/0.5 score weights follow the existing `/api/search/hybrid` behavior.
- Updated the dedicated route in `server/index.js` to pass hybrid-retrieved context to the existing generation service. Existing `/api/search/hybrid`, other search routes, and `/api/test-prompt` were not rewritten.
- The generation route invokes the Phase 3 history service to create indexes, load prior conversation messages, and persist user/assistant messages plus generation metadata.
- Focused hybrid retrieval unit tests cover merged/ranked/deduplicated candidates, supported filters, both Atlas pipelines, embedding metadata, and fallback to vector results when BM25 errors.
- `npm run test:memory` — passed, 13/13 tests, including the Phase 3 and generation-service tests.
- `node --check` for `server/index.js`, `testCaseGenerationService.js`, `hybridTestCaseRetrieval.js`, and its test file, plus `git diff --check` — passed.
- No successful live generation request was run: it would call configured embedding/LLM providers and write persistent MongoDB records. The existing blank-query negative check remains valid and does not require those external services.
- This hybrid retrieval adjustment is implemented and awaits user approval before Phase 5. No generation UI has been added.
- `npm run test:memory` — passed, 10/10 tests: history persistence/index/message ordering/conversation isolation/partial failures plus request validation, RAG-context construction, output validation, and explicit history-read failure behavior.
- `node --check server/index.js`, `node --check src/scripts/utilities/testCaseGenerationService.js`, and `node --check src/scripts/utilities/persistentGenerationHistory.js` — passed.
- Runtime API checks: `/api` lists `POST /api/test-cases/generate`; invalid blank-query request returned HTTP `400` with `{"success":false,"error":"Query is required"}`. Existing `/api/health` returned status `OK` (HTTP 200 confirmed earlier).
- A successful end-to-end Postman request was not run during implementation because it calls the configured embedding/LLM providers and writes to the configured MongoDB. Run the positive check above only when ready to create an isolated validation conversation in that database.
- No generation UI exists yet; UI validation is deferred to Phase 5. No live MongoDB documents were created during implementation.

### Phase 5 — Add conversation continuity in the frontend

- [x] Add a dedicated generator screen in the sidebar without disrupting current search screens.
- [x] Retain the active `conversationId` in browser `localStorage` across turns and page reloads.
- [x] Send the active ID on each generation request, omit it on the first request, and store the server-returned ID after success.
- [x] Display generated test cases and generation errors; use the existing Notistack convention for success/clipboard notices.
- [x] Add a new-conversation action that creates a fresh UUID and clears the visible current-session results without deleting server history.
- [x] Surface the execution ID and retrieval method/candidate counts for support and verification.

**Deliverable:** user-visible multi-turn generation with conversation continuity.

**Phase 5 validation and handoff**

- Open the app and choose **AI GENERATION → Test Case Generator** in the sidebar.
- Submit a query and verify generated test cases and the returned conversation/execution IDs appear. The conversation ID is shown above the conversation; use its copy button if needed.
- Submit a different follow-up query without changing the conversation. Confirm the conversation ID remains the same while the execution ID changes.
- Refresh the page. Confirm the same conversation ID is restored from `localStorage`; submit another follow-up to check server-side context continuity. The currently rendered transcript is not reloaded after refresh because no history-read API exists; previous turns remain persisted on the server and are available as LLM context for the next request.
- Choose **New conversation**. Confirm a new UUID is shown, visible results are cleared, and the next request uses the new conversation ID.
- Submit an empty query or temporarily stop the backend and verify the UI presents an inline error. Do not deliberately break provider or database settings in a shared environment.
- To confirm persistence, inspect `conversation_memory` by `sessionId` and `test_case_generation_history` by `conversationId` and `executionId` using the Phase 4 MongoDB queries below. Verify a new conversation has a different session document and does not reuse the earlier conversation ID.
- Backend/provider/MongoDB integration still requires a successful Postman request; the frontend build by itself does not confirm credentials, Atlas index readiness, provider connectivity, or database writes.

#### Phase 5 implementation and validation results

- Added `client/src/components/generation/TestCaseGenerator.js` and a separate sidebar entry in the active `client/src/App.jsx` entry and the parallel `client/src/App.js` copy.
- The screen calls `POST http://localhost:3001/api/test-cases/generate`, shows generated cases and retrieval/generation metadata, retains the active conversation UUID in `localStorage`, and supports starting a fresh conversation.
- `npm run build` — passed. Vite reported the existing large JavaScript chunk warning (1.33 MB minified); build otherwise completed successfully.
- Editor problems check and `git diff --check` — passed.
- Browser smoke check at the local Vite URL — confirmed the new sidebar entry opens the generator screen and **New conversation** creates/displays a fresh UUID.
- A full live browser generation was not performed because it would call configured external providers and create persistent records in MongoDB. A positive API/MongoDB test remains necessary when the user is ready.

### Phase 6 — Verify, document, and rollout

- [x] Add read-only MongoDB counts for conversation memory documents and generation-history records, globally and for an optional conversation ID.
- [x] Add conversation-scoped deletion that removes its LangChain memory and history records in one MongoDB transaction; there is no delete-all endpoint.
- [x] Add UI controls for refreshing global/scoped counts and deleting the current conversation after typing its exact ID.
- [x] Require the `X-Confirm-Conversation-Id` header to match the exact conversation ID on delete requests.
- [x] Unit-test count and deletion behavior in addition to persistence, mapping, validation, and failure handling.
- [x] Live integration-test two requests in one conversation and verify the same conversation ID with new execution/memory IDs; unit-test separate-conversation history isolation.
- [x] Inspect a live persisted history document and LangChain session for query/output, IDs, dates, model/provider, retrieval references, and correlated user/assistant messages.
- [x] Verify the documented retry policy: an identical repeated request is a new generation execution with fresh execution/memory IDs, not an idempotent replay.
- [x] Smoke-test existing vector, BM25, hybrid, reranking, summarization, conversion, embeddings, and `/api/test-prompt` routes with invalid empty requests; all return their expected HTTP 400 validation response without starting write jobs.
- [x] Run the frontend production build and the focused backend tests.
- [x] Document environment variables, MongoDB indexes, API payloads, failure semantics, retention, and rollback steps.
- [x] Keep the feature additive and fail closed on missing backend configuration; do not add a feature flag because route/UI rollout is part of this completed release.

**Deliverable:** tested and documented feature with existing workflows unchanged.

**Phase 6 validation and handoff**

- API count: `GET /api/test-cases/generation-history/stats` returns total conversation, history, and completed-history document counts. Add `?conversationId=<uuid>` for those counts scoped to a conversation as well as totals.
- API delete: `DELETE /api/test-cases/generation-history/:conversationId`, with header `X-Confirm-Conversation-Id: <same-conversation-uuid>`. It transactionally deletes only the target LangChain memory session document and its history records; no delete-all route exists.
- Counts/deletion UI validation: use **Refresh** on the generator page, inspect global and selected-conversation counts, then delete only a disposable validation conversation after typing its exact UUID in the confirmation dialog. Confirm counts decrease and another conversation remains.
- MongoDB queries:

```javascript
db.conversation_memory.countDocuments({})
db.test_case_generation_history.countDocuments({})

db.conversation_memory.countDocuments({ sessionId: "<conversation-id>" })
db.test_case_generation_history.countDocuments({ conversationId: "<conversation-id>" })

db.conversation_memory.findOne({ sessionId: "<conversation-id>" })
db.test_case_generation_history.find({ conversationId: "<conversation-id>" })
```

- Deletion transaction requires a MongoDB replica set / Atlas deployment that supports multi-document transactions. Failed/unsupported transactions return a non-success response; the API must not report a successful deletion unless the transaction commits.
- This project currently has no authentication or authorization middleware and permissive CORS. The confirmation header guards against accidental deletes but is not authentication; deploy this API only behind a trusted network/authentication layer.
- Live Atlas/provider integration and unrelated legacy search-route regression checks remain deployment/environment checks; do not claim them verified from fake-collection unit tests.
- Existing test-case/user-story collections and search routes must remain unchanged by this management feature.
- `npm run test:memory` — passed, 15/15 focused tests, including global/scoped count calculations and deletion isolation. Backend/service/test syntax and `git diff --check` passed. Frontend `npm run build` passed with the existing large-chunk warning.
- Live read-only stats request to the configured database succeeded and returned 4 conversation documents, 5 generation-history records, and 5 completed records at validation time. A delete transaction was smoke-tested against a newly generated UUID whose scoped counts were both zero; response succeeded with 0 memory and 0 history records deleted. An invalid conversation ID delete returned HTTP 400.
- Browser smoke check confirmed the generator displays database counts and the conversation-delete dialog requires the exact conversation ID before enabling permanent deletion. Only isolated validation conversations created during the live checks were deleted; no pre-existing conversation was deleted.
- Live end-to-end test used a temporary UUID and made two successful hybrid-RAG/LLM generations in the same conversation. Responses showed the same conversation ID and different execution/memory IDs; MongoDB counts showed one memory session and two completed history records. Direct read-only inspection confirmed the stored query, generated cases, provider/model, retrieval method/source IDs, BSON dates, and both LangChain messages with correlated IDs.
- A second live test repeated the exact same request twice. It produced two distinct executions/history rows as specified; there is no idempotency key or replay behavior.
- Temporary live test conversations were deleted through the confirmed transactional endpoint, and post-delete counts were verified as zero. Aggregate counts returned to the pre-test 4 conversation / 5 history baseline; no pre-existing conversations were deleted.
- Regression smoke requests with empty bodies returned HTTP 400 for `/api/search`, `/api/search/bm25`, `/api/search/hybrid`, `/api/search/rerank`, `/api/search/summarize`, `/api/upload-excel`, `/api/create-embeddings`, `/api/create-embeddings-batch`, and `/api/test-prompt`. These checks verify existing route registration and validation, not successful behavior against real files/providers or mutation of original collections.
- Final production frontend build passed. Vite continues to report the existing oversized JavaScript chunk warning; no build error resulted.

#### Phase 6 operational reference

**Required generation configuration**

- `MONGODB_URI` and `DB_NAME` select the configured MongoDB database.
- `COLLECTION_NAME` and `VECTOR_INDEX_NAME` identify the existing test-case source collection and vector index. `BM25_INDEX_NAME` selects the existing BM25 index; BM25 failures fall back to vector retrieval.
- `CONVERSATION_MEMORY_COLLECTION` defaults to `conversation_memory`.
- `GENERATION_HISTORY_COLLECTION` defaults to `test_case_generation_history`.
- Configure the existing embedding and LLM provider/model credentials as required by the project. Keep credentials in the local environment; never put them in Postman examples, UI code, or source control.

**Indexes created by the persistence service**

- Memory: unique `{ sessionId: 1 }`.
- Generation history: unique `{ executionId: 1 }`; unique `{ memoryRecordId: 1 }`; and `{ conversationId: 1, createdAt: 1 }`.
- Existing test-case/user-story documents and search indexes are not migrated or rewritten by this feature.

**API and failure behavior**

- `POST /api/test-cases/generate`: JSON `{ "conversationId": "<optional UUID>", "query": "<text>", "filters": {}, "limit": 1 }`. `limit` is 1–10; supported filter keys are `id`, `module`, `priority`, `risk`, `automationManual`, `type`, `version`, and `createdBy`. On success returns `success`, `persisted`, conversation/execution/memory UUIDs, timestamp, generated cases, hybrid retrieval metadata, and provider/model metadata.
- Every accepted generation request gets new server-created execution and memory IDs. Repeating an HTTP request performs another generation and creates another history row; the endpoint is not idempotent.
- `GET /api/test-cases/generation-history/stats`: totals; optional `?conversationId=<uuid>` adds scoped counts.
- `DELETE /api/test-cases/generation-history/:conversationId`: requires the `X-Confirm-Conversation-Id` header to exactly match the URL ID; deletes only that conversation inside a MongoDB transaction. No delete-all operation is implemented.
- Expected classes: invalid request / ID `400`; no retrieved context `422`; model/generation failure `502`; MongoDB/history/persistence failure `503`. A persistence failure must not be reported as a durable successful generation.

**Retention, access, and rollback**

- There is no automatic TTL or retention cleanup. Persisted memory and generation records are retained until a conversation is explicitly deleted.
- The delete transaction needs Atlas or another replica-set deployment with multi-document transaction support.
- The project has no authentication/authorization and uses permissive CORS. Do not expose history counts or destructive operations to an untrusted network; the confirmation header is not an authorization mechanism.
- Rollback by removing/disabling the generator navigation and the three generation-history routes, then redeploying the prior application version. This does not remove stored records or indexes. Preserve them for forward re-enable, or delete only selected test conversations using the guarded endpoint / direct database operations under approved procedures. Never drop the shared source collections as part of rollback.
- The repeatable Postman requests, UI checks, and MongoDB Compass queries are documented in the Phase 4–6 validation sections above. Production write workflows for the legacy conversion/embedding tools were not executed in regression testing to avoid modifying existing files/collections.

### Phase 7 — Browse and reopen saved conversations

- [x] Add a paginated API to list conversations with generation count, latest request, and latest generation time.
- [x] Add a conversation-detail API returning persisted LangChain messages and generation records, including generated test cases and retrieval/model metadata.
- [x] Add a saved-conversations list in the generator UI with refresh/pagination and an action to reopen a conversation.
- [x] Restore the reopened conversation ID as active so follow-up requests continue the stored context.
- [x] Bound list page size and detail payload history/message counts.
- [x] Test pagination and saved conversation/message/history mapping with fake MongoDB collections.
- [x] Verify list/detail API results against the configured MongoDB database and build the frontend.

**API validation**

```http
GET http://localhost:3001/api/test-cases/conversations?limit=20&skip=0
```

```http
GET http://localhost:3001/api/test-cases/conversations/<conversation-uuid>
```

List `limit` defaults to 20 and must be from 1–50; `skip` defaults to 0 and must be non-negative. Detail responses include up to the latest 50 generation records and 100 LangChain messages, with `truncated: true` if older rows/messages were omitted. The UI loads 20 conversations at a time.

**Phase 7 validation results**

- `npm run test:memory` — 17/17 tests passed, including list pagination and conversation-detail mapping.
- Backend/service syntax and diff-whitespace checks passed; `npm run build` passed with the existing Vite large-chunk warning.
- Live API smoke test listed saved conversations and loaded one conversation detail containing two messages and one history record. Invalid list limits/skips and invalid conversation UUID returned HTTP 400.
- Browser UI smoke test: opened a saved password-reset conversation and confirmed its conversation ID, saved generated test cases, and scoped memory/history counts were restored; no UI alerts were present.
- No generation writes or deletes were performed for the Phase 7 list/detail endpoint check.
- As with other history APIs, no authentication is implemented; expose saved conversation contents only behind a trusted network/authentication layer.

**UI validation steps**

1. Open the application and go to **AI GENERATION → Test Case Generator**.
2. In **Saved conversations**, select a conversation row. Confirm its conversation ID becomes active, its saved request/history and generated test cases are displayed, and the current-conversation memory/history counts update.
3. Use **Previous**, **Next**, or **Refresh** to navigate or reload the saved conversation list.

## Initial API Contract (Proposed)

### Request

```json
{
  "conversationId": "optional-client-held-uuid",
  "executionId": "optional-idempotency-uuid",
  "query": "Generate test cases for the password reset flow",
  "filters": {},
  "limit": 10
}
```

`conversationId` should be reused across turns. `executionId` should be generated by the server unless retries need explicit idempotency; do not allow a caller to overwrite an already completed execution silently.

### Success response

```json
{
  "success": true,
  "conversationId": "conversation-uuid",
  "executionId": "execution-uuid",
  "generatedAt": "2026-10-14T09:45:00.000Z",
  "generatedTestCases": [],
  "generation": {
    "provider": "configured-provider",
    "model": "configured-model",
    "fallbackUsed": false
  }
}
```

Final field names and the generated-test-case schema must be agreed before implementation.

## Acceptance Criteria

- A user can make multiple generation requests using one conversation ID and the later generation receives prior conversation context.
- A new conversation ID does not expose messages from another conversation.
- Each generation is traceable by unique `conversationId`, `executionId`, and memory record IDs.
- Generation history stores the user's query, generated test cases, correlation identifiers, and UTC generation timestamp in a dedicated MongoDB collection.
- Conversation messages persist in MongoDB and survive backend restarts.
- Existing `test_cases` and `user_stories` documents and search-index behavior remain unchanged.
- Existing routes retain their current request/response behavior.
- Missing configuration, MongoDB failures, model failures, and malformed generated output are reported explicitly.
- Automated tests cover persistence, cross-turn context, isolation, and regression behavior.

## Risks and Decisions to Resolve

1. **No clearly identified generator UI/API:** confirm whether a separate generator workflow exists outside the scanned routes before choosing its integration point.
2. **LangChain versus existing LLM service:** avoid replacing the existing multi-provider/fallback implementation unless a LangChain adapter demonstrably preserves it.
3. **Identity/isolation:** the project has no identified authentication. Conversation IDs alone are not authorization; do not treat them as proof of user identity. Add user scoping when authentication exists.
4. **History growth:** define message limits, token-window/truncation behavior, and retention to control storage and LLM context cost.
5. **Sensitive content:** prompts and generated outputs may contain sensitive project information. Limit stored fields and define access, retention, and deletion policies.
6. **Persistence/model partial failure:** specify whether generation should fail if memory/history persistence fails. The system must never report a durable save unless MongoDB confirms it.
7. **MongoDB permissions:** the configured database user needs collection read/write and index-management permissions if indexes are created automatically.
8. **Collection provisioning:** choose between startup-time index provisioning and a separate deployment/migration step; avoid silently swallowing index setup errors.

## Out of Scope for This Change

- Replacing existing MongoDB vector/BM25 search.
- Rewriting current embedding or LLM providers.
- Altering existing test-case or user-story schemas.
- Adding authentication or a user-management system.
- Modifying generic prompt testing semantics.
- Changing current search ranking, filters, or result shapes.
