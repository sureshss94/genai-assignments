# Home Assignment — Real-Time Office Meeting Room & Resource Management System

## 1. Problem Statement

### Use Case

**Real-Time Smart Meeting Room Management**

### Operational Problem

In many offices, meeting rooms are difficult to manage efficiently:

- Employees reserve rooms but do not actually use them.
- Rooms remain occupied after a meeting has ended.
- Employees cannot easily find an available room in real time.
- Meeting rooms may have different capacities and equipment.
- Double-booking or stale bookings can occur across systems.
- Facilities/administrators have limited visibility into room utilization.
- Employees waste time searching for suitable rooms.

### Proposed Solution

Build a real-time office meeting-room management platform that allows employees to:

1. View room availability in real time.
2. Search for rooms based on time, capacity and required equipment.
3. Book a room.
4. Check in when they arrive.
5. Automatically release a room when a user does not check in within a configurable period.
6. End a meeting early and immediately make the room available.
7. Extend a meeting when the room is available.
8. View current room occupancy/status.
9. Allow facilities/admin users to manage rooms and monitor utilization.

This is different from the completed Test Case Generator use case and focuses on a common real-time office operations problem.

---

# 2. Goals

## Primary Goals

- Reduce unused/stale room reservations.
- Provide real-time room availability.
- Prevent conflicting bookings.
- Make room discovery faster.
- Automatically release unused reservations.
- Provide room utilization visibility to administrators.

## Secondary Goals

- Support room capacity and equipment-based search.
- Provide notifications for upcoming meetings and booking events.
- Provide utilization analytics.
- Provide an extensible architecture for future office resources.

---

# 3. Non-Goals

The first version does not include:

- Employee attendance tracking.
- Payroll.
- Employee performance monitoring.
- Full building access-control replacement.
- Video conferencing platform replacement.
- AI-based employee monitoring.

---

# 4. Users / Roles

## Employee

Can:

- View room availability.
- Search rooms.
- Create bookings.
- Check in.
- End meetings.
- Extend meetings.
- Cancel bookings.
- View their bookings.

## Facilities/Admin

Can:

- Create/update/deactivate rooms.
- Configure room capacity and equipment.
- View live room status.
- Override/cancel bookings when authorized.
- View utilization reports.
- Configure check-in and auto-release policies.

---

# 5. Functional Requirements

## FR-01 — Real-Time Room Availability

Users should be able to see:

- Available
- Reserved
- Occupied
- Maintenance
- Out of service

for each meeting room.

## FR-02 — Room Search

Users can search using:

- Date
- Start time
- End time
- Capacity
- Equipment
- Location/floor
- Room status

## FR-03 — Room Booking

Users can reserve an available room.

The system must prevent overlapping bookings.

## FR-04 — Check-In

A user must check in when they arrive.

Check-in can be initiated through:

- Web/mobile UI.
- Room QR code.
- Future room-panel integration.

## FR-05 — Automatic Release

If a booking is not checked in within a configurable grace period:

```text
Booking Created
      |
      v
Waiting for Check-In
      |
      | Grace Period Expired
      v
Auto Release
      |
      v
Room Available
```

## FR-06 — Early Release

Users can end a meeting before the reserved end time.

The room becomes available immediately.

## FR-07 — Meeting Extension

A user can request an extension.

Extension succeeds only if there is no conflicting booking.

## FR-08 — Notifications

Users can receive:

- Booking confirmation.
- Upcoming meeting reminder.
- Check-in reminder.
- Auto-release notification.
- Cancellation notification.
- Extension result.

## FR-09 — Administration

Admins can:

- Create rooms.
- Update rooms.
- Deactivate rooms.
- Configure equipment.
- Set room capacity.
- Mark rooms under maintenance.

## FR-10 — Utilization Analytics

Admins can view:

- Total bookings.
- Completed meetings.
- No-show bookings.
- Auto-released bookings.
- Average utilization.
- Room-wise utilization.
- Peak usage periods.

---

# 6. Non-Functional Requirements

## Performance

Target:

- Room availability API: p95 under 500 ms under normal load.
- Booking API: p95 under 1 second under normal load.
- Real-time status propagation: target within a few seconds.

These are architectural targets and should be validated during performance testing.

## Availability

The system should be designed for high availability because room booking is an operational service.

## Consistency

Booking creation must use transactional/concurrency controls to prevent double booking.

## Security

- Enterprise SSO.
- RBAC.
- TLS.
- Secure credential storage.
- Audit logging.
- API authorization.

## Scalability

The system should support:

- Multiple offices.
- Multiple floors.
- Hundreds/thousands of meeting rooms.
- Concurrent users.
- Real-time status updates.

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
          +------------------------+-------------------------+
          |                        |                         |
          v                        v                         v
 +----------------+       +----------------+       +----------------+
 | Room Service   |       | Booking Service|       | User Service   |
 +-------+--------+       +-------+--------+       +----------------+
          |                       |                         |
          +-----------------------+-------------------------+
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
                                      +-----------------+----------------+
                                      |                 |                |
                                      v                 v                v
                              Notification       Auto Release      Analytics
                                Worker              Worker            Worker
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

## 9.2 Room Service

Responsible for:

- Room CRUD.
- Room metadata.
- Capacity.
- Equipment.
- Location.
- Room status.
- Maintenance state.

## 9.3 Booking Service

Responsible for:

- Booking creation.
- Availability validation.
- Conflict prevention.
- Cancellation.
- Check-in.
- Early release.
- Extension.

## 9.4 User Service

Responsible for:

- User identity.
- Roles.
- Office association.
- Preferences.

## 9.5 Real-Time Service

Responsible for:

- Broadcasting room availability changes.
- Broadcasting booking status.
- Updating connected clients.

## 9.6 Notification Service

Responsible for:

- Booking confirmations.
- Reminders.
- Check-in reminders.
- Cancellation notifications.
- Auto-release notifications.

## 9.7 Auto-Release Worker

Responsible for:

- Finding expired unconfirmed bookings.
- Releasing rooms.
- Updating booking state.
- Publishing room availability events.
- Sending notifications.

## 9.8 Analytics Service

Responsible for:

- Booking metrics.
- Utilization.
- No-show rate.
- Auto-release count.
- Room usage trends.

---

# 10. Room State Model

```text
AVAILABLE
    |
    v
RESERVED
    |
    v
OCCUPIED
    |
    +------> AVAILABLE
    |
    +------> MAINTENANCE

RESERVED
    |
    +------> OCCUPIED      (Check-In)
    |
    +------> AVAILABLE     (Cancel)
    |
    +------> AVAILABLE     (Auto Release)

MAINTENANCE
    |
    v
AVAILABLE
```

---

# 11. Booking State Model

```text
CREATED
   |
   +------> CANCELLED
   |
   +------> CHECKED_IN
               |
               +------> COMPLETED
               |
               +------> EXTENDED
                          |
                          v
                       COMPLETED

CREATED
   |
   +------> AUTO_RELEASED
```

---

# 12. Booking Conflict Prevention

The most important transactional requirement is:

> Two users must not successfully reserve the same room for overlapping time periods.

Conceptual flow:

```text
User A                          User B
  |                               |
  | Book Room 101                  | Book Room 101
  | 10:00 - 11:00                 | 10:30 - 11:30
  |                               |
  +---------------+---------------+
                  |
                  v
           Booking Service
                  |
                  v
          Transaction / Lock
                  |
          +-------+-------+
          |               |
          v               v
      Request A        Request B
          |               |
       SUCCESS           CONFLICT
          |               |
          v               v
       Booking          409 Conflict
```

The database must enforce the final consistency rule rather than relying only on frontend validation.

---

# 13. Availability Calculation

A room is available for a requested time window when:

```text
Room is Active
AND
Room is Not Under Maintenance
AND
No Existing Booking Overlaps Requested Time
```

Overlap condition:

```text
existing.start < requested.end
AND
existing.end > requested.start
```

---

# 14. Real-Time Architecture

Real-time updates are required when:

- A booking is created.
- A booking is cancelled.
- A user checks in.
- A meeting ends.
- A booking is auto-released.
- A room enters maintenance.
- A booking is extended.

Event flow:

```text
Booking Service
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
Room Availability UI Updated
```

---

# 15. Event Model

Example event:

```json
{
  "eventType": "ROOM_STATUS_CHANGED",
  "roomId": "ROOM-101",
  "officeId": "CHN-01",
  "status": "OCCUPIED",
  "timestamp": "2026-09-26T10:30:00Z",
  "bookingId": "BOOK-12345"
}
```

Other events:

```text
BOOKING_CREATED
BOOKING_CANCELLED
BOOKING_CHECKED_IN
BOOKING_COMPLETED
BOOKING_EXTENDED
BOOKING_AUTO_RELEASED
ROOM_CREATED
ROOM_UPDATED
ROOM_MAINTENANCE_STARTED
ROOM_MAINTENANCE_ENDED
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
  "name": "John Doe",
  "email": "john@example.com",
  "role": "EMPLOYEE",
  "officeId": "CHN-01"
}
```

Authentication itself is delegated to enterprise SSO.

---

# 18. Room APIs

## GET /api/v1/rooms

Get rooms.

Query parameters:

```text
officeId
floor
status
capacity
equipment
```

Example:

```http
GET /api/v1/rooms?officeId=CHN-01&capacity=8&equipment=DISPLAY
```

## GET /api/v1/rooms/{roomId}

Get room details.

## POST /api/v1/rooms

Admin creates a room.

Request:

```json
{
  "name": "Conference Room 101",
  "officeId": "CHN-01",
  "floor": 1,
  "capacity": 8,
  "equipment": [
    "DISPLAY",
    "VIDEO_CONFERENCE"
  ]
}
```

## PATCH /api/v1/rooms/{roomId}

Update room metadata.

## DELETE /api/v1/rooms/{roomId}

Deactivate a room.

## POST /api/v1/rooms/{roomId}/maintenance

Mark room under maintenance.

## DELETE /api/v1/rooms/{roomId}/maintenance

Remove maintenance status.

---

# 19. Availability APIs

## GET /api/v1/rooms/availability

Search available rooms.

Parameters:

```text
officeId
floor
startTime
endTime
capacity
equipment
```

Example:

```http
GET /api/v1/rooms/availability?officeId=CHN-01&startTime=2026-09-26T10:00:00Z&endTime=2026-09-26T11:00:00Z&capacity=6
```

Response:

```json
{
  "rooms": [
    {
      "roomId": "ROOM-101",
      "name": "Conference Room 101",
      "capacity": 8,
      "status": "AVAILABLE"
    }
  ]
}
```

---

# 20. Booking APIs

## POST /api/v1/bookings

Create a booking.

Request:

```json
{
  "roomId": "ROOM-101",
  "startTime": "2026-09-26T10:00:00Z",
  "endTime": "2026-09-26T11:00:00Z",
  "title": "Project Discussion"
}
```

Possible responses:

- `201 Created`
- `400 Bad Request`
- `409 Conflict`

## GET /api/v1/bookings/{bookingId}

Get booking details.

## GET /api/v1/bookings

Query user's bookings.

Parameters:

```text
from
to
status
roomId
```

## PATCH /api/v1/bookings/{bookingId}

Update permitted booking fields.

## DELETE /api/v1/bookings/{bookingId}

Cancel booking.

---

# 21. Check-In APIs

## POST /api/v1/bookings/{bookingId}/check-in

Check into the reserved room.

Response:

```json
{
  "bookingId": "BOOK-12345",
  "status": "CHECKED_IN",
  "checkedInAt": "2026-09-26T10:02:00Z"
}
```

Validation:

- User must be authorized for the booking.
- Booking must be active.
- Check-in must be within allowed time window.

---

# 22. Meeting Completion APIs

## POST /api/v1/bookings/{bookingId}/complete

End the meeting early or mark it completed.

Result:

```text
Booking -> COMPLETED
Room    -> AVAILABLE
```

A real-time room status event is published.

---

# 23. Extension API

## POST /api/v1/bookings/{bookingId}/extend

Request:

```json
{
  "newEndTime": "2026-09-26T11:30:00Z"
}
```

Possible outcomes:

```text
200 OK       Extension successful
409 Conflict Another booking exists
400 Bad Request Invalid time
```

---

# 24. Notification APIs

## GET /api/v1/notifications

Retrieve user notifications.

## PATCH /api/v1/notifications/{notificationId}/read

Mark notification as read.

Notifications are primarily generated asynchronously by the notification worker.

---

# 25. Real-Time API

## GET /api/v1/realtime/rooms

Establish WebSocket/SSE connection for room-status updates.

Example events:

```text
ROOM_STATUS_CHANGED
BOOKING_CREATED
BOOKING_CANCELLED
BOOKING_AUTO_RELEASED
ROOM_MAINTENANCE_CHANGED
```

The exact transport can be WebSocket or SSE based on the final frontend requirements.

---

# 26. Admin APIs

## GET /api/v1/admin/rooms/utilization

Get room utilization.

Parameters:

```text
officeId
from
to
roomId
```

## GET /api/v1/admin/bookings/statistics

Returns:

```text
totalBookings
completedBookings
cancelledBookings
noShowBookings
autoReleasedBookings
```

## GET /api/v1/admin/rooms/status

Get live room status for an office/floor.

## PATCH /api/v1/admin/settings/check-in-policy

Configure:

```json
{
  "gracePeriodMinutes": 10
}
```

Only authorized administrators can modify policies.

---

# 27. Analytics APIs

## GET /api/v1/analytics/utilization

Room utilization report.

## GET /api/v1/analytics/no-shows

No-show statistics.

## GET /api/v1/analytics/peak-hours

Peak booking periods.

## GET /api/v1/analytics/rooms/{roomId}

Room-specific utilization.

---

# 28. API Error Model

All APIs should use a consistent error structure:

```json
{
  "error": {
    "code": "ROOM_BOOKING_CONFLICT",
    "message": "The requested room is already booked for the selected time.",
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
office_id
created_at
updated_at
```

## offices

```text
id
name
location
timezone
created_at
updated_at
```

## rooms

```text
id
office_id
name
floor
capacity
status
equipment
created_at
updated_at
```

## bookings

```text
id
room_id
user_id
title
start_time
end_time
status
checked_in_at
completed_at
created_at
updated_at
```

## room_maintenance

```text
id
room_id
start_time
end_time
reason
created_by
created_at
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

- Frequently requested room availability.
- Short-lived room status.
- Distributed locks where appropriate.
- Rate limiting.
- Session/cache data where required.

Important:

**Redis must not become the authoritative source for booking consistency.**

PostgreSQL remains the transactional source of truth.

---

# 31. Queue / Asynchronous Processing

A managed queue can be used for:

- Notification jobs.
- Auto-release jobs.
- Analytics processing.
- Real-time event propagation.
- Non-critical background tasks.

Example:

```text
Booking Service
      |
      v
Message Queue
      |
      +----> Notification Worker
      |
      +----> Auto Release Worker
      |
      +----> Analytics Worker
      |
      +----> Real-Time Event Worker
```

---

# 32. Auto-Release Workflow

```text
Booking Created
      |
      v
Wait Until Check-In Deadline
      |
      v
Check Booking Status
      |
      +---- Checked In ----> Continue
      |
      +---- Not Checked In
                 |
                 v
          Auto Release
                 |
        +--------+--------+
        |                 |
        v                 v
Update Booking       Publish Event
AUTO_RELEASED             |
        |                 v
        |          Room AVAILABLE
        |
        v
Notification
```

The worker should be idempotent so that repeated processing does not create inconsistent states.

---

# 33. Security Architecture

## Authentication

Enterprise SSO using OIDC/OAuth 2.0-compatible identity.

## Authorization

RBAC:

```text
ADMIN
PROJECT/FACILITY_ADMIN
EMPLOYEE
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
- Booking conflicts.
- Failed check-ins.

### Business

- No-show rate.
- Auto-release rate.
- Room utilization.
- Peak booking periods.
- Average meeting duration.

### Infrastructure

- CPU.
- Memory.
- Database connections.
- Queue depth.
- Redis utilization.

---

# 35. Failure Handling

## Booking Service Failure

Return an error without creating a partial booking.

## Notification Failure

Booking should remain successful.

Notification can be retried asynchronously.

## Queue Failure

Messages should be retried and moved to a dead-letter queue after configured attempts.

## Real-Time Connection Failure

The client reconnects and retrieves the latest room state through the normal availability API.

## Auto-Release Worker Failure

Jobs should be retryable and idempotent.

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
 +---- Worker 1
 +---- Worker 2
 +---- Worker 3
```

This prevents background processing from consuming API capacity.

---

# 37. End-to-End Booking Flow

```text
Employee
   |
   v
Search Room
   |
   v
Availability API
   |
   v
PostgreSQL
   |
   v
Available Rooms
   |
   v
Select Room
   |
   v
Create Booking
   |
   v
Transactional Conflict Check
   |
   +---- Conflict ----> 409
   |
   +---- Success
          |
          v
       Booking
          |
          +----> Queue
          |        |
          |        v
          |   Notification
          |
          +----> Real-Time Event
                   |
                   v
             Other Clients
```

---

# 38. Check-In Flow

```text
User
 |
 v
Open Booking
 |
 v
Check In
 |
 v
Booking Service
 |
 v
Validate Booking
 |
 v
Update:
Booking = CHECKED_IN
Room = OCCUPIED
 |
 +----> Event
 |
 +----> Notification / Audit
```

---

# 39. Early Completion Flow

```text
User
 |
 v
End Meeting
 |
 v
Booking Service
 |
 v
Booking = COMPLETED
 |
 v
Room = AVAILABLE
 |
 v
Publish ROOM_STATUS_CHANGED
 |
 v
All Connected Clients
```

---

# 40. Recommended Project Structure

```text
office-room-management/
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
        |   +-- offices/
        |   +-- rooms/
        |   +-- bookings/
        |   +-- notifications/
        |   +-- analytics/
        |   +-- realtime/
        |
        +-- workers/
        |   +-- auto-release/
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
| List rooms | GET | `/api/v1/rooms` |
| Room details | GET | `/api/v1/rooms/{roomId}` |
| Create room | POST | `/api/v1/rooms` |
| Update room | PATCH | `/api/v1/rooms/{roomId}` |
| Deactivate room | DELETE | `/api/v1/rooms/{roomId}` |
| Start maintenance | POST | `/api/v1/rooms/{roomId}/maintenance` |
| End maintenance | DELETE | `/api/v1/rooms/{roomId}/maintenance` |
| Search availability | GET | `/api/v1/rooms/availability` |
| Create booking | POST | `/api/v1/bookings` |
| Get booking | GET | `/api/v1/bookings/{bookingId}` |
| List bookings | GET | `/api/v1/bookings` |
| Update booking | PATCH | `/api/v1/bookings/{bookingId}` |
| Cancel booking | DELETE | `/api/v1/bookings/{bookingId}` |
| Check-in | POST | `/api/v1/bookings/{bookingId}/check-in` |
| Complete meeting | POST | `/api/v1/bookings/{bookingId}/complete` |
| Extend booking | POST | `/api/v1/bookings/{bookingId}/extend` |
| Notifications | GET | `/api/v1/notifications` |
| Mark notification read | PATCH | `/api/v1/notifications/{notificationId}/read` |
| Real-time room stream | GET | `/api/v1/realtime/rooms` |
| Room utilization | GET | `/api/v1/admin/rooms/utilization` |
| Booking statistics | GET | `/api/v1/admin/bookings/statistics` |
| Live room status | GET | `/api/v1/admin/rooms/status` |
| Check-in policy | PATCH | `/api/v1/admin/settings/check-in-policy` |
| Utilization analytics | GET | `/api/v1/analytics/utilization` |
| No-show analytics | GET | `/api/v1/analytics/no-shows` |
| Peak-hour analytics | GET | `/api/v1/analytics/peak-hours` |
| Room analytics | GET | `/api/v1/analytics/rooms/{roomId}` |

---

# 42. Example API Sequence

## User Books a Room

```text
GET  /api/v1/rooms/availability
        |
        v
POST /api/v1/bookings
        |
        v
201 Created
        |
        +----> Event
        |
        +----> Notification
```

## User Checks In

```text
POST /api/v1/bookings/{bookingId}/check-in
        |
        v
Booking = CHECKED_IN
Room = OCCUPIED
        |
        v
ROOM_STATUS_CHANGED
```

## User Ends Meeting

```text
POST /api/v1/bookings/{bookingId}/complete
        |
        v
Booking = COMPLETED
Room = AVAILABLE
        |
        v
ROOM_STATUS_CHANGED
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
                                      +------------+------------+
                                      |            |            |
                                      v            v            v
                                  Room Service Booking      User/Auth
                                                   Service
                                      |
                                      v
                                  PostgreSQL
                                      |
                         +------------+-------------+
                         |                          |
                         v                          v
                       Redis                    Queue
                                                   |
                              +--------------------+-------------------+
                              |                    |                   |
                              v                    v                   v
                       Notification          Auto Release          Analytics
                         Worker                 Worker               Worker
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
- Background worker containers.
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

- Integration with Microsoft 365 / Outlook calendars.
- Microsoft Teams integration.
- Google Calendar integration.
- Physical room-panel integration.
- QR-based room check-in.
- IoT occupancy sensors.
- Office floor maps.
- Resource booking beyond rooms.
- Desk booking.
- Parking-slot booking.
- Equipment booking.
- Predictive utilization analytics.

These are future extensions and are not required for the core assignment.

---

# 46. Final Solution Summary

The proposed solution is a **Real-Time Smart Meeting Room Management System**.

It addresses a common office operational problem by providing:

- Real-time room availability.
- Conflict-free booking.
- Capacity/equipment-based room search.
- Check-in.
- Automatic release of unused reservations.
- Early meeting completion.
- Meeting extension.
- Notifications.
- Administrative room management.
- Utilization analytics.
- Real-time updates.

The architecture separates:

```text
Room Management
      |
Booking Management
      |
Real-Time Events
      |
Background Processing
      |
Notifications
      |
Analytics
```

This separation provides a clean foundation for scaling the solution across offices and extending it to other workplace resources.

---

# 47. Architecture Decision Summary

| Area | Decision |
|---|---|
| Use Case | Real-Time Smart Meeting Room Management |
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
| Booking Consistency | Database transaction/concurrency control |
| Notifications | Email + Teams-ready architecture |
| Background Processing | Workers |
| Monitoring | CloudWatch / OpenTelemetry-compatible |
| Core Operational Feature | Real-time room availability + booking |
| Key Automation | No-show auto-release |
| Admin Capability | Room management + utilization |
| Future Scope | Calendar, IoT, desk/equipment booking |
