# mParticle API Lambda

**A privacy-compliant data processing bridge between Guardian and mParticle's Data Subject Request API.**

## 🌟 Overview

The mParticle API Lambda enables Guardian to fulfill GDPR and CCPA compliance requirements by providing a secure, scalable interface to mParticle's Data Subject Request (DSR) API. It processes privacy requests, tracks their status, and coordinates with Guardian's broader privacy ecosystem.

### Key Capabilities
- 🔒 **Privacy Rights Fulfillment**: Process data deletion and export requests
- 📊 **Real-time Status Tracking**: Monitor DSR progress with callback integration  
- 🤖 **Automated Workflows**: Integrate with Baton for orchestrated privacy operations
- 📈 **Analytics Forwarding**: Route event data to mParticle and downstream systems
- 🛡️ **Enterprise Security**: Certificate validation and signature verification

### Compliance & Standards
- **GDPR Article 17**: Right to Erasure implementation
- **CCPA Section 1798.105**: Consumer data deletion rights
- **X.509 Certificate Validation**: Cryptographic security for callbacks
- **AWS Security Best Practices**: Encrypted data storage and Parameter Store configuration

---

## 📚 Documentation

### 🎯 Understanding the Service
- **[Business Context](./docs/business-context.md)** - Legal requirements, compliance landscape, and data ecosystem
- **[Architecture Overview](./docs/architecture.md)** - System design, data flows, and technical stack

### 🌐 API Reference  
- **[API Overview](./docs/api/README.md)** - Complete endpoint reference and authentication
- **[HTTP Endpoints](./docs/api/http-endpoints.md)** - REST API for DSR submission and status queries
- **[Baton Integration](./docs/api/baton-endpoints.md)** - Lambda-to-Lambda privacy orchestration

### 🔧 Operations & Security
- **[Security & Compliance](./docs/operations/security-compliance.md)** - Certificate validation, input sanitization, and compliance measures
- **[Monitoring & Operations](./docs/operations/monitoring.md)** - CloudWatch metrics, alerting, and troubleshooting

### 👨‍💻 Development  
- **[Getting Started](./docs/guides/getting-started.md)** - Setup, configuration, and local development
- **[Testing Strategy](./docs/development/testing.md)** - Unit, integration, and end-to-end testing approaches
- **[Advanced Topics](./docs/development/advanced-topics.md)** - Performance optimization, error handling, and future enhancements

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and pnpm
- AWS CLI configured with Parameter Store access
- Basic understanding of Lambda and API Gateway

### Installation
```bash
# Install dependencies
pnpm install

# Build the project  
pnpm build

# Run tests
pnpm test
```

### Configuration
All configuration is managed through AWS Parameter Store. Ensure these parameters are set for your environment:

- `/mparticle-api/{stage}/mparticle-api-key`
- `/mparticle-api/{stage}/mparticle-workspace-id`  
- `/mparticle-api/{stage}/dynamodb-table-name`
- `/mparticle-api/{stage}/callback-certificate-path`

See [Getting Started Guide](./docs/guides/getting-started.md) for detailed setup instructions.

---

## 🌐 API Endpoints

### Base URLs
| Environment | URL |
|-------------|-----|
| **CODE** | `https://mparticle-api-code.support.guardianapis.com` |
| **PROD** | `https://mparticle-api.support.guardianapis.com` |

### Primary Endpoints
- `POST /data-subject-requests` - Submit new DSR
- `GET /data-subject-requests/{id}` - Query DSR status  
- `POST /data-subject-requests/{id}/callback` - mParticle status updates
- `POST /events` - Forward analytics events

See [API Documentation](./docs/api/README.md) for complete endpoint details.

---

## 🔒 Security & Compliance

### Security Features
- **Input Validation**: Comprehensive Zod schema validation
- **Certificate Validation**: X.509 certificate verification for callbacks
- **Signature Verification**: RSA-SHA256 signature validation
- **Cross-Account Security**: IAM role-based Baton integration

### Compliance Coverage
- **GDPR**: Right to Erasure and Data Portability
- **CCPA**: Consumer deletion and access rights
- **Data Encryption**: TLS in transit, KMS at rest
- **Audit Logging**: Complete request and processing trails

See [Security & Compliance](./docs/operations/security-compliance.md) for implementation details.

---

## 📊 Monitoring & Operations

### Key Metrics
- Request volume and error rates
- DSR processing times and completion rates
- Certificate validation success rates
- mParticle API integration health

### Alerting
- **Critical**: >5% error rate, certificate validation failures
- **Warning**: High latency, unusual traffic patterns
- **Info**: Service health checks, capacity monitoring

See [Monitoring & Operations](./docs/operations/monitoring.md) for operational procedures.

---

## 🤝 Integration Points

### Baton Privacy Orchestration
The Lambda integrates with Guardian's Baton system for automated privacy workflows:
- Cross-account Lambda invocation
- Correlation tracking for multi-service requests
- Status synchronization across privacy processors

### mParticle Data Subject Requests
Direct integration with mParticle's DSR API:
- Automated request submission and tracking
- Secure callback handling with certificate validation
- Status polling and update processing

### Guardian Analytics Pipeline
Event forwarding to mParticle for analytics:
- Real-time event batching and forwarding
- Error handling and retry logic
- Performance monitoring and optimization

---

## 🔧 Development & Testing

### Local Development
```bash
# Set environment
export STAGE=CODE
export AWS_REGION=eu-west-1

# Start development server
pnpm dev

# Run specific tests
pnpm test:unit
pnpm test:integration
```

### Deployment
Managed through AWS CDK with environment-specific configurations. See [Getting Started](./docs/guides/getting-started.md) for deployment procedures.

---

## 📞 Support & Contact

### Team Information
- **Primary Owner**: Support Platform Team
- **Slack Channel**: #support-platform  
- **Escalation**: PagerDuty rotation for P0/P1 issues

### Documentation Issues
- Create PR against this repository for documentation updates
- Use GitHub Issues for bug reports and feature requests
- Email security@guardian.co.uk for security-related concerns

### Compliance Questions
- **Privacy Team**: #privacy-compliance (Slack)
- **Legal Team**: For regulatory interpretation and guidance
- **DPO Contact**: Via privacy team for data protection matters

---

## 📋 Quick Reference

### Environment Variables
- `STAGE`: Deployment environment (CODE/PROD)
- `AWS_REGION`: AWS region for Parameter Store access

### AWS Resources
- **Lambda Function**: `mparticle-api-{stage}`
- **API Gateway**: `mparticle-api-{stage}`
- **DynamoDB Table**: `mparticle-dsr-requests-{stage}`
- **Parameter Store**: `/mparticle-api/{stage}/*`

### External Dependencies
- **mParticle DSR API**: Data subject request processing
- **AWS Parameter Store**: Configuration management
- **CloudWatch**: Logging and monitoring
- **Baton**: Privacy workflow orchestration

For detailed information on any aspect of this service, please refer to the comprehensive documentation in the [docs](./docs/) directory.
