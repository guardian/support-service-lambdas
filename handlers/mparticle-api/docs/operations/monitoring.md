# Monitoring & Operations

This document provides comprehensive guidance for monitoring, alerting, troubleshooting, and maintaining the mParticle API Lambda in production environments.

## 📊 Monitoring Overview

The mParticle API Lambda uses CloudWatch for monitoring, logging, and alerting, with comprehensive observability across all operational aspects.

### Key Metrics Dashboard
- **Request Volume**: Total requests per endpoint
- **Error Rates**: 4xx and 5xx error percentages
- **Response Times**: P50, P90, P95, P99 latencies
- **mParticle Integration**: API call success rates
- **Certificate Status**: Validation success/failure rates
- **Baton Integration**: Cross-account invocation metrics

---

## 📈 CloudWatch Metrics

### Application Metrics

#### Request Metrics
```typescript
// Custom metrics published by the application
{
  "MetricName": "DSRRequestsSubmitted",
  "Namespace": "MParticleAPI",
  "Dimensions": [
    { "Name": "Environment", "Value": "PROD" },
    { "Name": "RequestType", "Value": "gdpr_delete" }
  ],
  "Value": 1,
  "Unit": "Count"
}
```

#### Core Metrics
| Metric | Description | Unit | Threshold |
|--------|-------------|------|-----------|
| `DSRRequestsSubmitted` | New DSR submissions | Count | Monitor growth |
| `DSRRequestsCompleted` | Completed DSRs | Count | Compare with submitted |
| `DSRRequestsFailed` | Failed DSR processing | Count | Alert >5% failure rate |
| `CertificateValidationSuccess` | Successful callback validations | Count | Monitor security |
| `CertificateValidationFailure` | Failed callback validations | Count | Alert >1% failure |
| `BatonIntegrationCalls` | Baton-initiated requests | Count | Monitor automation |
| `MParticleAPILatency` | mParticle API response time | Milliseconds | Alert >5000ms |

### AWS Lambda Metrics
- **Duration**: Function execution time
- **Invocations**: Total function invocations
- **Errors**: Function execution errors
- **Throttles**: Rate limiting occurrences
- **ConcurrentExecutions**: Simultaneous executions

### API Gateway Metrics
- **Count**: Total API requests
- **Latency**: End-to-end request latency
- **4XXError**: Client error rate
- **5XXError**: Server error rate
- **IntegrationLatency**: Lambda integration latency

---

## 🚨 Alerting Configuration

### Critical Alerts (PagerDuty)

#### High Error Rate
```yaml
AlertName: MParticleAPI-HighErrorRate
MetricName: AWS/ApiGateway/5XXError
Threshold: >5% over 5 minutes
Action: Page on-call engineer
Severity: Critical
```

#### Certificate Validation Failures
```yaml
AlertName: MParticleAPI-CertValidationFailures
MetricName: CertificateValidationFailure
Threshold: >1% over 5 minutes
Action: Page security team
Severity: Critical
```

#### mParticle API Failures
```yaml
AlertName: MParticleAPI-UpstreamFailures
MetricName: DSRRequestsFailed
Threshold: >10 failures over 15 minutes
Action: Page on-call engineer
Severity: High
```

### Warning Alerts (Slack)

#### Elevated Response Times
```yaml
AlertName: MParticleAPI-HighLatency
MetricName: AWS/ApiGateway/Latency
Threshold: >2000ms P95 over 10 minutes
Action: Slack #support-alerts
Severity: Warning
```

#### Certificate Expiry Warning
```yaml
AlertName: MParticleAPI-CertExpiry
MetricName: CertificateExpiryDays
Threshold: <30 days
Action: Slack #security-alerts
Severity: Warning
```

#### Unusual Request Volume
```yaml
AlertName: MParticleAPI-HighVolume
MetricName: AWS/ApiGateway/Count
Threshold: >200% of baseline over 30 minutes
Action: Slack #support-alerts
Severity: Info
```

---

## 📋 Operational Runbooks

### 🚨 High Error Rate Response

#### Symptoms
- 5XX error rate >5% sustained over 5+ minutes
- User reports of failed DSR submissions
- CloudWatch alarm triggered

#### Investigation Steps
1. **Check API Gateway Metrics**
   ```bash
   aws logs filter-log-events \
     --log-group-name /aws/apigateway/mparticle-api \
     --start-time $(date -d '1 hour ago' +%s)000 \
     --filter-pattern '{ $.status >= 500 }'
   ```

2. **Review Lambda Logs**
   ```bash
   aws logs filter-log-events \
     --log-group-name /aws/lambda/mparticle-api \
     --start-time $(date -d '1 hour ago' +%s)000 \
     --filter-pattern 'ERROR'
   ```

3. **Check mParticle API Status**
   - Verify mParticle service status page
   - Test direct API connectivity
   - Check Parameter Store configuration

#### Resolution Actions
- **Lambda Issues**: Deploy rollback if recent deployment
- **mParticle Issues**: Enable degraded mode if available
- **Configuration Issues**: Verify Parameter Store values
- **Resource Issues**: Check Lambda concurrency and timeout settings

### 🔒 Certificate Validation Failures

#### Symptoms
- Certificate validation failure rate >1%
- Callback endpoints returning 401 errors
- mParticle status updates not being received

#### Investigation Steps
1. **Check Certificate Validity**
   ```bash
   # Extract and verify mParticle certificate
   openssl x509 -in mparticle-cert.pem -text -noout
   ```

2. **Review Validation Logs**
   ```bash
   aws logs filter-log-events \
     --log-group-name /aws/lambda/mparticle-api \
     --filter-pattern 'certificate validation failed'
   ```

3. **Test Certificate Chain**
   ```bash
   # Verify certificate chain to root CA
   openssl verify -CAfile root-ca.pem intermediate-ca.pem mparticle-cert.pem
   ```

#### Resolution Actions
- **Expired Certificate**: Update certificate in Parameter Store
- **Revoked Certificate**: Contact mParticle for new certificate
- **Chain Issues**: Verify intermediate CA certificates
- **Code Issues**: Review certificate validation logic

### 📈 Performance Degradation

#### Symptoms
- API Gateway latency >2000ms P95
- Lambda duration increasing
- User reports of slow responses

#### Investigation Steps
1. **Identify Bottlenecks**
   ```bash
   # Check Lambda duration distribution
   aws logs filter-log-events \
     --log-group-name /aws/lambda/mparticle-api \
     --filter-pattern '{ $.duration > 5000 }'
   ```

2. **Review External Dependencies**
   - mParticle API response times
   - DynamoDB query performance
   - Parameter Store access latency

3. **Check Resource Limits**
   - Lambda memory allocation
   - DynamoDB read/write capacity
   - API Gateway throttling

#### Resolution Actions
- **Lambda Optimization**: Increase memory allocation
- **DynamoDB Scaling**: Adjust provisioned capacity
- **Code Optimization**: Optimize database queries
- **Caching**: Implement Parameter Store caching

---

## 📊 Health Checks

### Application Health Check
```typescript
// Health check endpoint implementation
export const healthCheckHandler = async (): Promise<APIGatewayProxyResult> => {
  const checks = {
    mparticleAPI: await checkMParticleAPI(),
    dynamodb: await checkDynamoDB(),
    parameterStore: await checkParameterStore()
  };
  
  const allHealthy = Object.values(checks).every(check => check.healthy);
  
  return {
    statusCode: allHealthy ? 200 : 503,
    body: JSON.stringify({
      status: allHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      checks
    })
  };
};
```

### External Dependencies Health
- **mParticle API**: Regular ping to verify connectivity
- **DynamoDB**: Test read/write operations
- **Parameter Store**: Verify parameter access
- **Certificate Validation**: Test certificate chain validation

---

## 🔍 Troubleshooting Guide

### Common Issues

#### 1. DSR Submission Failures
**Symptoms**: 500 errors on POST /data-subject-requests

**Causes & Solutions**:
- **Invalid mParticle API Key**: Verify Parameter Store value
- **Network Issues**: Check VPC configuration and security groups
- **Rate Limiting**: Review API call patterns and implement backoff
- **Schema Validation**: Check request payload format

#### 2. Callback Endpoint Issues
**Symptoms**: mParticle callbacks failing or not updating status

**Causes & Solutions**:
- **Certificate Validation**: Update expired certificates
- **Signature Verification**: Check RSA key compatibility
- **DynamoDB Permissions**: Verify Lambda IAM role
- **Request ID Mismatch**: Check correlation between submit and callback

#### 3. Baton Integration Problems
**Symptoms**: Cross-account Lambda invocations failing

**Causes & Solutions**:
- **IAM Permissions**: Verify cross-account role assumption
- **Function Name**: Check Lambda function naming consistency
- **Payload Format**: Verify Baton payload structure
- **Network Connectivity**: Check cross-account networking

#### 4. Performance Issues
**Symptoms**: High latency or timeouts

**Causes & Solutions**:
- **Cold Starts**: Implement provisioned concurrency
- **Memory Allocation**: Increase Lambda memory
- **Database Queries**: Optimize DynamoDB access patterns
- **External API Latency**: Implement circuit breakers

---

## 📈 Capacity Planning

### Traffic Patterns
- **Daily Peak**: 2-4 PM GMT (business hours)
- **Weekly Pattern**: Monday-Friday higher volume
- **Seasonal Trends**: GDPR deadline spikes (May 25)
- **Incident Response**: 10x normal volume during privacy incidents

### Scaling Considerations
- **Lambda Concurrency**: Reserve capacity for peak times
- **DynamoDB Capacity**: Auto-scaling based on utilization
- **API Gateway**: Burst and steady-state limits
- **Cost Optimization**: Right-size resources for actual usage

---

## 🔧 Maintenance Procedures

### Regular Maintenance Tasks

#### Weekly
- [ ] Review error rate trends
- [ ] Check certificate expiry dates
- [ ] Validate backup procedures
- [ ] Review cost optimization opportunities

#### Monthly
- [ ] Security patch updates
- [ ] Performance review and optimization
- [ ] Capacity planning review
- [ ] Documentation updates

#### Quarterly
- [ ] Disaster recovery testing
- [ ] Security audit and review
- [ ] Architecture review
- [ ] Compliance validation

### Deployment Procedures
1. **Pre-deployment**: Run test suite and security scans
2. **Deployment**: Use blue-green deployment strategy
3. **Post-deployment**: Monitor error rates and performance
4. **Rollback**: Automated rollback on failure detection

---

## 📊 Performance Baselines

### Normal Operating Ranges
| Metric | Baseline | Acceptable Range | Alert Threshold |
|--------|----------|------------------|-----------------|
| API Gateway Latency | 200ms | <500ms | >1000ms |
| Lambda Duration | 150ms | <300ms | >500ms |
| Error Rate | <1% | <2% | >5% |
| mParticle API Latency | 300ms | <1000ms | >2000ms |
| Certificate Validation Success | >99% | >98% | <95% |

### Capacity Limits
- **API Gateway**: 10,000 requests/second burst
- **Lambda Concurrency**: 1,000 concurrent executions
- **DynamoDB**: 40,000 read/write capacity units
- **mParticle API**: 1,000 requests/minute per workspace

---

## 📞 Escalation Procedures

### Severity Levels

#### P0 - Critical
- **Definition**: Service completely unavailable
- **Response Time**: 15 minutes
- **Escalation**: Immediate PagerDuty alert
- **Owner**: On-call engineer + manager

#### P1 - High
- **Definition**: Significant degradation affecting users
- **Response Time**: 1 hour
- **Escalation**: PagerDuty alert during business hours
- **Owner**: On-call engineer

#### P2 - Medium
- **Definition**: Minor issues with workarounds
- **Response Time**: 4 hours
- **Escalation**: Slack notification
- **Owner**: Assigned engineer

#### P3 - Low
- **Definition**: Enhancement requests or minor bugs
- **Response Time**: Next business day
- **Escalation**: Ticket system
- **Owner**: Team backlog

### Contact Information
- **On-Call Engineer**: Via PagerDuty
- **Security Team**: security@guardian.co.uk
- **Infrastructure Team**: #infrastructure-alerts (Slack)
- **Product Owner**: #privacy-compliance (Slack)
