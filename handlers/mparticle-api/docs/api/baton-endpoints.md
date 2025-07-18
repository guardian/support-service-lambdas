# Baton Integration

This document details the Baton integration endpoints used for automated privacy request orchestration between Guardian services.

## 🤖 Overview

The mParticle API Lambda integrates with [Baton](../../zuora-baton/) - Guardian's privacy orchestration system - to automatically handle Data Subject Requests (DSRs) as part of larger privacy workflows.

## 🔗 Integration Architecture

```
[Baton Orchestrator] 
        ↓ (Lambda Invoke)
[mParticle API Lambda]
        ↓ (HTTP API)
[mParticle DSR API]
        ↓ (Callback)
[mParticle API Lambda]
        ↓ (Status Update)
[Baton Orchestrator]
```

## 📋 Baton Endpoints

| Method | Handler | Purpose |
|--------|---------|---------|
| Lambda Invoke | `batonInitiateHandler` | Initiate new DSR via Baton |
| Lambda Invoke | `batonStatusHandler` | Check DSR status for Baton |

---

## 🚀 Initiate RER Request

Initiate a Right to Erasure Request (RER) through Baton orchestration.

### Handler Function
`batonInitiateHandler` (from `src/handlers/batonRouter.ts`)

### Invocation Method
```typescript
// Lambda-to-Lambda invocation
const lambdaClient = new LambdaClient({ region: 'eu-west-1' });
await lambdaClient.send(new InvokeCommand({
  FunctionName: 'mparticle-api-lambda',
  Payload: JSON.stringify({
    action: 'initiate',
    payload: {
      identityId: 'guardian-user-123',
      email: 'user@example.com',
      requestType: 'delete',
      regulation: 'GDPR',
      correlationId: 'baton-workflow-456'
    }
  })
}));
```

### Request Schema
```typescript
{
  action: "initiate",                    // Required: Action identifier
  payload: {
    identityId: string,                  // Required: Guardian Identity ID
    email: string,                       // Required: Subject email
    requestType: "delete" | "export",    // Required: Request type
    regulation?: "GDPR" | "CCPA",        // Optional: Regulation context
    correlationId?: string               // Optional: Baton workflow ID
  }
}
```

### Success Response
```json
{
  "success": true,
  "mparticleRequestId": "abc123def456",
  "status": "submitted",
  "correlationId": "baton-workflow-456",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Processing Flow
1. **Input Validation**: Validate Baton payload structure
2. **Identity Resolution**: Map Guardian Identity ID to email
3. **DSR Submission**: Submit request to mParticle DSR API
4. **Correlation Tracking**: Link mParticle request to Baton workflow
5. **Response**: Return mParticle request ID for tracking

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "SUBMISSION_FAILED",
    "message": "Failed to submit DSR to mParticle",
    "details": {
      "mparticleError": "Invalid workspace configuration"
    }
  },
  "correlationId": "baton-workflow-456"
}
```

---

## 📊 Status Check

Query the status of a DSR request for Baton workflow coordination.

### Handler Function
`batonStatusHandler` (from `src/handlers/batonRouter.ts`)

### Invocation Method
```typescript
const lambdaClient = new LambdaClient({ region: 'eu-west-1' });
await lambdaClient.send(new InvokeCommand({
  FunctionName: 'mparticle-api-lambda',
  Payload: JSON.stringify({
    action: 'status',
    payload: {
      mparticleRequestId: 'abc123def456',
      correlationId: 'baton-workflow-456'
    }
  })
}));
```

### Request Schema
```typescript
{
  action: "status",                      // Required: Action identifier
  payload: {
    mparticleRequestId: string,          // Required: mParticle request ID
    correlationId?: string               // Optional: Baton workflow ID
  }
}
```

### Success Response
```json
{
  "success": true,
  "mparticleRequestId": "abc123def456",
  "status": "completed",
  "correlationId": "baton-workflow-456",
  "completedAt": "2024-01-15T11:45:00Z",
  "downloadUrls": [
    "https://secure-download.mparticle.com/data/abc123def456.json"
  ],
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Status Values
- `submitted`: Request forwarded to mParticle
- `in_progress`: mParticle is processing
- `completed`: Processing finished
- `failed`: Processing failed

### Processing Flow
1. **Request Validation**: Validate request ID format
2. **Database Query**: Look up current status in DynamoDB
3. **Status Resolution**: Determine current processing state
4. **Response**: Return status with any available data URLs

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "REQUEST_NOT_FOUND",
    "message": "mParticle request ID not found",
    "details": {
      "requestId": "abc123def456"
    }
  },
  "correlationId": "baton-workflow-456"
}
```

---

## 🔒 Cross-Account Security

The Baton integration uses IAM role-based authentication for secure cross-account Lambda invocation.

### Required IAM Permissions

#### Baton Lambda Role
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "lambda:InvokeFunction",
      "Resource": "arn:aws:lambda:eu-west-1:*:function:mparticle-api-*"
    }
  ]
}
```

#### mParticle API Lambda Role
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::BATON-ACCOUNT:role/baton-lambda-role"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

### Cross-Account Trust
- **Baton Account**: Guardian's privacy orchestration account
- **mParticle Account**: Support services account
- **Trust Relationship**: Established via IAM role assumption

---

## 🔄 Workflow Integration

### Typical Baton Workflow
1. **Trigger**: User submits privacy request via Guardian systems
2. **Orchestration**: Baton identifies required data processors
3. **mParticle Initiation**: Baton invokes mParticle API Lambda
4. **Processing**: mParticle processes the request
5. **Callback**: mParticle notifies completion via callback endpoint
6. **Status Update**: Baton polls for completion status
7. **Coordination**: Baton coordinates with other processors
8. **Completion**: Full privacy request workflow completes

### Error Handling
- **Retry Logic**: Baton implements exponential backoff for failed invocations
- **Timeout Handling**: Baton monitors for stuck requests
- **Failure Escalation**: Manual intervention triggered for persistent failures

---

## 📝 Configuration

### AWS Parameter Store
Required parameters for Baton integration:
- `/mparticle-api/{stage}/baton-correlation-table`: DynamoDB table for correlation tracking
- `/mparticle-api/{stage}/baton-allowed-accounts`: Whitelisted AWS account IDs

### Environment Variables
- `BATON_INTEGRATION_ENABLED`: Feature flag for Baton integration
- `BATON_TIMEOUT_SECONDS`: Maximum processing timeout for Baton requests

---

## 🧪 Testing Baton Integration

### Local Testing
```typescript
// Mock Baton invocation for testing
const testPayload = {
  action: 'initiate',
  payload: {
    identityId: 'test-user-123',
    email: 'test@guardian.com',
    requestType: 'delete',
    regulation: 'GDPR',
    correlationId: 'test-workflow-456'
  }
};

const response = await batonInitiateHandler(testPayload);
console.log('Baton response:', response);
```

### Integration Testing
- **Baton Simulator**: Mock Baton Lambda for end-to-end testing
- **Status Polling**: Verify status transitions work correctly
- **Error Scenarios**: Test failure handling and recovery

---

## 📊 Monitoring & Observability

### CloudWatch Metrics
- `BatonRequestsReceived`: Number of Baton-initiated requests
- `BatonRequestsCompleted`: Successfully completed Baton requests
- `BatonRequestsFailed`: Failed Baton requests requiring attention

### Logging
- **Correlation IDs**: All log entries include Baton correlation ID
- **Processing Steps**: Detailed logging of each workflow step
- **Error Context**: Comprehensive error details for troubleshooting

### Alerts
- **Stuck Requests**: Requests in progress for >24 hours
- **High Failure Rate**: >10% failure rate over 1 hour window
- **Cross-Account Issues**: IAM permission or connectivity problems
