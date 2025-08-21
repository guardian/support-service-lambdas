# mParticle API Lambda

This lambda integrates the Baton tool with mParticle API to allow both erasure and subject access requests to be raised and tracked in the standard way. As part of this, it handles mParticle callbacks to track the status of requests in real time.

## Overview

The mParticle API Lambda provides:
- 🔒 **Privacy Rights Fulfillment**: Process data deletion and export requests via mParticle's DSR API
- 📊 **Real-time Status Tracking**: Monitor DSR progress with secure callback integration  
- 🤖 **Baton Integration**: Automated workflows for orchestrated privacy operations (RER & SAR)
- 📈 **Analytics Forwarding**: Route event data to mParticle and downstream systems
- 🛡️ **Enterprise Security**: Certificate validation and signature verification on callbacks

For more information about the Baton privacy orchestration system, see the [Baton documentation](https://github.com/guardian/baton).

### Key Capabilities
- 🔒 **Privacy Rights Fulfillment**: Process data deletion, export, and access requests
- 📊 **Real-time Status Tracking**: Monitor DSR progress with callback integration  
- 🤖 **Automated Workflows**: Integrate with [Baton](https://github.com/guardian/baton) for orchestrated privacy operations (RER & SAR)
- 📈 **Analytics Forwarding**: Route event data to mParticle and downstream systems
- 🛡️ **Enterprise Security**: Certificate validation and signature verification on callbacks from mParticle

### Compliance & Standards
- **GDPR Article 15**: Right of Access implementation (Subject Access Requests)
- **GDPR Article 17**: Right to Erasure implementation
- **CCPA Section 1798.105**: Consumer data deletion rights
- **X.509 Certificate Validation**: Cryptographic security for callbacks
- **AWS Security Best Practices**: Encrypted data storage and Parameter Store configuration

---

## � What is mParticle?

[mParticle](https://www.mparticle.com/) is a customer data platform that helps organizations collect, manage, and activate customer data across multiple touchpoints. It serves as a central hub for data collection and distribution.

### Core Features
- **Data Collection**: Unified SDK for collecting customer data from web, mobile, and server-side sources
- **Data Orchestration**: Real-time data routing to 300+ marketing, analytics, and data warehouse integrations
- **Identity Resolution**: Cross-platform customer identity management and unification
- **Audience Management**: Dynamic audience creation and real-time segmentation
- **Privacy Controls**: Built-in data governance and privacy compliance tools

### Official Resources
- [mParticle Documentation](https://docs.mparticle.com/)
- [Data Subject Request API](https://docs.mparticle.com/developers/dsr-api/)
- [Privacy Controls Overview](https://docs.mparticle.com/guides/data-privacy-controls/)

---

## 📧 What is Braze?

[Braze](https://www.braze.com/) is The Guardian's customer engagement platform that powers email communications and reader outreach campaigns.

### Guardian's Use of Braze
In the Guardian, mParticle extracts relevant data from the data lake and writes it to Braze, allowing the CRM team to manage data points without code changes to the braze-diff-publisher. In due course mParticle will replace the diff publisher entirely.

- **CRM Email Campaigns**: The CRM team uses Braze to send targeted email campaigns driven by BigQuery data analysis
- **Service Emails**: Automated transactional emails like subscription confirmations, billing notifications, and account updates
- **Reader Engagement**: Newsletter campaigns, breaking news alerts, and personalized content recommendations
- **Audience Segmentation**: Dynamic reader segments based on subscription status, reading behavior, and engagement patterns
- **Campaign Analytics**: Performance tracking for email open rates, click-through rates, and reader engagement metrics

### Official Resources
- [Braze Documentation](https://www.braze.com/docs/)
- [Data Privacy & Protection](https://www.braze.com/docs/developer_guide/disclosures/security_qualifications/)
- [GDPR Compliance Guide](https://www.braze.com/docs/help/gdpr_compliance/)

---

## 🔗 mParticle and Braze Integration

mParticle and Braze work together to create a comprehensive data and engagement ecosystem for The Guardian's digital audience.

### Data Flow Architecture
```
BigQuery data lake → mParticle → Braze → Personalized Communications
```

### How They Work Together

#### 1. **Data Collection & Unification**
- **mParticle Role**: Collects user interaction data from Guardian's websites and mobile apps
- **Data Types**: Page views, article reads, subscription events, user preferences
- **Identity Resolution**: Creates unified user profiles across devices and platforms

#### 2. **Audience Segmentation**
- **mParticle Role**: Creates dynamic audience segments based on behavior patterns
- **Examples**: "Regular readers", "Subscription likely", "Weekend browsers"
- **Real-Time Updates**: Segments update as user behavior changes

#### 3. **Engagement Activation**
- **Braze Role**: Receives audience data from mParticle for targeted messaging
- **Message Types**: Newsletter subscriptions, breaking news alerts, subscription offers
- **Personalization**: Content tailored based on reading history and preferences

#### 4. **Privacy Compliance**
- **Data Subject Requests**: When users request data deletion or access, both platforms must be coordinated
- **mParticle**: Removes user data and audience memberships (deletion) or exports user data (access)
- **Braze**: Deletes user profiles and message history via mParticle's DSR forwarding

### Why This Integration Matters
- **Unified Experience**: Consistent messaging across all Guardian touchpoints
- **Privacy Compliance**: Coordinated data handling ensures GDPR/CCPA compliance
- **Personalization**: Reader engagement improves through data-driven content delivery
- **Operational Efficiency**: Single data pipeline reduces complexity and maintenance

### Official Integration Resources
- [mParticle + Braze Integration Guide](https://docs.mparticle.com/integrations/braze/audience/)
- [Braze mParticle Partnership](https://www.braze.com/partners/technology-partners/mparticle/)

---

## 🏗️ System Architecture

```mermaid
graph TB
    subgraph "Guardian Privacy Ecosystem"
        BATON[🎭 Baton<br/>Privacy Orchestrator]
        READER[📱 Guardian Reader]
    end
    
    subgraph "mParticle API Lambda"
        HTTP[🌐 HTTP Handler<br/>Callback Endpoint]
        BATON_H[� Baton Handler<br/>RER Integration]
        VALIDATOR[🛡️ Security Validator<br/>Certificate & Signature]
    end
    
    subgraph "External Services"
        MPARTICLE[📊 mParticle<br/>Analytics Platform]
        BRAZE[📧 Braze<br/>Marketing Platform]
        PARAMS[🔧 AWS Parameter Store]
    end
    
    subgraph "Infrastructure"
        CW[📈 CloudWatch<br/>Logging & Monitoring]
        ALARMS[🚨 CloudWatch Alarms<br/>Error Detection]
    end

    %% Request Flows
    READER -->|Data Subject Request| BATON
    BATON -->|Automated RER/SAR| BATON_H
    
    %% Processing
    BATON_H -->|Submit DSR| MPARTICLE
    
    %% Data Flow
    MPARTICLE -->|Status Callbacks| HTTP
    HTTP --> VALIDATOR
    VALIDATOR -->|Validated Callback| HTTP
    MPARTICLE -->|DSR Forwarding| BRAZE
    
    %% Configuration
    HTTP --> PARAMS
    BATON_H --> PARAMS
    
    %% Monitoring
    HTTP --> CW
    BATON_H --> CW
    CW --> ALARMS

    classDef guardian fill:#052962,stroke:#ffffff,stroke-width:2px,color:#ffffff
    classDef lambda fill:#ff9900,stroke:#ffffff,stroke-width:2px,color:#ffffff
    classDef external fill:#4CAF50,stroke:#ffffff,stroke-width:2px,color:#ffffff
    classDef aws fill:#232F3E,stroke:#ffffff,stroke-width:2px,color:#ffffff
    
    class BATON,READER guardian
    class HTTP,BATON_H,VALIDATOR lambda
    class MPARTICLE,BRAZE external
    class PARAMS,CW,ALARMS aws
```

## Service Integration Flow

```mermaid
sequenceDiagram
    participant R as Reader
    participant B as Baton
    participant LAMBDA as mParticle API
    participant MP as mParticle
    participant BR as Braze

    Note over R,BR: Right to Erasure Request (RER) Flow
    
    R->>B: Request data erasure
    B->>LAMBDA: Initiate RER (Baton Handler)
    LAMBDA->>MP: Set user attributes<br/>(remove from audiences)
    LAMBDA->>MP: Submit OpenDSR request
    MP->>MP: Process erasure<br/>(Up to 14 days)
    MP->>BR: Forward DSR to Braze
    MP->>LAMBDA: Status callback
    LAMBDA->>B: Return completion status
    B->>R: Confirm erasure complete
```

```mermaid
sequenceDiagram
    participant R as Reader
    participant B as Baton
    participant LAMBDA as mParticle API
    participant MP as mParticle

    Note over R,MP: Subject Access Request (SAR) Flow
    
    R->>B: Request data access
    B->>LAMBDA: Initiate SAR (Baton Handler)
    LAMBDA->>MP: Submit OpenDSR export request
    MP->>MP: Gather user data<br/>(Up to 14 days)
    MP->>LAMBDA: Status callback with download URL
    LAMBDA->>B: Return data export details
    B->>R: Provide access to data export
```

---

## 🚀 Quick Start

The recommended workflow for testing dependency updates or validating changes is to **deploy to CODE** and test the live integrations.

### 1. Prerequisites

Ensure you have the required AWS profile and permissions. Use Janus to download the Membership profile.

### 2. Verify Configuration

Check that CODE configuration is accessible:
```bash
cd handlers/mparticle-api
pnpm check-config
```

This validates that all required parameters are accessible in Parameter Store.

### 3. Test Basic Integrations

#### Test RER (Right to Erasure) Flow
```bash
# Edit the test data in runManual/invokeHandlerRERInitiateCODE.ts first
# Update subjectEmail and subjectId with test values
pnpm ts-node runManual/invokeHandlerRERInitiateCODE.ts
```

#### Test SAR (Subject Access Request) Flow  
```bash
# Edit the test data in runManual/invokeHandlerSARInitiateCODE.ts first
# Update subjectEmail and subjectId with test values
pnpm ts-node runManual/invokeHandlerSARInitiateCODE.ts
```

#### Test Status Checking
```bash
# Use the requestId from previous tests
pnpm ts-node runManual/invokeHandlerRERStatusCODE.ts
pnpm ts-node runManual/invokeHandlerSARStatusCODE.ts
```

### 4. Run Automated Tests

```bash
# Unit tests (fast, no external dependencies)
pnpm test

# Integration tests (slower, tests actual API integrations)
pnpm it-test
```

### 5. Monitor Live Requests

Check CloudWatch logs for your test requests:
- Lambda function logs: `mparticle-api-baton-CODE` and `mparticle-api-http-CODE`
- API Gateway logs: Look for your test request IDs

### Configuration Reference

All configuration is managed through AWS Parameter Store. CODE environment uses these parameters:

#### Workspace Credentials
- **`/{stage}/support/mparticle-api/workspace/key`**
  - *Description*: mParticle workspace API key for Data Subject Request operations
  - *mParticle Reference*: [Managing Workspaces](https://docs.mparticle.com/guides/platform-guide/introduction/#managing-workspaces)

- **`/{stage}/support/mparticle-api/workspace/secret`**
  - *Description*: mParticle workspace API secret for Data Subject Request operations
  - *mParticle Reference*: [Managing Workspaces](https://docs.mparticle.com/guides/platform-guide/introduction/#managing-workspaces)

#### Input Platform Credentials
- **`/{stage}/support/mparticle-api/inputPlatform/key`**
  - *Description*: mParticle input platform API key for event ingestion and data collection
  - *mParticle Reference*: [HTTP APIs Authentication](https://docs.mparticle.com/developers/apis/http/#authentication)

- **`/{stage}/support/mparticle-api/inputPlatform/secret`**
  - *Description*: mParticle input platform API secret for event ingestion and data collection
  - *mParticle Reference*: [HTTP APIs Authentication](https://docs.mparticle.com/developers/apis/http/#authentication)

#### Environment Configuration
- **`/{stage}/support/mparticle-api/pod`**
  - *Description*: mParticle pod/cluster identifier (e.g., "us1", "us2", "eu1") for regional API endpoints
  - *mParticle Reference*: [Data Hosting Locations](https://docs.mparticle.com/developers/guides/data-localization/)

- **`/{stage}/support/mparticle-api/sarResultsBucket`**
  - *Description*: S3 bucket name for storing SAR (Subject Access Request) export results

---

## 🌐 HTTP API Endpoints

### Base URLs
| Environment | URL |
|-------------|-----|
| **CODE** | `https://mparticle-api-code.support.guardianapis.com` |
| **PROD** | `https://mparticle-api.support.guardianapis.com` |

### HTTP Router Endpoints

For the complete and up-to-date list of endpoints, request/response schemas, and handlers, see: **[`src/routers/http.ts`](src/routers/http.ts)**

Key implementation notes:
- **Security**: All endpoints use comprehensive Zod schema validation
- **Callback Security**: mParticle callbacks (status updates) use X.509 certificate + RSA-SHA256 signature validation  
- **Public Access**: Only callback endpoints are publicly accessible, secured through certificate validation
- **Headers**: Callback endpoints expect `X-MP-Signature` and `X-MP-Certificate` headers

---

## 🤖 Baton Integration Events

### Baton Router Events

For the complete and up-to-date list of Baton event handlers, request/response schemas, and validation logic, see: **[`src/routers/baton.ts`](src/routers/baton.ts)**

Key implementation notes:
- **Cross-Account Security**: IAM role-based Lambda invocation with trust relationship between Baton account → mParticle API account
- **Schema Validation**: All events use comprehensive Zod schema validation via `BatonEventRequestSchema` and `BatonEventResponseSchema`
- **Event Types**: Supports both RER (Right to Erasure) and SAR (Subject Access Request) workflows
- **Actions**: `initiate` for starting new requests, `status` for checking existing request progress
- **Identity Resolution**: Handles both `subjectId` and optional `subjectEmail` for user identification
- **Correlation Tracking**: Uses `initiationReference` GUID for request tracking across systems

---

## 🔒 Security & Compliance

### Security Features
- **Input Validation**: Comprehensive Zod schema validation
- **Certificate Validation**: X.509 certificate verification for callbacks
- **Signature Verification**: RSA-SHA256 signature validation
- **Cross-Account Security**: IAM role-based Baton integration

### Certificate Validation Process
1. **Certificate Extraction**: Extract certificate from `X-MP-Certificate` header
2. **Chain Validation**: Verify complete certificate chain to trusted root
3. **Expiry Check**: Ensure certificate is within validity period
4. **Domain Validation**: Confirm certificate matches mParticle domain

### Signature Verification Process
1. **Signature Extraction**: Get RSA-SHA256 signature from `X-MP-Signature` header
2. **Public Key Extraction**: Extract public key from validated certificate
3. **Signature Verification**: Cryptographic verification of message integrity

---

## 🚨 Compliance & Business Context

This lambda helps Guardian fulfill GDPR and CCPA compliance requirements by:
- **GDPR Article 15**: Right of Access implementation (Subject Access Requests)
- **GDPR Article 17**: Right to Erasure implementation
- **CCPA Section 1798.105**: Consumer data deletion rights

### Risk Mitigation
- **Automated processing** reduces manual errors
- **Centralized orchestration** via Baton ensures no system is missed
- **Real-time monitoring** detects and alerts on failures immediately

---

## 📞 Support & Monitoring

### Team Information
- **Primary Owner**: Consult the following [file](https://docs.google.com/spreadsheets/d/1bb8WB-6ZFRdUwERHMOVIolN8WU8zJMcsyi-WJuwp07Q/edit?gid=0#gid=0)

### External Dependencies
- **mParticle DSR API**: Data subject request processing
- **AWS Parameter Store**: Configuration management
- **CloudWatch**: Logging and monitoring
- **Baton**: Privacy workflow orchestration

---

## 🤝 Integration Points

### Baton Privacy Orchestration
Cross-account Lambda invocation for automated privacy workflows:
- RER and SAR request initiation and tracking
- Correlation tracking for multi-service requests
- Status synchronization across privacy processors

### mParticle Data Subject Requests
Direct integration with mParticle's DSR API:
- Automated request submission and tracking (deletion and export)
- Secure callback handling with certificate validation
- Status polling and update processing

---

## 📋 Quick Reference

### AWS Resources
- **Lambda Functions**: `mparticle-api-http-{stage}`, `mparticle-api-baton-{stage}`
- **API Gateway**: `mparticle-api-{stage}`
- **Parameter Store**: `/{stage}/support/mparticle-api/*`
- **Cross-Account Role**: `baton-mparticle-lambda-role-{stage}`

### Base URLs
| Environment | URL |
|-------------|-----|
| **CODE** | `https://mparticle-api-code.support.guardianapis.com` |
| **PROD** | `https://mparticle-api.support.guardianapis.com` |