# 🎯 Business Context

## Why This Matters

The Guardian is an **international newspaper with a global reputation** that must comply with strict privacy regulations. **Legal compliance failures can result in legal action**, making this service mission-critical for business operations.

## Key Business Requirements

- ⚖️ **Legal Compliance**: GDPR and CCPA mandate 28-day response times for data subject requests
- 🔒 **Data Privacy**: Secure handling of reader data across The Guardian's digital ecosystem
- 📊 **Audit Trail**: Complete logging and monitoring for regulatory compliance
- 🌍 **International Scope**: Supporting readers across different jurisdictions

## The Guardian's Data Ecosystem

The Guardian collects comprehensive reader data including:
- 📖 **Content Engagement**: Article views, reading time, interaction patterns
- 🎯 **Subscription Data**: Payment information, subscription preferences
- 📧 **Marketing Analytics**: Email engagement, campaign performance
- 📱 **Cross-Platform Behavior**: Mobile app usage, web interactions
- 🎫 **Event Participation**: Guardian Live events, community engagement

This data flows through **mParticle** for analytics and audience segmentation, then forwards to **Braze** for marketing automation.

## Compliance Framework

### GDPR Requirements
- **Article 17**: Right to erasure ("right to be forgotten")
- **28-day response deadline**: Mandatory timeline for processing requests
- **Audit trail**: Complete documentation of processing activities

### CCPA Requirements  
- **Section 1798.105**: Consumer right to delete personal information
- **Business day response**: Confirmation of request receipt
- **Verification process**: Identity confirmation before processing

## Business Impact

### Success Metrics
- **100% compliance** with regulatory deadlines
- **Zero legal incidents** related to privacy violations
- **Complete audit coverage** for all data subject requests

### Risk Mitigation
- **Automated processing** reduces manual errors
- **Centralized orchestration** via Baton ensures no system is missed
- **Real-time monitoring** detects and alerts on failures immediately

---

**Next:** [Architecture Overview](architecture.md) | **Related:** [Compliance & Security](../operations/security-compliance.md)
