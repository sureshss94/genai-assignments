# AI Test Case Generator — System Architecture

## 1. Purpose

This document defines the architecture for an AI-powered Test Case Generator based on the 20 architecture decisions collected through the questionnaire.

The system will:

1. Ingest project knowledge from multiple sources.
2. Parse, normalize, chunk, embed and store searchable knowledge in MongoDB.
3. Retrieve relevant context using Vector + BM25 hybrid search.
4. Rerank and assemble context dynamically.
5. Generate categorized test cases using an LLM.
6. Validate generated test cases using deterministic and AI-based validation.
7. Require mandatory human review, field-level editing and approval.
8. Export approved test cases to Jira or ADO.

---

## 2. Scope

### Input Sources

| Source | Vectorized |
|---|---|
| Requirements — User Story / BRD / FRD | Yes |
| Figma / UI Specifications | Yes |
| Swagger API Specifications | Yes |
| Existing Test Cases | Yes |
| Test Data | Yes |
| Jira / ADO / TestRail / Zephyr / Xray | Yes |
| GitHub / Bitbucket Developer Code | No |
| Meeting Notes / Recordings | Yes |
| Release Notes | Yes |
| Confluence / Wiki / Technical Documentation | Yes |
| Defect Database | Yes |

### Current Output Targets

- Jira
- ADO

TestRail, Zephyr and Xray are kept as future extensibility targets and are not part of the detailed first implementation.

---

## 3. Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React.js |
| Backend | Node.js + TypeScript |
| Database / Vector DB | MongoDB |
| LLM | Groq / OpenAI |
| Embedding | Mistral / OpenAI |
| Deployment | AWS |
| Authentication | Enterprise SSO |
| Authorization | RBAC + Project Authorization |

---

# 4. High-Level Architecture

```text
                              +----------------------+
                              |        Users         |
                              +----------+-----------+
                                         |
                                         v
                              +----------------------+
                              |   React Frontend     |
                              +----------+-----------+
                                         |
                                         v
                              +----------------------+
                              | Node.js + TypeScript  |
                              |      API Layer       |
                              +----------+-----------+
                                         |
             +---------------------------+---------------------------+
             |                           |                           |
             v                           v                           v
      Ingestion Layer             Retrieval Layer            Generation Layer
             |                           |                           |
             v                           v                           v
       MongoDB / Vector DB <-------------+---------------------------+
             ^
             |
      +------+-------+----------------+
      |              |                |
      v              v                v
 Manual Trigger   Scheduler       Webhooks
      |              |                |
      +--------------+----------------+
                     |
                     v
              Source Connectors
                     |
       +-------------+-------------+
       |             |             |
      Jira          ADO       GitHub/Bitbucket
       |             |             |
       +-------------+-------------+
                     |
                     v
          Other configured sources

External AI:
    Groq / OpenAI       -> LLM
    Mistral / OpenAI    -> Embeddings

Output:
    Generated Test Cases
            |
            v
    Rule + AI Validation
            |
            v
    Mandatory User Review
            |
            v
    Field-Level Editing
            |
            v
       User Approval
            |
            v
    Canonical Test Case
            |
       +----+----+
       |         |
       v         v
     Jira       ADO
```

---

# 5. Core Architecture Principles

## 5.1 MongoDB Role

MongoDB is used for both:

- Vector-based project knowledge retrieval.
- Structured storage of generated test cases and related metadata.

## 5.2 Project-Based Data Organization

The selected organization model is **separate collection per project**.

Conceptually:

```text
MongoDB
|
+-- Project_A
|    +-- knowledge
|    +-- generated_testcases
|    +-- ingestion_metadata
|    +-- validation_results
|    +-- audit_history
|
+-- Project_B
     +-- knowledge
     +-- generated_testcases
     +-- ingestion_metadata
     +-- validation_results
     +-- audit_history
```

The exact physical MongoDB naming convention can be finalized during implementation.

## 5.3 Human-in-the-Loop

Generated test cases must not be automatically published.

Required flow:

```text
Generate
   |
Validate
   |
Manual Review
   |
Field-Level Edit
   |
User Approval
   |
Export
```

---

# 6. External Connection Architecture

Connections use a **Project + Organization Hybrid** model.

- Organization administrators can configure reusable connections.
- Projects can select authorized connections.
- Project-specific credentials can be configured when required.

Applicable integrations include:

- Jira
- ADO
- GitHub
- Bitbucket
- Confluence
- Other supported source systems

---

# 7. Ingestion Pipeline

## 7.1 Objective

The ingestion pipeline converts external project information into normalized, searchable knowledge and stores embeddings in MongoDB.

## 7.2 Trigger Model

The system supports:

1. Manual ingestion
2. Scheduled ingestion
3. Webhook/event-based ingestion

```text
Manual Trigger
      |
Scheduled Trigger ----+
      |               |
Webhook/Event --------+
                      |
                      v
             Ingestion Orchestrator
                      |
                      v
               Source Connector
                      |
                      v
             Source-Specific Parser
                      |
                      v
                 Normalization
                      |
                      v
            Optional LLM Enrichment
                      |
                      v
               Hybrid Chunking
                      |
                      v
              Change Detection
                      |
                      v
                Embedding Model
                      |
                      v
               MongoDB Storage
```

---

# 8. Source Processing

The selected strategy is:

**Source-Specific Parsing + Normalization + Optional LLM Enrichment → Chunking → Embedding**

Examples:

| Source | Processing |
|---|---|
| Requirement | Requirement, description, acceptance criteria |
| Swagger | API operation, endpoint, request, response, status codes |
| Existing Test Case | Title, steps, expected result, category |
| Defect | Summary, reproduction steps, severity, resolution |
| Jira / ADO | Issue/work-item fields and metadata |
| Confluence/Wiki | Heading, section, subsection, content |
| Meeting Notes | Topics, decisions, action items |
| Release Notes | Release/version/change information |
| Figma/UI Specs | Screen/component/specification information |
| Test Data | Data attributes and usage context |

Developer code repositories are **not vectorized** according to the selected requirement.

---

# 9. Chunking Strategy

The selected strategy is **Hybrid Chunking**.

Source-specific semantic boundaries are preferred. Token/size limits are applied when a logical unit is too large.

Examples:

```text
Requirement
    -> Requirement + Acceptance Criteria

Swagger
    -> API Operation

Existing Test Case
    -> Complete Test Case / Logical Scenario

Defect
    -> Defect + Reproduction Details

Confluence
    -> Section / Subsection

Meeting Notes
    -> Topic / Decision / Action Item
```

Suggested chunk metadata:

```text
projectId
sourceType
sourceId
documentId
chunkId
version
embeddingModel
embeddingModelVersion
createdAt
updatedAt
active
```

---

# 10. Embedding Architecture

Embedding models are configurable at project level.

Supported embedding model families:

- Mistral
- OpenAI

Each vector stores embedding model/version information.

```text
Source
  |
  v
Normalized Content
  |
  v
Chunk
  |
  v
Embedding Model
  |
  v
Vector
  |
  v
MongoDB
```

This allows the system to identify data requiring re-embedding when the model changes.

---

# 11. Source Change Detection and Versioning

The selected strategy is:

**Versioned + Change Detection + Re-Embedding**

```text
Source Retrieved
      |
      v
Compare Current Content
      |
      +---- No Change ----> Skip Embedding
      |
      +---- Changed ------> Create New Version
                                  |
                                  v
                              Re-Embed
                                  |
                                  v
                          Mark New Version Active
```

Important behavior:

- Unchanged content is not unnecessarily re-embedded.
- Previous versions are retained for history/audit.
- Current version is marked active.
- Embedding model/version is retained.
- Model changes can trigger identification of affected data for re-embedding.

---

# 12. Retrieval Pipeline

```text
User Query
    |
    v
Query Preprocessing
    |
    +-- Normalization
    +-- Abbreviation Expansion
    +-- Synonym Expansion
    |
    v
+-------------------+-------------------+
|                   |                   |
v                   v                   |
Vector Search       BM25 Search         |
|                   |                   |
+---------+---------+                   |
          v                             |
     Hybrid Combination <---------------+
          |
          v
       Reranking
          |
          v
     Deduplication
          |
          v
 Dynamic Context Assembly
          |
          v
 Prompt + Query + Context
          |
          v
          LLM
```

---

# 13. Retrieval Scope

The selected strategy is **Hybrid Retrieval Scope**.

The system automatically identifies relevant source types and allows the user to override the selection.

Example:

```text
Query:
Generate negative test cases for Login API

Potential automatically relevant sources:
- Requirements
- Swagger
- Existing API Test Cases
- Relevant Defects
- Relevant Test Data
```

The user can include/exclude source categories when required.

---

# 14. Query Preprocessing

## Normalization

Normalize query formatting and terminology before search.

## Abbreviation Expansion

Expand known domain/project abbreviations where applicable.

Examples:

```text
API -> Application Programming Interface
TC  -> Test Case
```

The application should support configurable project-specific abbreviations.

## Synonym Expansion

Identify equivalent terminology where useful.

Example:

```text
login
authentication
sign-in
```

The actual synonym set should be configurable rather than assumed universally.

---

# 15. Parallel Hybrid Search

The selected strategy is **Parallel Hybrid Retrieval**.

Vector search and BM25 search execute independently.

```text
                    Query
                      |
             Query Preprocessing
                      |
             +--------+--------+
             |                 |
             v                 v
       Vector Search        BM25 Search
             |                 |
             +--------+--------+
                      |
                      v
             Hybrid Result Set
```

### Vector Search

Useful for:

- Semantic similarity
- Related concepts
- Different wording with similar meaning

### BM25

Useful for:

- Exact identifiers
- API paths
- Field names
- Error codes
- Jira/ADO IDs
- Technical terminology

The candidate sets are combined before reranking.

---

# 16. Two-Stage Reranking

The selected strategy is **Two-Stage Reranking**.

```text
Vector + BM25
      |
      v
Hybrid Candidate Set
      |
      v
Initial Score / Metadata Filtering
      |
      v
Reduced Candidate Set
      |
      v
Dedicated Reranker
      |
      v
Top Relevant Context
```

The exact reranker model remains a configurable implementation decision.

The generation LLM should not be used to rerank every candidate because this can increase latency and cost.

---

# 17. Dynamic Context Assembly

The selected strategy is **Dynamic Context Assembly**.

Processing:

1. Deduplicate retrieved chunks.
2. Group related chunks.
3. Preserve source/version/evidence metadata.
4. Check context/token limits.
5. Summarize only when required.
6. Construct final LLM context.

```text
Reranked Chunks
      |
      v
Deduplication
      |
      v
Related Context Grouping
      |
      v
Token/Context Check
      |
      +---- Fits -------> Direct Context
      |
      +---- Too Large --> Targeted Summarization
                              |
                              v
                         Final Context
```

---

# 18. Test Case Generation

The LLM receives:

```text
User Query
+
Generation Prompt
+
Retrieved Context
+
Generation Configuration
```

```text
Query
  +
Prompt
  +
Retrieved Evidence
  |
  v
LLM
  |
  v
Generated Test Cases
```

Generated test cases are converted into a canonical internal representation before export.

---

# 19. Test Case Category Strategy

The selected strategy is **Hybrid Category Selection**.

The application maintains predefined testcase categories.

Users can select categories, and the AI can identify additional applicable categories based on the requirement/context.

Examples:

- Positive
- Negative
- Boundary
- Functional
- Validation
- Other applicable categories

The system should not generate a category when there is no reasonable basis in the requirement or retrieved evidence.

---

# 20. Canonical Test Case Model

The internal testcase model is tool-independent.

Conceptual structure:

```text
TestCase
|
+-- id
+-- title
+-- description
+-- preconditions
+-- testData
+-- steps[]
+-- expectedResult
+-- category
+-- priority
+-- requirementReferences[]
+-- evidence[]
+-- validationResult
+-- approvalStatus
+-- version
```

---

# 21. Test Case Validation

The selected strategy is:

**Hybrid Validation + Mandatory Manual Review**

## 21.1 Rule-Based Validation

Deterministic checks include:

- Required fields
- Correct schema
- Test steps present
- Expected result present
- Valid category
- Valid format
- Duplicate IDs
- Other configured deterministic rules

## 21.2 AI-Based Validation

Semantic checks include:

- Requirement coverage
- Missing applicable scenarios
- Logical consistency
- Negative/boundary coverage
- Duplicate/overlapping scenarios
- Evidence grounding

```text
Generated Test Cases
        |
        +--------------------+
        |                    |
        v                    v
Rule Validation       AI Validation
        |                    |
        +---------+----------+
                  |
                  v
          Validation Results
                  |
                  v
           Manual User Review
```

---

# 22. Mandatory Manual Review and Approval

Manual review is mandatory.

The user can edit individual fields before approval.

Possible editable fields:

- Title
- Description
- Preconditions
- Test Data
- Steps
- Expected Result
- Category
- Priority
- Other configured testcase fields

Only approved test cases can proceed to export.

```text
Generated
   |
Validated
   |
Manual Review
   |
Field-Level Editing
   |
User Approval
   |
Export
```

---

# 23. Traceability and Evidence

The selected strategy is **Full Traceability + Evidence**.

Every generated testcase should be traceable to the source context used for generation.

Example:

```text
TC_LOGIN_001
   |
   +-- Requirement: LOGIN-123
   |
   +-- Swagger: /api/v1/login
   |
   +-- Existing Test Case: TC-45
   |
   +-- Defect: BUG-789
   |
   +-- Evidence:
          +-- sourceId
          +-- chunkId
          +-- sourceType
          +-- version
```

This supports explainability and auditability.

---

# 24. Test Management Integration

Current target systems:

- Jira
- ADO

Architecture:

**Canonical Test Case Model + Adapter + Field Mapping**

```text
                 Canonical Test Case
                         |
               +---------+---------+
               |                   |
               v                   v
          Jira Adapter         ADO Adapter
               |                   |
               v                   v
         Field Mapping       Field Mapping
               |                   |
               v                   v
           Jira API             ADO API
```

This keeps external-tool-specific logic outside the core generation engine.

---

# 25. Jira / ADO Field Mapping

Conceptual mapping:

```text
Canonical Field       Jira/ADO Field
-------------------------------------
title              -> Target title
description        -> Target description
steps              -> Target test steps
expectedResult     -> Target expected result
priority            -> Target priority
category            -> Target category
testData            -> Target test data
```

Actual field mappings should be configurable according to the target project's configuration.

---

# 26. Authentication and Authorization

The selected architecture is:

**Enterprise SSO + RBAC**

```text
User
 |
 v
Enterprise SSO
 |
 v
Authentication
 |
 v
RBAC
 |
 v
Project Authorization
 |
 v
Application
```

Initial conceptual roles:

- Admin
- Project Admin
- QA/Tester
- Viewer

Exact permissions can be finalized during implementation.

---

# 27. AWS Deployment Architecture

The selected deployment direction is:

**AWS Managed Services + Containers**

```text
                         Users
                           |
                           v
                    React Frontend
                           |
                           v
                  AWS API / Load Layer
                           |
                           v
                 Node.js + TypeScript API
                    /                                 /                                  v                  v
          Retrieval Services    Generation Services
                  |                  |
                  +--------+---------+
                           |
                           v
                    MongoDB / Vector DB
                           ^
                           |
                    Ingestion Workers
                    /       |                          /        |                     Manual      Scheduler   Webhook
                   \        |        /
                    \       |       /
                     v      v      v
                 Source Connectors
```

External AI services:

```text
Node.js Services
      |
      +----> Groq / OpenAI  -> LLM
      |
      +----> Mistral/OpenAI -> Embeddings
```

Specific AWS services are intentionally not fixed where they were not established during the questionnaire. They can be selected during infrastructure implementation based on scale, cost and operational requirements.

---

# 28. Logical Components

## Frontend — React.js

Responsibilities:

- Project selection
- Source configuration
- Ingestion controls
- Query/testcase generation
- Source/category selection
- Generated testcase display
- Validation results
- Field-level editing
- Manual approval
- Jira/ADO export

## Backend — Node.js + TypeScript

Responsibilities:

- Authentication/authorization integration
- Project management
- Source configuration
- Ingestion orchestration
- Retrieval orchestration
- Generation orchestration
- Validation orchestration
- Approval workflow
- Export orchestration

## Ingestion Services

Responsibilities:

- Connector execution
- File processing
- Parsing
- Normalization
- Optional enrichment
- Chunking
- Change detection
- Embedding
- MongoDB persistence

## Retrieval Services

Responsibilities:

- Query preprocessing
- Vector search
- BM25 search
- Hybrid combination
- Reranking
- Deduplication
- Context assembly

## Generation Services

Responsibilities:

- Prompt construction
- LLM invocation
- Structured testcase parsing
- Category handling
- Generation result persistence

## Validation Services

Responsibilities:

- Rule validation
- AI validation
- Validation result persistence

## Integration Services

Responsibilities:

- Jira adapter
- ADO adapter
- Field mapping
- Export/publish

---

# 29. End-to-End Test Case Generation Flow

```text
User
 |
 | Select Project
 | Provide Requirement / Query
 v
React UI
 |
 v
Node.js API
 |
 v
Query Preprocessing
 |
 +-------------------+
 |                   |
 v                   v
Vector Search      BM25 Search
 |                   |
 +---------+---------+
           |
           v
    Hybrid Combination
           |
           v
       Reranking
           |
           v
     Deduplication
           |
           v
 Dynamic Context Assembly
           |
           v
   Prompt + Query + Context
           |
           v
          LLM
           |
           v
 Generated Test Cases
           |
           v
 Hybrid Validation
           |
           v
 Mandatory Manual Review
           |
           v
 Field-Level Editing
           |
           v
      User Approval
           |
           v
 Canonical Test Case Model
           |
       +---+---+
       |       |
       v       v
     Jira     ADO
```

---

# 30. End-to-End Ingestion Flow

```text
Source
 |
 +-- Manual
 +-- Scheduled
 +-- Webhook
 |
 v
Connector / File Handler
 |
 v
Source-Specific Parser
 |
 v
Normalization
 |
 v
Optional LLM Enrichment
 |
 v
Hybrid Chunking
 |
 v
Change Detection
 |
 +---- No Change ----> Stop
 |
 +---- Changed
          |
          v
      Embedding
          |
          v
MongoDB Project Collection
          |
          v
Version + Metadata + Vector
```

---

# 31. Critical Functionalities

## Ingestion

- Manual ingestion
- Scheduled ingestion
- Webhook ingestion
- Source-specific parsing
- Normalization
- Optional LLM enrichment
- Hybrid chunking
- Embedding
- MongoDB storage
- Change detection
- Version management
- Embedding model/version tracking

## Retrieval

- Query normalization
- Abbreviation expansion
- Synonym expansion
- Vector search
- BM25 search
- Hybrid retrieval
- Two-stage reranking
- Deduplication
- Dynamic context assembly

## Generation

- Requirement/query-driven testcase generation
- Hybrid testcase category selection
- Canonical testcase representation
- LLM generation

## Validation and Approval

- Rule-based validation
- AI-based validation
- Mandatory manual review
- Field-level editing
- User approval

## Traceability

- Source references
- Retrieved evidence
- Source version tracking
- Testcase traceability

## Export

- Jira adapter
- ADO adapter
- Field mapping
- Approved testcase export

## Security

- Enterprise SSO
- RBAC
- Project authorization
- Organization/project integration connections

---

# 32. Optional / Future Functionalities

These are future extension points and are not required for the first implementation:

- TestRail integration
- Zephyr integration
- Xray integration
- Additional source connectors
- Advanced analytics
- Advanced approval workflows
- Additional LLM providers
- Additional embedding providers
- Advanced automated regeneration/remediation
- Additional retrieval strategies
- Additional production-scale infrastructure optimization

---

# 33. Architectural Boundaries

The architecture maintains these boundaries:

1. Generation is separated from retrieval.
2. Retrieval is separated from ingestion.
3. Testcase generation is separated from test-management integrations.
4. Canonical testcase format is independent of Jira/ADO.
5. Developer code repositories are not vectorized.
6. Human approval is mandatory before export.
7. Project data is isolated using project-based collections.
8. Embedding model/version is persisted with vector data.
9. Historical source versions are retained.
10. Only changed content should be re-embedded.

---

# 34. Architecture Decision Summary

| Decision | Selected Approach |
|---|---|
| MongoDB role | Vector DB + Generated Test Case Repository |
| Data organization | Project-based collections |
| Project isolation | Separate collection per project |
| Ingestion trigger | Manual + Scheduled + Webhook |
| External connections | Organization + Project Hybrid |
| Content processing | Source-specific parsing + normalization + optional enrichment |
| Chunking | Hybrid |
| Embedding | Project-level configurable model + versioning |
| Source updates | Change detection + versioning + re-embedding |
| Retrieval scope | Automatic + user override |
| Search | Parallel Vector + BM25 |
| Reranking | Two-stage reranking |
| Context | Dynamic context assembly |
| Testcase categories | Hybrid user + AI selection |
| Traceability | Full traceability + evidence |
| Validation | Rule + AI validation |
| Human review | Mandatory |
| Editing | Field-level editing |
| Export | Canonical model + adapters + field mapping |
| Current TMS | Jira + ADO |
| Authentication | Enterprise SSO |
| Authorization | RBAC + project access |
| AWS | Managed services + containers |

---

# 35. Final Reference Architecture

```text
================================================================================
                         AI TEST CASE GENERATOR
================================================================================

                                  USERS
                                    |
                                    v
                           +----------------+
                           | React Frontend |
                           +-------+--------+
                                   |
                                   v
                     +-----------------------------+
                     | Node.js + TypeScript API    |
                     +--------------+--------------+
                                    |
            +-----------------------+-----------------------+
            |                       |                       |
            v                       v                       v
     Ingestion Layer        Retrieval Layer          Generation Layer
            |                       |                       |
            |                       |                       |
   +--------+---------+     +-------+--------+       +-----+------+
   |                  |     |                |       |            |
Manual/Schedule/     Source | Vector Search  |       | Prompt     |
Webhook              |      | BM25 Search    |       | Builder    |
                     v      | Hybrid Search  |       | LLM Client |
              Parse/Normalize| Reranking     |       +-----+------+
                     |      | Deduplication  |             |
                     v      | Context        |             v
               Hybrid Chunking| Assembly    |           LLM
                     |      +-------+--------+             |
                     v              |                      v
                Embeddings         |              Generated Test Cases
                     |              |                      |
                     v              +----------+-----------+
               MongoDB / Vector DB             |
                     ^                          v
                     |                 Hybrid Validation
                     |                          |
                     |                          v
                     |                 Mandatory User Review
                     |                          |
                     |                          v
                     |                 Field-Level Editing
                     |                          |
                     |                          v
                     |                     USER APPROVAL
                     |                          |
                     |                          v
                     |                 Canonical Test Case
                     |                          |
                     |                   +------+------+
                     |                   |             |
                     |                   v             v
                     |                 Jira           ADO
                     |                Adapter        Adapter
                     |                   |             |
                     |                   v             v
                     |                Jira API       ADO API
                     |
                     +---- Source Versions
                     +---- Evidence
                     +---- Metadata
                     +---- Generated Test Cases

External AI:
    Groq / OpenAI  -> LLM
    Mistral/OpenAI -> Embeddings

Security:
    Enterprise SSO + RBAC + Project Authorization

Deployment:
    AWS + Containers + Managed Services
================================================================================
```

---

# 36. Final Architecture Outcome

The architecture is centered on five capabilities:

1. **Reliable project knowledge ingestion**
2. **Grounded hybrid retrieval**
3. **LLM-based categorized testcase generation**
4. **Automated validation + mandatory human approval**
5. **Approved testcase export to Jira/ADO**

The architecture does not assume unconfirmed implementation details. Exact AWS services, reranker model, MongoDB index configuration, connector API details and detailed Jira/ADO field mappings remain implementation-level decisions.
