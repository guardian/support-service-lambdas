# API Reference

Welcome to the mParticle API Lambda documentation. This service provides two distinct API interfaces for handling data subject requests and event processing.

## 📖 Overview

The mParticle API Lambda exposes endpoints through two different handlers:

1. **[HTTP Endpoints](./http-endpoints.md)** - Public-facing REST API via API Gateway
2. **[Baton Integration](./baton-endpoints.md)** - Internal Lambda-to-Lambda communication for privacy orchestration

## 🌐 Base URLs

| Environment | URL |
|-------------|-----|
| **CODE** | `https://mparticle-api-code.support.guardianapis.com` |
| **PROD** | `https://mparticle-api.support.guardianapis.com` |

## 🔒 Authentication & Security

- **HTTP Endpoints**: Input validation via Zod schemas
- **Callback Endpoint**: X.509 certificate validation + RSA-SHA256 signature verification
- **Baton Integration**: Cross-account IAM role authentication

## 📚 Quick Navigation

### HTTP API Documentation
- [Submit Data Subject Request](./http-endpoints.md#submit-data-subject-request)
- [Query Request Status](./http-endpoints.md#query-request-status)
- [Status Callback Handler](./http-endpoints.md#status-callback-handler)
- [Upload Event Batch](./http-endpoints.md#upload-event-batch)

### Baton Integration
- [Initiate RER Request](./baton-endpoints.md#initiate-rer-request)
- [Status Check](./baton-endpoints.md#status-check)
- [Cross-Account Security](./baton-endpoints.md#cross-account-security)

## 🎯 Common Use Cases

| Use Case | Endpoint | Documentation |
|----------|----------|---------------|
| **Manual DSR Submission** | `POST /data-subject-requests` | [HTTP Endpoints](./http-endpoints.md) |
| **Check DSR Status** | `GET /data-subject-requests/{id}` | [HTTP Endpoints](./http-endpoints.md) |
| **Automated Privacy Workflow** | Baton Lambda Invocation | [Baton Integration](./baton-endpoints.md) |
| **Analytics Event Forwarding** | `POST /events` | [HTTP Endpoints](./http-endpoints.md) |

## 🚨 Important Notes

- The callback endpoint (`POST /data-subject-requests/{id}/callback`) is **publicly accessible** but secured through certificate validation
- All endpoints use comprehensive input validation with detailed error responses
- Baton integration requires specific IAM roles for cross-account access
- Rate limiting is applied at the API Gateway level
