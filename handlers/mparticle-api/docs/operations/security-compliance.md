# Security & Compliance

This document outlines the security measures, compliance requirements, and certificate validation processes implemented in the mParticle API Lambda.

## 🔒 Security Overview

The mParticle API Lambda implements multiple layers of security to protect data subject requests and ensure compliance with privacy regulations.

### Security Layers
1. **Network Security**: API Gateway with SSL/TLS termination
2. **Input Validation**: Zod schema validation for all inputs
3. **Certificate Validation**: X.509 certificate verification for callbacks
4. **Signature Verification**: RSA-SHA256 signature validation
5. **Cross-Account Security**: IAM role-based authentication for Baton
6. **Data Encryption**: Encryption in transit and at rest

---

## 📜 Compliance Framework

### GDPR (General Data Protection Regulation)
- **Article 17**: Right to Erasure implementation
- **Article 20**: Data Portability through export functionality
- **Article 32**: Security measures and encryption
- **Article 33**: Breach notification procedures

### CCPA (California Consumer Privacy Act)
- **Right to Delete**: Consumer data deletion requests
- **Right to Know**: Data export and disclosure
- **Non-Discrimination**: Equal service regardless of privacy choices

### Data Processing Principles
- **Lawfulness**: All processing under legitimate legal basis
- **Purpose Limitation**: Data used only for stated purposes
- **Data Minimization**: Only necessary data processed
- **Accuracy**: Data kept accurate and up-to-date
- **Storage Limitation**: Data retained only as long as necessary

---

## 🔐 Certificate Validation

The callback endpoint (`POST /data-subject-requests/{id}/callback`) implements robust certificate validation to ensure requests originate from mParticle.

### X.509 Certificate Chain Validation

#### Process Flow
1. **Certificate Extraction**: Extract certificate from `X-MP-Certificate` header
2. **Chain Validation**: Verify complete certificate chain to trusted root
3. **Expiry Check**: Ensure certificate is within validity period
4. **Revocation Check**: Verify certificate hasn't been revoked
5. **Domain Validation**: Confirm certificate matches mParticle domain

#### Implementation Details
```typescript
// Certificate validation handler
const validateCertificate = async (certificateHeader: string): Promise<boolean> => {
  // 1. Parse X.509 certificate from header
  const certificate = parseCertificate(certificateHeader);
  
  // 2. Verify certificate chain
  const isChainValid = await verifyCertificateChain(certificate);
  
  // 3. Check certificate expiry
  const isNotExpired = certificate.notAfter > new Date();
  
  // 4. Validate certificate domain
  const isDomainValid = certificate.subject.commonName === 'api.mparticle.com';
  
  return isChainValid && isNotExpired && isDomainValid;
};
```

### Trusted Certificate Authorities
- **Root CAs**: Standard web PKI root certificate authorities
- **Intermediate CAs**: mParticle's intermediate certificate authorities
- **Certificate Pinning**: Optional pinning to specific certificate fingerprints

---

## ✍️ Signature Verification

All callback requests include RSA-SHA256 signatures to ensure message integrity and authenticity.

### Signature Validation Process

#### 1. Signature Extraction
```typescript
const signature = request.headers['X-MP-Signature'];
const payload = JSON.stringify(request.body);
```

#### 2. Public Key Extraction
```typescript
// Extract public key from validated certificate
const publicKey = certificate.publicKey;
```

#### 3. Signature Verification
```typescript
const crypto = require('crypto');
const verifier = crypto.createVerify('RSA-SHA256');
verifier.update(payload);
const isValidSignature = verifier.verify(publicKey, signature, 'base64');
```

### Security Properties
- **Non-Repudiation**: Cryptographic proof of message origin
- **Integrity**: Detection of message tampering
- **Authenticity**: Verification of sender identity

---

## 🛡️ Input Validation & Sanitization

### Zod Schema Validation

All HTTP endpoints use Zod schemas for comprehensive input validation:

#### Data Subject Request Schema
```typescript
const DataSubjectRequestSchema = z.object({
  email: z.string().email().max(254),
  type: z.enum(['delete', 'ccpa_delete', 'gdpr_delete', 'export']),
  regulation: z.string().optional()
});
```

#### Events Schema
```typescript
const EventSchema = z.object({
  events: z.array(z.object({
    event_type: z.string().min(1).max(100),
    data: z.record(z.any()),
    timestamp: z.number().optional(),
    user_id: z.string().optional(),
    session_id: z.string().optional()
  }))
});
```

### Validation Features
- **Type Safety**: Runtime type checking
- **Format Validation**: Email, URL, and timestamp validation
- **Length Limits**: Prevent oversized payloads
- **Required Fields**: Ensure mandatory data is present

---

## 🔑 Authentication & Authorization

### HTTP Endpoints
- **Public Access**: Submit and status endpoints are publicly accessible
- **Input Validation**: Security through comprehensive validation
- **Rate Limiting**: API Gateway throttling prevents abuse

### Callback Endpoint
- **Certificate-Based**: X.509 certificate validation
- **Signature-Based**: RSA-SHA256 signature verification
- **Public Access**: Secure despite no authentication required

### Baton Integration
- **IAM Roles**: Cross-account role assumption
- **Lambda Invoke**: Direct Lambda-to-Lambda invocation
- **Account Whitelisting**: Only authorized accounts can invoke

---

## 🗄️ Data Security

### Encryption in Transit
- **TLS 1.2+**: All API communications use TLS encryption
- **Certificate Validation**: Strict certificate verification
- **HSTS Headers**: HTTP Strict Transport Security enforcement

### Encryption at Rest
- **DynamoDB**: Server-side encryption with AWS KMS
- **Parameter Store**: Encrypted parameters using AWS KMS
- **CloudWatch Logs**: Encrypted log storage

### Data Retention
- **Request Metadata**: Retained for 90 days in DynamoDB
- **Processing Logs**: Retained for 30 days in CloudWatch
- **Callback Data**: Not persistently stored
