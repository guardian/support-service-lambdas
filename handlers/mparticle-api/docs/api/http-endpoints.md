# HTTP API Endpoints

This document provides detailed documentation for all HTTP endpoints exposed by the mParticle API Lambda through AWS API Gateway.

## 🌐 Base URLs

| Environment | URL |
|-------------|-----|
| **CODE** | `https://mparticle-api-code.support.guardianapis.com` |
| **PROD** | `https://mparticle-api.support.guardianapis.com` |

## 📋 Endpoints Overview

| Method | Path | Handler | Purpose |
|--------|------|---------|---------|
| `POST` | `/data-subject-requests` | `submitHandler` | Submit new DSR |
| `GET` | `/data-subject-requests/{id}` | `statusHandler` | Query DSR status |
| `POST` | `/data-subject-requests/{id}/callback` | `callbackHandler` | mParticle status updates |
| `POST` | `/events` | `eventsHandler` | Upload event batches |

---

## 🚀 Submit Data Subject Request

Submit a new Data Subject Request (DSR) to mParticle for processing.

### Endpoint
```
POST /data-subject-requests
```

### Handler Function
`submitHandler` (from `src/handlers/httpRouter.ts`)

### Request Schema (Zod Validation)
```typescript
{
  email: string,           // Required: Subject's email address
  type: "delete" | "ccpa_delete" | "gdpr_delete" | "export",  // Request type
  regulation?: string      // Optional: Regulation context
}
```

### Example Request
```bash
curl -X POST https://mparticle-api.support.guardianapis.com/data-subject-requests \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "type": "gdpr_delete",
    "regulation": "GDPR"
  }'
```

### Success Response (201 Created)
```json
{
  "id": "abc123def456",
  "status": "submitted",
  "email": "user@example.com",
  "type": "gdpr_delete",
  "submittedAt": "2024-01-15T10:30:00Z"
}
```

### Error Responses
- **400 Bad Request**: Invalid input data
- **500 Internal Server Error**: Processing failure

### Processing Flow
1. **Input Validation**: Zod schema validation
2. **mParticle Submission**: Forward request to mParticle DSR API
3. **Database Storage**: Store request metadata in DynamoDB
4. **Response**: Return request ID and initial status

---

## 📊 Query Request Status

Retrieve the current status of a submitted Data Subject Request.

### Endpoint
```
GET /data-subject-requests/{id}
```

### Handler Function
`statusHandler` (from `src/handlers/httpRouter.ts`)

### Path Parameters
- `id` (string): The unique DSR identifier returned from submission

### Example Request
```bash
curl https://mparticle-api.support.guardianapis.com/data-subject-requests/abc123def456
```

### Success Response (200 OK)
```json
{
  "id": "abc123def456",
  "status": "completed",
  "email": "user@example.com",
  "type": "gdpr_delete",
  "submittedAt": "2024-01-15T10:30:00Z",
  "completedAt": "2024-01-15T11:45:00Z",
  "downloadUrls": [
    "https://secure-download.mparticle.com/data/abc123def456.json"
  ]
}
```

### Status Values
- `submitted`: Request received and forwarded to mParticle
- `in_progress`: mParticle is processing the request
- `completed`: Processing finished, data available (for exports)
- `failed`: Processing encountered an error

### Error Responses
- **404 Not Found**: Request ID not found
- **500 Internal Server Error**: Database query failure

---

## 🔄 Status Callback Handler

**⚠️ PUBLIC ENDPOINT** - Receives status updates from mParticle when DSR processing completes.

### Endpoint
```
POST /data-subject-requests/{id}/callback
```

### Handler Function
`callbackHandler` (from `src/handlers/httpRouter.ts`)

### Security Features
- **X.509 Certificate Validation**: Verifies mParticle's identity
- **RSA-SHA256 Signature Verification**: Ensures message integrity
- **Public Access**: No authentication required (secured by certificate validation)

### Request Headers (from mParticle)
```
Content-Type: application/json
X-MP-Signature: <RSA-SHA256 signature>
X-MP-Certificate: <X.509 certificate chain>
```

### Request Body (from mParticle)
```json
{
  "request_id": "abc123def456",
  "status": "completed",
  "completion_date": "2024-01-15T11:45:00Z",
  "download_urls": [
    "https://secure-download.mparticle.com/data/abc123def456.json"
  ]
}
```

### Processing Flow
1. **Certificate Validation**: Verify mParticle's X.509 certificate
2. **Signature Verification**: Validate RSA-SHA256 signature
3. **Database Update**: Update DynamoDB with new status
4. **Downstream Notification**: Trigger any configured webhooks

### Response
```json
{
  "status": "received"
}
```

### Error Handling
- **401 Unauthorized**: Certificate validation failed
- **400 Bad Request**: Invalid signature or malformed payload
- **404 Not Found**: Request ID not found

---

## 📈 Upload Event Batch

Forward analytics events to mParticle for processing and routing to downstream systems.

### Endpoint
```
POST /events
```

### Handler Function
`eventsHandler` (from `src/handlers/httpRouter.ts`)

### Request Schema (Zod Validation)
```typescript
{
  events: Array<{
    event_type: string,        // Event type identifier
    data: Record<string, any>, // Event payload
    timestamp?: number,        // Optional Unix timestamp
    user_id?: string,         // Optional user identifier
    session_id?: string       // Optional session identifier
  }>
}
```

### Example Request
```bash
curl -X POST https://mparticle-api.support.guardianapis.com/events \
  -H "Content-Type: application/json" \
  -d '{
    "events": [
      {
        "event_type": "page_view",
        "data": {
          "page_url": "https://theguardian.com/article/123",
          "page_title": "Article Title",
          "user_agent": "Mozilla/5.0..."
        },
        "timestamp": 1705315800,
        "user_id": "user123",
        "session_id": "session456"
      }
    ]
  }'
```

### Success Response (200 OK)
```json
{
  "events_processed": 1,
  "status": "success"
}
```

### Processing Flow
1. **Input Validation**: Zod schema validation for event structure
2. **Event Transformation**: Convert to mParticle event format
3. **Batch Processing**: Group events for efficient forwarding
4. **mParticle Forwarding**: Send to mParticle Events API
5. **Response**: Confirm processing status

### Error Responses
- **400 Bad Request**: Invalid event structure or missing required fields
- **413 Payload Too Large**: Event batch exceeds size limits
- **500 Internal Server Error**: mParticle forwarding failure

---

## 🔧 Configuration

All HTTP endpoints rely on AWS Parameter Store for configuration:

### Required Parameters
- `/mparticle-api/{stage}/mparticle-api-key`: mParticle API authentication
- `/mparticle-api/{stage}/mparticle-workspace-id`: Target workspace identifier
- `/mparticle-api/{stage}/callback-certificate-path`: X.509 certificate for validation
- `/mparticle-api/{stage}/dynamodb-table-name`: Storage table name

### Environment Variables
- `STAGE`: Deployment environment (CODE/PROD)
- `AWS_REGION`: AWS region for Parameter Store access

## 🚨 Rate Limiting

API Gateway applies the following limits:
- **Burst**: 5,000 requests per second
- **Steady State**: 2,000 requests per second
- **Throttling**: 429 Too Many Requests response

## 📝 Response Format

All endpoints return consistent JSON responses with appropriate HTTP status codes:

### Success Response Structure
```json
{
  "data": { /* endpoint-specific data */ },
  "timestamp": "2024-01-15T10:30:00Z",
  "request_id": "correlation-id-123"
}
```

### Error Response Structure
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid email format",
    "details": { /* field-specific errors */ }
  },
  "timestamp": "2024-01-15T10:30:00Z",
  "request_id": "correlation-id-123"
}
```
