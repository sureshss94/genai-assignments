# Home Assignment — Real-Time Defect/Bug Triage & SLA Tracker

## 1. Problem Statement

### Use Case

**Real-Time Defect/Bug Triage & SLA Tracker**

### Operational Problem

In most engineering/QA organizations, defects are logged but not actively managed in real time:

- Bugs sit in a backlog untriaged for days with no assigned severity or priority.
- Critical/high-severity bugs breach their resolution SLA silently — nobody notices until a release is blocked.
- Assignment is manual and uneven — some developers get overloaded while others have spare capacity.
- Triage leads have no live view of what is new, what is aging, and what is about to breach SLA.
- Reopened bugs are treated the same as new ones, losing history and urgency context.
- Release/build managers cannot easily see which open defects are release-blocking.
- Managers only discover SLA breaches after the fact, during a status meeting or a release-readiness review.

### Proposed Solution

Build a real-time defect/bug triage and SLA tracking platform that allows:

1. Anyone (QA, developer, support, employee) to report a bug in real time.
2. A triage lead/QA lead to classify severity and priority as soon as a bug is created.
3. The system to attach an SLA countdown automatically, based on severity.
4. Real-time visibility into SLA status: on track, at risk, breached.
5. Automatic escalation and re-notification when a bug approaches or breaches its SLA.
6. Assignment and reassignment of bugs to developers/teams with workload awareness.
7. Full status lifecycle tracking, including reopen handling.
8. Release-blocking flags so build/release managers know what is safe to ship.
9. Managers/admins to configure SLA policies, escalation rules, and business calendars.
10. Analytics on SLA compliance, breach trends, aging defects, and triage backlog.

This is different from the completed Test Case Generator use case and the Meeting Room Management use case, and focuses on a common real-time engineering/QA operations problem: keeping defects triaged, assigned, and inside SLA without manual chasing.

---

# 2. Goals

## Primary Goals

- Eliminate untriaged bugs sitting silently in the backlog.
- Provide a real-time, severity-based SLA countdown for every open defect.
- Automatically escalate bugs before or immediately after SLA breach.
- Prevent release-blocking defects from being missed.
- Balance developer workload during assignment.
- Give triage leads and managers live visibility into the defect queue.

## Secondary Goals

- Provide notifications for triage, assignment, SLA warnings, breaches, and status changes.
- Provide SLA compliance and defect-aging analytics.
- Support configurable SLA policies per severity and per project.
- Provide an extensible architecture for future quality-engineering workflows (test-case linkage, CI/CD integration).

---

# 3. Non-Goals

The first version does not include:

- Full test-case management (already covered by the separate Test Case Generator use case).
- Source-code static analysis or automated root-cause detection.
- Payroll or performance appraisal linkage.
- Replacing existing issue trackers (e.g., Jira) — this can integrate with them in future iterations.
- CI/CD pipeline execution (only status ingestion in future scope).

---

# 4. Users / Roles

## Reporter (Any Employee — QA, Developer, Support, Product)

Can:

- Report a new bug.
- Attach steps to reproduce, environment, logs, screenshots.
- View status of bugs they reported.
- Comment on a bug.
- Reopen a bug they verified as not fixed.

## Developer / Assignee

Can:

- View bugs assigned to them.
- Update status (In Progress, Fixed).
- Comment and request more information.
- Request reassignment.

## Triage Lead / QA Lead

Can:

- View the real-time untriaged queue.
- Set severity and priority.
- Assign/reassign bugs to developers or teams.
- Mark bugs as duplicate, rejected, or won't-fix.
- Mark release-blocking status.

## Admin / Engineering Manager

Can:

- Configure SLA policies per severity/project.
- Configure escalation rules and business calendar (working hours/holidays).
- View SLA compliance and breach analytics.
- Override assignment and escalation state when authorized.
- View team-wise and project-wise defect load.

---

# 5. Functional Requirements

## FR-01 — Bug Reporting

Users can create a bug with:

- Title, description, steps to reproduce.
- Environment (build/version, OS, browser/device).
- Attachments (screenshots, logs).
- Suggested severity (optional; confirmed at triage).
- Linked project/module/release.

## FR-02 — Real-Time Triage Queue

Triage leads see, in real time:

- New (untriaged) bugs as they are created.
- Bugs by project, severity, priority, age, and assignee.
- Bugs approaching or breaching SLA.

## FR-03 — Severity & Priority Classification

At triage, the system requires:

- Severity: `CRITICAL`, `HIGH`, `MEDIUM`, `LOW`.
- Priority: `P0`, `P1`, `P2`, `P3`.

Severity determines the SLA policy applied.

## FR-04 — SLA Assignment & Countdown

On triage, the system:

- Applies the SLA policy configured for that severity/project.
- Starts a live countdown to the SLA deadline.
- Accounts for the configured business calendar (working hours, holidays) if enabled.

## FR-05 — Automatic Escalation

The system must:

- Send a warning notification when a bug nears SLA breach (configurable threshold, e.g. 80% of SLA elapsed).
- Escalate automatically on breach: reassign visibility to the next escalation level (lead → manager → director).
- Continue to re-escalate on a configurable interval until the bug is resolved or acknowledged.

## FR-06 — Assignment & Reassignment

- Triage leads assign bugs to a developer or team.
- The system can suggest an assignee based on current open-bug load (workload balancing).
- Developers can request reassignment; triage lead approves/denies.

## FR-07 — Status Lifecycle Management

Supported statuses:

```text
NEW -> TRIAGED -> ASSIGNED -> IN_PROGRESS -> FIXED -> VERIFIED -> CLOSED
```

Alternate paths:

```text
TRIAGED -> REJECTED
TRIAGED -> DUPLICATE
TRIAGED -> WONT_FIX
VERIFIED -> REOPENED -> ASSIGNED
```

## FR-08 — Release-Blocking Flag

- Triage lead or manager can flag a bug as release-blocking for a specific release/build.
- Release-blocking bugs are always visible at the top of the triage queue and on the dashboard regardless of severity.

## FR-09 — Notifications

Users receive notifications for:

- Bug assigned to them.
- Triage completed on a bug they reported.
- SLA warning (approaching breach).
- SLA breach.
- Escalation to next level.
- Status change (fixed, verified, reopened, closed).

## FR-10 — Administration

Admins can:

- Configure SLA duration per severity per project.
- Configure escalation levels and recipients.
- Configure business calendar (working hours, holidays, time zone).
- Configure escalation re-notification interval.

## FR-11 — Analytics & Reporting

Admins/managers can view:

- SLA compliance rate (overall, by severity, by project, by team).
- Number and duration of SLA breaches.
- Average time-to-triage, time-to-assign, time-to-resolve.
- Defect aging (open bugs by age bucket).
- Reopen rate.
- Release-blocking bug count per release.

---

# 6. Non-Functional Requirements

## Performance

Target:

- Triage queue read API: p95 under 500 ms under normal load.
- Bug creation API: p95 under 1 second under normal load.
- SLA countdown/status propagation to connected clients: within a few seconds of state change.

These are architectural targets and should be validated during performance testing.

## Availability

The system should be designed for high availability — SLA tracking is a time-sensitive operational service; downtime directly risks missed escalations.

## Consistency

- SLA breach detection must not be duplicated or skipped; escalation jobs must be idempotent.
- Status transitions must be validated against the allowed state machine to prevent invalid states.

## Security

- Enterprise SSO.
- RBAC.
- TLS.
- Secure credential storage.
- Audit logging of triage, assignment, and status-change actions.
- API authorization.

## Scalability

The system should support:

- Multiple projects/products and releases.
- Thousands of open defects across teams.
- Concurrent triage and assignment operations.
- Real-time SLA countdown updates for many concurrently connected dashboards.

---

# 7. High-Level Architecture

```text
                         +-------------------+
                         |      Users        |
                         | Web / Mobile      |
                         +---------+---------+
                                   |
                                   v
                         +-------------------+
                         | CDN / API Gateway |
                         +---------+---------+
                                   |
                                   v
                    +------------------------------+
                    |       Backend API            |
                    | Node.js + TypeScript         |
                    +--------------+---------------+
                                   |
     +---------------+-------------+-------------+---------------+
     |               |             |             |               |
     v               v             v             v               v
+----------+   +-----------+  +---------+  +------------+  +-----------+
| Bug      |   | Triage    |  | SLA     |  | Assignment |  | User      |
| Service  |   | Service   |  | Engine  |  | Service    |  | Service   |
+----+-----+   +-----+-----+  +----+----+  +-----+------+  +-----+-----+
     |               |             |             |               |
     +---------------+-------------+-------------+---------------+
                                  |
                                  v
                         +-------------------+
                         | PostgreSQL        |
                         | Transactional DB  |
                         +-------------------+
                                  |
                +-----------------+-----------------+
                |                                   |
                v                                   v
        +---------------+                    +---------------+
        | Redis Cache   |                    | Message Queue |
        +---------------+                    +-------+-------+
                                                        |
                                      +-----------------+-----------------+
                                      |                 |                 |
                                      v                 v                 v
                              Notification       Escalation         Analytics
                                Worker              Worker             Worker
                                      |
                                      v
                              Email / Teams / Push

                                  Real-Time
                                     |
                                     v
                              WebSocket / SSE
                                     |
                                     v
                              Connected Clients
                              (Triage Board / SLA Dashboard)
```

---

# 8. Recommended Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React.js |
| Backend | Node.js + TypeScript |
| API | REST |
| Real-Time | WebSocket or Server-Sent Events |
| Database | PostgreSQL |
| Cache | Redis |
| Queue | AWS SQS / equivalent managed queue |
| Scheduler (SLA timers) | Managed cron / delayed-queue messages |
| Authentication | Enterprise SSO / OAuth 2.0 / OIDC |
| Notifications | Email + Microsoft Teams integration |
| Deployment | AWS |
| Containerization | Docker |
| Monitoring | CloudWatch / OpenTelemetry-compatible stack |

The exact AWS managed services can be finalized during infrastructure implementation.

---

# 9. Core Components

## 9.1 API Gateway

Responsibilities:

- Authentication token validation.
- Routing.
- Rate limiting.
- Request correlation.
- API security.

## 9.2 Bug Service

Responsible for:

- Bug CRUD.
- Attachments and comments.
- Status transitions (state-machine enforcement).
- Linking bugs to projects/releases.

## 9.3 Triage Service

Responsible for:

- Untriaged queue.
- Severity/priority classification.
- Marking duplicate/rejected/won't-fix.
- Release-blocking flag management.

## 9.4 SLA Engine

Responsible for:

- Applying the correct SLA policy on triage.
- Computing SLA deadlines (including business-calendar adjustments).
- Tracking SLA state: `ON_TRACK`, `AT_RISK`, `BREACHED`, `MET`.
- Publishing SLA-state-change events.

## 9.5 Assignment Service

Responsible for:

- Assigning/reassigning bugs to developers or teams.
- Workload-aware assignee suggestions.
- Reassignment request approvals.

## 9.6 User Service

Responsible for:

- User identity, roles, team association.
- Notification preferences.

## 9.7 Real-Time Service

Responsible for:

- Broadcasting bug status/SLA changes.
- Updating connected triage boards and dashboards.

## 9.8 Notification Service

Responsible for:

- Assignment notifications.
- SLA warning/breach notifications.
- Escalation notifications.
- Status-change notifications.

## 9.9 Escalation Worker

Responsible for:

- Detecting SLA warning thresholds and breaches.
- Escalating to the next configured level.
- Re-escalating at configured intervals until resolved.
- Publishing escalation events.

## 9.10 Analytics Service

Responsible for:

- SLA compliance metrics.
- Aging/backlog metrics.
- Reopen-rate metrics.
- Team/project-wise reporting.

---

# 10. Bug State Model

```text
NEW
 |
 v
TRIAGED
 |
 +------> REJECTED
 |
 +------> DUPLICATE
 |
 +------> WONT_FIX
 |
 v
ASSIGNED
 |
 v
IN_PROGRESS
 |
 v
FIXED
 |
 v
VERIFIED
 |
 +------> CLOSED
 |
 +------> REOPENED
             |
             v
          ASSIGNED
```

---

# 11. SLA State Model

```text
SLA_STARTED  (on TRIAGED)
    |
    v
ON_TRACK
    |
    | Elapsed >= Warning Threshold (e.g. 80%)
    v
AT_RISK
    |
    | Elapsed >= 100% of SLA duration
    v
BREACHED
    |
    +------> Re-Escalate (interval)  [loop while unresolved]

ON_TRACK / AT_RISK
    |
    | Bug reaches CLOSED or VERIFIED before deadline
    v
MET
```

---

# 12. Severity → SLA & Escalation Matrix

| Severity | Default SLA (resolution) | Warning Threshold | Escalation Level 1 | Escalation Level 2 | Escalation Level 3 |
|---|---|---|---|---|---|
| CRITICAL | 4 business hours | 80% elapsed | Assignee + Triage Lead | Engineering Manager | Director / Release Owner |
| HIGH | 1 business day | 80% elapsed | Assignee + Triage Lead | Engineering Manager | — |
| MEDIUM | 3 business days | 80% elapsed | Assignee | Triage Lead | — |
| LOW | 7 business days | 80% elapsed | Assignee | — | — |

Values above are defaults; administrators can configure them per project.

---

# 13. SLA Deadline Calculation

An SLA deadline is computed as:

```text
SLA Deadline = Triage Timestamp
             + SLA Duration (per severity/project policy)
             adjusted for Business Calendar (if enabled)
```

Business-calendar adjustment excludes:

```text
Non-working hours
Weekends
Configured holidays
```

---

# 14. Real-Time Architecture

Real-time updates are required when:

- A bug is created.
- A bug is triaged (severity/priority set).
- A bug is assigned/reassigned.
- A bug's status changes.
- SLA state changes (`ON_TRACK` → `AT_RISK` → `BREACHED` → `MET`).
- A bug is escalated.
- A bug is marked release-blocking.

Event flow:

```text
Bug / Triage / SLA Service
      |
      v
Event / Message Queue
      |
      v
Real-Time Service
      |
      v
WebSocket / SSE
      |
      v
Connected Users
      |
      v
Triage Board / SLA Dashboard Updated
```

---

# 15. Event Model

Example event:

```json
{
  "eventType": "BUG_SLA_BREACHED",
  "bugId": "BUG-48213",
  "projectId": "PRJ-CHECKOUT",
  "severity": "CRITICAL",
  "slaState": "BREACHED",
  "escalationLevel": 1,
  "timestamp": "2026-09-26T10:30:00Z"
}
```

Other events:

```text
BUG_CREATED
BUG_TRIAGED
BUG_ASSIGNED
BUG_REASSIGNED
BUG_STATUS_CHANGED
BUG_SLA_WARNING
BUG_SLA_BREACHED
BUG_ESCALATED
BUG_REOPENED
BUG_CLOSED
BUG_RELEASE_BLOCK_FLAGGED
BUG_RELEASE_BLOCK_CLEARED
```

---

# 16. API Architecture

Base URL:

```text
/api/v1
```

All APIs should use:

- JSON request/response.
- Authentication token.
- Correlation ID.
- Standard HTTP status codes.
- Consistent error response structure.

---

# 17. Authentication APIs

## GET /api/v1/auth/me

Returns the authenticated user's profile.

Response:

```json
{
  "userId": "U123",
  "name": "Priya Raman",
  "email": "priya@example.com",
  "role": "TRIAGE_LEAD",
  "teamId": "TEAM-PLATFORM"
}
```

Authentication itself is delegated to enterprise SSO.

---

# 18. Bug APIs

## POST /api/v1/bugs

Report a new bug.

Request:

```json
{
  "title": "Checkout fails with 500 on discount code apply",
  "description": "Applying a valid discount code returns a 500 error.",
  "projectId": "PRJ-CHECKOUT",
  "stepsToReproduce": "1. Add item to cart\n2. Apply code SAVE10\n3. Observe error",
  "environment": {
    "build": "2.14.3",
    "os": "Windows 11",
    "browser": "Chrome 128"
  },
  "suggestedSeverity": "HIGH",
  "attachments": ["s3://bugs/BUG-48213/screenshot1.png"]
}
```

Response: `201 Created` with the created bug in `NEW` status.

## GET /api/v1/bugs/{bugId}

Get bug details, including current status, SLA state, and assignee.

## GET /api/v1/bugs

List/search bugs.

Query parameters:

```text
projectId
status
severity
priority
assigneeId
reporterId
releaseBlocking
slaState
from
to
```

## PATCH /api/v1/bugs/{bugId}

Update permitted bug fields (title, description, environment, attachments).

## POST /api/v1/bugs/{bugId}/status

Transition bug status (e.g., start progress, mark fixed, verify, close, reopen).

Request:

```json
{
  "newStatus": "FIXED",
  "comment": "Fixed null check on discount code validation."
}
```

The API enforces the allowed state-machine transitions (Section 10).

## POST /api/v1/bugs/{bugId}/comments

Add a comment to a bug.

## GET /api/v1/bugs/{bugId}/comments

Retrieve the comment/activity history of a bug.

---

# 19. Triage APIs

## GET /api/v1/triage/queue

Get the real-time untriaged/active triage queue.

Query parameters:

```text
projectId
severity
priority
releaseBlocking
```

## POST /api/v1/bugs/{bugId}/triage

Classify a bug — sets severity, priority, and starts the SLA clock.

Request:

```json
{
  "severity": "CRITICAL",
  "priority": "P0",
  "releaseBlocking": true
}
```

Response includes the computed SLA deadline.

## POST /api/v1/bugs/{bugId}/reject

Mark a bug as rejected, duplicate, or won't-fix.

Request:

```json
{
  "resolution": "DUPLICATE",
  "duplicateOfBugId": "BUG-48120",
  "comment": "Same root cause as BUG-48120."
}
```

---

# 20. Assignment APIs

## POST /api/v1/bugs/{bugId}/assign

Assign a bug to a developer or team.

Request:

```json
{
  "assigneeId": "U456",
  "teamId": "TEAM-PLATFORM"
}
```

## GET /api/v1/assignment/suggestions

Get workload-aware assignee suggestions.

Query parameters:

```text
projectId
teamId
severity
```

Response:

```json
{
  "suggestions": [
    { "userId": "U456", "openBugCount": 3 },
    { "userId": "U789", "openBugCount": 5 }
  ]
}
```

## POST /api/v1/bugs/{bugId}/reassignment-request

Developer requests reassignment.

## POST /api/v1/bugs/{bugId}/reassignment-request/{requestId}/decision

Triage lead approves or denies a reassignment request.

---

# 21. SLA APIs

## GET /api/v1/bugs/{bugId}/sla

Get current SLA state, deadline, and time remaining/elapsed.

Response:

```json
{
  "bugId": "BUG-48213",
  "slaState": "AT_RISK",
  "slaDeadline": "2026-09-26T14:00:00Z",
  "elapsedPercentage": 82
}
```

## GET /api/v1/sla/breaches

List currently breached bugs.

Query parameters:

```text
projectId
severity
teamId
```

---

# 22. Escalation APIs

## GET /api/v1/bugs/{bugId}/escalations

Get the escalation history for a bug.

## POST /api/v1/bugs/{bugId}/escalations/acknowledge

Acknowledge an active escalation, pausing re-escalation reminders (does not stop SLA breach status).

Request:

```json
{
  "acknowledgedBy": "U789",
  "note": "Investigating now, ETA 1 hour."
}
```

---

# 23. Release-Blocking APIs

## POST /api/v1/bugs/{bugId}/release-block

Flag a bug as release-blocking for a release.

Request:

```json
{
  "releaseId": "REL-2026.09.3"
}
```

## DELETE /api/v1/bugs/{bugId}/release-block

Clear the release-blocking flag.

## GET /api/v1/releases/{releaseId}/blocking-bugs

List all bugs currently blocking a given release.

---

# 24. Notification APIs

## GET /api/v1/notifications

Retrieve user notifications.

## PATCH /api/v1/notifications/{notificationId}/read

Mark notification as read.

Notifications are primarily generated asynchronously by the notification worker.

---

# 25. Real-Time API

## GET /api/v1/realtime/bugs

Establish WebSocket/SSE connection for live bug/SLA/triage-board updates.

Example events:

```text
BUG_CREATED
BUG_TRIAGED
BUG_STATUS_CHANGED
BUG_SLA_WARNING
BUG_SLA_BREACHED
BUG_ESCALATED
```

The exact transport can be WebSocket or SSE based on the final frontend requirements.

---

# 26. Admin APIs

## GET /api/v1/admin/sla-policies

List configured SLA policies.

## PUT /api/v1/admin/sla-policies/{projectId}/{severity}

Configure SLA duration and warning threshold for a severity within a project.

Request:

```json
{
  "slaHours": 4,
  "warningThresholdPercent": 80,
  "reEscalationIntervalMinutes": 30
}
```

## PUT /api/v1/admin/escalation-rules/{projectId}/{severity}

Configure escalation levels and recipients.

Request:

```json
{
  "levels": [
    { "level": 1, "notify": ["ASSIGNEE", "TRIAGE_LEAD"] },
    { "level": 2, "notify": ["ENGINEERING_MANAGER"] },
    { "level": 3, "notify": ["DIRECTOR"] }
  ]
}
```

## PUT /api/v1/admin/business-calendar

Configure working hours, time zone, and holidays used for SLA calculation.

---

# 27. Analytics APIs

## GET /api/v1/analytics/sla-compliance

SLA compliance rate, overall and by severity/project/team.

## GET /api/v1/analytics/breaches

Breach counts and average breach duration.

## GET /api/v1/analytics/aging

Open-bug aging distribution (e.g., 0–1 day, 1–3 days, 3–7 days, 7+ days).

## GET /api/v1/analytics/reopen-rate

Reopen rate by project/team.

## GET /api/v1/analytics/team/{teamId}

Team-wise defect load and resolution metrics.

---

# 28. API Error Model

All APIs should use a consistent error structure:

```json
{
  "error": {
    "code": "INVALID_STATUS_TRANSITION",
    "message": "Cannot move a bug from NEW directly to CLOSED.",
    "correlationId": "c7f1d9..."
  }
}
```

Common errors:

```text
400 BAD_REQUEST
401 UNAUTHORIZED
403 FORBIDDEN
404 NOT_FOUND
409 CONFLICT
422 UNPROCESSABLE_ENTITY
429 TOO_MANY_REQUESTS
500 INTERNAL_SERVER_ERROR
```

---

# 29. Database Model

Recommended transactional database: PostgreSQL.

## users

```text
id
external_user_id
name
email
role
team_id
created_at
updated_at
```

## teams

```text
id
name
created_at
updated_at
```

## projects

```text
id
name
description
created_at
updated_at
```

## releases

```text
id
project_id
version
status
created_at
updated_at
```

## bugs

```text
id
project_id
release_id
reporter_id
assignee_id
title
description
steps_to_reproduce
environment
status
severity
priority
release_blocking
sla_deadline
sla_state
created_at
updated_at
closed_at
```

## bug_comments

```text
id
bug_id
user_id
comment
created_at
```

## bug_attachments

```text
id
bug_id
file_url
uploaded_by
created_at
```

## sla_policies

```text
id
project_id
severity
sla_hours
warning_threshold_percent
re_escalation_interval_minutes
created_at
updated_at
```

## escalation_rules

```text
id
project_id
severity
level
notify_roles
created_at
updated_at
```

## escalations

```text
id
bug_id
level
triggered_at
acknowledged_by
acknowledged_at
```

## business_calendar

```text
id
project_id
timezone
working_hours_start
working_hours_end
holidays
created_at
updated_at
```

## notifications

```text
id
user_id
type
message
status
created_at
read_at
```

## audit_logs

```text
id
user_id
action
resource_type
resource_id
old_value
new_value
created_at
```

---

# 30. Redis Usage

Redis is used for:

- Frequently requested triage-queue and dashboard reads.
- Short-lived SLA-state cache for fast countdown rendering.
- Distributed locks for assignment/reassignment race conditions.
- Rate limiting.

Important:

**Redis must not become the authoritative source for SLA/bug state.**

PostgreSQL remains the transactional source of truth.

---

# 31. Queue / Asynchronous Processing

A managed queue can be used for:

- Notification jobs.
- SLA-check / escalation jobs.
- Analytics processing.
- Real-time event propagation.

Example:

```text
Bug / Triage / SLA Service
      |
      v
Message Queue
      |
      +----> Notification Worker
      |
      +----> Escalation Worker
      |
      +----> Analytics Worker
      |
      +----> Real-Time Event Worker
```

---

# 32. SLA Monitoring & Escalation Workflow

```text
Bug Triaged (SLA Started)
      |
      v
Escalation Worker Polls / Scheduled Check
      |
      v
Compute Elapsed % of SLA
      |
      +---- < Warning Threshold ----> ON_TRACK (no action)
      |
      +---- >= Warning Threshold, < 100% ----> AT_RISK
      |                                            |
      |                                            v
      |                                   Send Warning Notification
      |
      +---- >= 100% ----> BREACHED
                              |
                    +---------+---------+
                    |                   |
                    v                   v
            Escalate to Level N   Publish BUG_SLA_BREACHED
                    |
                    v
          Re-Escalate on Interval
          (until acknowledged/resolved)
```

The worker should be idempotent so that repeated processing does not create duplicate escalations or notifications.

---

# 33. Security Architecture

## Authentication

Enterprise SSO using OIDC/OAuth 2.0-compatible identity.

## Authorization

RBAC:

```text
ADMIN
ENGINEERING_MANAGER
TRIAGE_LEAD
DEVELOPER
REPORTER
```

## API Security

- HTTPS/TLS.
- Token validation.
- Authorization middleware.
- Input validation.
- Rate limiting.
- Audit logging.
- Secure secrets management.

## Data Security

- Encryption in transit.
- Encryption at rest.
- Least-privilege database access.
- No credentials stored in source code.

---

# 34. Observability

Every request should carry a correlation ID.

Monitor:

### Application

- API latency.
- Error rate.
- Request count.
- Invalid status-transition attempts.
- Escalation-worker job failures.

### Business

- SLA compliance rate.
- Breach count and average breach duration.
- Triage backlog size and age.
- Reopen rate.
- Release-blocking bug count.

### Infrastructure

- CPU.
- Memory.
- Database connections.
- Queue depth.
- Redis utilization.

---

# 35. Failure Handling

## Bug Service Failure

Return an error without creating a partial bug record.

## Notification Failure

Bug/triage/assignment action should remain successful.

Notification can be retried asynchronously.

## Queue Failure

Messages should be retried and moved to a dead-letter queue after configured attempts.

## Real-Time Connection Failure

The client reconnects and retrieves the latest triage/SLA state through the normal REST APIs.

## Escalation Worker Failure

Jobs should be retryable and idempotent — a missed run must not silently skip an escalation; the next run re-evaluates all active SLAs.

---

# 36. Scalability

Horizontal scaling:

```text
                 Load Balancer
                      |
          +-----------+-----------+
          |           |           |
       API Pod     API Pod     API Pod
          |           |           |
          +-----------+-----------+
                      |
                  PostgreSQL
```

Background workers can scale independently:

```text
Queue
 |
 +---- Escalation Worker 1
 +---- Escalation Worker 2
 +---- Notification Worker
 +---- Analytics Worker
```

This prevents SLA-checking/escalation processing from consuming API capacity, and keeps escalation latency low even under high bug volume.

---

# 37. End-to-End Bug Lifecycle Flow

```text
Reporter
   |
   v
Report Bug (NEW)
   |
   v
Bug Service -> PostgreSQL
   |
   v
Event: BUG_CREATED
   |
   v
Triage Lead Notified
   |
   v
Triage (Severity + Priority Set)
   |
   v
SLA Engine Computes Deadline
   |
   v
Status = TRIAGED, SLA = ON_TRACK
   |
   v
Assignment Service Assigns Developer
   |
   v
Status = ASSIGNED
   |
   v
Developer Works (IN_PROGRESS -> FIXED)
   |
   v
QA Verifies (VERIFIED)
   |
   +---- Confirmed Fixed ----> CLOSED, SLA = MET
   |
   +---- Not Fixed ----> REOPENED -> ASSIGNED
```

---

# 38. SLA Breach Flow

```text
Bug TRIAGED
      |
      v
SLA Clock Starts
      |
      v
Escalation Worker Checks Periodically
      |
      +---- Elapsed >= Warning % ----> AT_RISK
      |                                    |
      |                                    v
      |                            Notify Assignee + Triage Lead
      |
      +---- Elapsed >= 100% ----> BREACHED
                                       |
                                       v
                              Escalate (Level 1)
                                       |
                                       v
                         Still Unresolved After Interval
                                       |
                                       v
                              Escalate (Level 2, Level 3...)
```

---

# 39. Reassignment Flow

```text
Developer
   |
   v
Request Reassignment
   |
   v
Triage Lead Reviews
   |
   +---- Approve ----> Assignment Service Reassigns
   |                         |
   |                         v
   |                  Event: BUG_REASSIGNED
   |
   +---- Deny ----> Bug Remains with Current Assignee
```

---

# 40. Recommended Project Structure

```text
defect-triage-sla-tracker/
|
+-- frontend/
|   +-- src/
|       +-- components/
|       +-- pages/
|       +-- services/
|       +-- hooks/
|       +-- state/
|
+-- backend/
    +-- src/
        +-- modules/
        |   +-- auth/
        |   +-- users/
        |   +-- projects/
        |   +-- bugs/
        |   +-- triage/
        |   +-- sla/
        |   +-- assignment/
        |   +-- escalation/
        |   +-- notifications/
        |   +-- analytics/
        |   +-- realtime/
        |
        +-- workers/
        |   +-- escalation/
        |   +-- notifications/
        |   +-- analytics/
        |
        +-- middleware/
        +-- config/
        +-- database/
        +-- events/
        +-- shared/
```

---

# 41. API Summary

| Functionality | Method | Endpoint |
|---|---|---|
| Current user | GET | `/api/v1/auth/me` |
| Report bug | POST | `/api/v1/bugs` |
| Get bug | GET | `/api/v1/bugs/{bugId}` |
| List/search bugs | GET | `/api/v1/bugs` |
| Update bug | PATCH | `/api/v1/bugs/{bugId}` |
| Change bug status | POST | `/api/v1/bugs/{bugId}/status` |
| Add comment | POST | `/api/v1/bugs/{bugId}/comments` |
| Get comments | GET | `/api/v1/bugs/{bugId}/comments` |
| Triage queue | GET | `/api/v1/triage/queue` |
| Triage bug | POST | `/api/v1/bugs/{bugId}/triage` |
| Reject/duplicate/won't-fix | POST | `/api/v1/bugs/{bugId}/reject` |
| Assign bug | POST | `/api/v1/bugs/{bugId}/assign` |
| Assignee suggestions | GET | `/api/v1/assignment/suggestions` |
| Request reassignment | POST | `/api/v1/bugs/{bugId}/reassignment-request` |
| Decide reassignment | POST | `/api/v1/bugs/{bugId}/reassignment-request/{requestId}/decision` |
| Get bug SLA | GET | `/api/v1/bugs/{bugId}/sla` |
| List SLA breaches | GET | `/api/v1/sla/breaches` |
| Get escalation history | GET | `/api/v1/bugs/{bugId}/escalations` |
| Acknowledge escalation | POST | `/api/v1/bugs/{bugId}/escalations/acknowledge` |
| Flag release-blocking | POST | `/api/v1/bugs/{bugId}/release-block` |
| Clear release-blocking | DELETE | `/api/v1/bugs/{bugId}/release-block` |
| List release-blocking bugs | GET | `/api/v1/releases/{releaseId}/blocking-bugs` |
| Notifications | GET | `/api/v1/notifications` |
| Mark notification read | PATCH | `/api/v1/notifications/{notificationId}/read` |
| Real-time bug/SLA stream | GET | `/api/v1/realtime/bugs` |
| List SLA policies | GET | `/api/v1/admin/sla-policies` |
| Configure SLA policy | PUT | `/api/v1/admin/sla-policies/{projectId}/{severity}` |
| Configure escalation rules | PUT | `/api/v1/admin/escalation-rules/{projectId}/{severity}` |
| Configure business calendar | PUT | `/api/v1/admin/business-calendar` |
| SLA compliance analytics | GET | `/api/v1/analytics/sla-compliance` |
| Breach analytics | GET | `/api/v1/analytics/breaches` |
| Aging analytics | GET | `/api/v1/analytics/aging` |
| Reopen-rate analytics | GET | `/api/v1/analytics/reopen-rate` |
| Team analytics | GET | `/api/v1/analytics/team/{teamId}` |

---

# 42. Example API Sequence

## Bug Reported and Triaged

```text
POST /api/v1/bugs
        |
        v
201 Created (status = NEW)
        |
        +----> Event: BUG_CREATED
        |
        +----> Notification to Triage Lead
        |
        v
POST /api/v1/bugs/{bugId}/triage
        |
        v
200 OK (status = TRIAGED, SLA computed)
        |
        +----> Event: BUG_TRIAGED
```

## SLA Breach and Escalation

```text
Escalation Worker (scheduled check)
        |
        v
Detects Elapsed >= 100%
        |
        v
Update bug.sla_state = BREACHED
        |
        v
Insert escalations row (level = 1)
        |
        +----> Event: BUG_SLA_BREACHED
        |
        +----> Notification to Assignee + Triage Lead
```

## Reassignment

```text
POST /api/v1/bugs/{bugId}/reassignment-request
        |
        v
201 Created
        |
        v
POST /api/v1/bugs/{bugId}/reassignment-request/{requestId}/decision
        |
        v
200 OK
        |
        +----> Event: BUG_REASSIGNED
```

---

# 43. Deployment Architecture on AWS

```text
                         Internet / Corporate Network
                                      |
                                      v
                              CDN / API Gateway
                                      |
                         +------------+------------+
                         |                         |
                         v                         v
                    React Frontend             Backend API
                                                   |
                          +------------+-----------+-----------+------------+
                          |            |           |           |            |
                          v            v           v           v            v
                       Bug          Triage       SLA       Assignment    User/Auth
                      Service       Service     Engine       Service      Service
                          |
                          v
                      PostgreSQL
                          |
                +---------+----------+
                |                    |
                v                    v
              Redis                Queue
                                     |
                    +----------------+----------------+
                    |                |                 |
                    v                v                 v
             Notification      Escalation          Analytics
                Worker            Worker              Worker
                    |
                    v
               Email / Teams

                    |
                    v
             Monitoring / Logs
```

---

# 44. Deployment Considerations

The application should be containerized.

Recommended logical deployment units:

- Frontend container/static hosting.
- Backend API containers.
- Background worker containers (escalation, notification, analytics — scaled independently).
- Managed PostgreSQL.
- Managed Redis.
- Managed queue.
- Managed monitoring/logging.

The system should support separate environments:

```text
Development
    |
    v
QA/Test
    |
    v
Production
```

---

# 45. Future Extensions

Possible future enhancements:

- Integration with existing issue trackers (Jira, Azure DevOps) as a sync layer rather than a replacement.
- CI/CD pipeline integration to auto-link bugs to failing builds/tests.
- Linkage with the Test Case Generator use case — auto-suggest a regression test case when a bug is closed.
- Predictive SLA-breach risk scoring using historical triage/resolution data.
- Root-cause and defect-clustering analytics (recurring defect patterns).
- Slack/Teams bot for triage actions (assign, escalate, acknowledge) without leaving chat.
- Mobile push notifications for on-call escalation.

These are future extensions and are not required for the core assignment.

---

# 46. Final Solution Summary

The proposed solution is a **Real-Time Defect/Bug Triage & SLA Tracker**.

It addresses a common engineering/QA operational problem by providing:

- Real-time triage queue for incoming defects.
- Severity/priority-driven SLA assignment.
- Live SLA countdown and breach detection.
- Automatic, multi-level escalation.
- Workload-aware assignment and reassignment.
- Full defect lifecycle tracking, including reopen handling.
- Release-blocking visibility.
- Administrative SLA/escalation configuration.
- SLA compliance and defect-aging analytics.
- Real-time updates to triage boards and dashboards.

The architecture separates:

```text
Bug Management
      |
Triage Management
      |
SLA Engine
      |
Escalation Processing
      |
Notifications
      |
Analytics
```

This separation provides a clean foundation for scaling the solution across projects/teams and extending it toward CI/CD and issue-tracker integrations in future iterations.

---

# 47. Architecture Decision Summary

| Area | Decision |
|---|---|
| Use Case | Real-Time Defect/Bug Triage & SLA Tracker |
| Frontend | React.js |
| Backend | Node.js + TypeScript |
| API | REST |
| Real-Time | WebSocket / SSE |
| Primary DB | PostgreSQL |
| Cache | Redis |
| Async Processing | Managed Queue |
| Authentication | Enterprise SSO |
| Authorization | RBAC |
| Deployment | AWS |
| Containerization | Docker |
| SLA Consistency | Idempotent escalation-worker checks + DB as source of truth |
| Notifications | Email + Teams-ready architecture |
| Background Processing | Workers (escalation, notification, analytics) |
| Monitoring | CloudWatch / OpenTelemetry-compatible |
| Core Operational Feature | Real-time triage queue + SLA countdown |
| Key Automation | Automatic multi-level SLA escalation |
| Admin Capability | SLA policy + escalation rule + business calendar configuration |
| Future Scope | Issue-tracker integration, CI/CD linkage, predictive breach risk |
