# Getting Started

This guide will help you set up, configure, and run the mParticle API Lambda for local development and testing.

## 🚀 Quick Start

### Prerequisites
- **Node.js**: Version 18.x or higher
- **pnpm**: Package manager (installed globally)
- **AWS CLI**: Configured with appropriate credentials
- **AWS CDK**: For infrastructure deployment (optional for development)
- **Docker**: For local DynamoDB testing (optional)

### Installation
```bash
# Navigate to the mParticle API directory
cd handlers/mparticle-api

# Install dependencies
pnpm install

# Build the project
pnpm build

# Run tests
pnpm test
```

---

## 🔧 Configuration

### AWS Credentials Setup
The Lambda relies on AWS Parameter Store for configuration. Ensure your AWS credentials have access to the required parameters.

#### Configure AWS CLI
```bash
# Configure default profile
aws configure

# Or use specific profile
export AWS_PROFILE=your-profile-name

# Verify access
aws sts get-caller-identity
```

#### Required Permissions
Your AWS user/role needs these permissions:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ssm:GetParameter",
        "ssm:GetParameters",
        "ssm:GetParametersByPath"
      ],
      "Resource": "arn:aws:ssm:*:*:parameter/mparticle-api/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:Query"
      ],
      "Resource": "arn:aws:dynamodb:*:*:table/mparticle-dsr-*"
    }
  ]
}
```

### Parameter Store Configuration

#### Required Parameters
Set these parameters in AWS Parameter Store for your environment:

```bash
# mParticle API Configuration
aws ssm put-parameter \
  --name "/mparticle-api/CODE/mparticle-api-key" \
  --value "your-mparticle-api-key" \
  --type "SecureString"

aws ssm put-parameter \
  --name "/mparticle-api/CODE/mparticle-workspace-id" \
  --value "your-workspace-id" \
  --type "String"

# Database Configuration
aws ssm put-parameter \
  --name "/mparticle-api/CODE/dynamodb-table-name" \
  --value "mparticle-dsr-requests-code" \
  --type "String"

# Certificate Configuration
aws ssm put-parameter \
  --name "/mparticle-api/CODE/callback-certificate-path" \
  --value "/path/to/mparticle-certificate.pem" \
  --type "String"
```

#### Environment-Specific Parameters
Replace `CODE` with `PROD` for production environment parameters.

---

## 🏠 Local Development

### Environment Setup
```bash
# Set environment variables
export STAGE=CODE
export AWS_REGION=eu-west-1

# Optional: Local DynamoDB
export DYNAMODB_ENDPOINT=http://localhost:8000
```

### Running Locally

#### 1. Start Local DynamoDB (Optional)
```bash
# Using Docker
docker run -p 8000:8000 amazon/dynamodb-local

# Create test table
aws dynamodb create-table \
  --table-name mparticle-dsr-requests-code \
  --attribute-definitions \
    AttributeName=id,AttributeType=S \
  --key-schema \
    AttributeName=id,KeyType=HASH \
  --provisioned-throughput \
    ReadCapacityUnits=1,WriteCapacityUnits=1 \
  --endpoint-url http://localhost:8000
```

#### 2. Start Development Server
```bash
# Install development dependencies
pnpm install

# Start in watch mode
pnpm dev

# Or start normally
pnpm start
```

#### 3. Test API Endpoints
```bash
# Submit a test DSR
curl -X POST http://localhost:3000/data-subject-requests \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "type": "gdpr_delete",
    "regulation": "GDPR"
  }'

# Check status
curl http://localhost:3000/data-subject-requests/{request-id}
```

---

## 🧪 Testing

### Test Suite Structure
```
tests/
├── unit/           # Unit tests for individual functions
├── integration/    # Integration tests with AWS services
├── e2e/           # End-to-end API tests
└── fixtures/      # Test data and mocks
```

### Running Tests

#### Unit Tests
```bash
# Run all unit tests
pnpm test:unit

# Run specific test file
pnpm test:unit handlers/httpRouter.test.ts

# Run with coverage
pnpm test:coverage
```

#### Integration Tests
```bash
# Requires AWS credentials and test environment
pnpm test:integration

# Run against local DynamoDB
DYNAMODB_ENDPOINT=http://localhost:8000 pnpm test:integration
```

#### End-to-End Tests
```bash
# Requires deployed API Gateway endpoint
API_BASE_URL=https://your-api-gateway.amazonaws.com pnpm test:e2e
```

### Test Configuration
Create a `.env.test` file for test-specific configuration:
```bash
# Test environment variables
STAGE=TEST
AWS_REGION=eu-west-1
DYNAMODB_ENDPOINT=http://localhost:8000
MPARTICLE_API_KEY=test-key
MPARTICLE_WORKSPACE_ID=test-workspace
```

---

## 🔨 Development Workflow

### Code Structure
```
src/
├── handlers/          # Lambda handler functions
│   ├── httpRouter.ts    # HTTP API Gateway handlers
│   ├── batonRouter.ts   # Baton integration handlers
│   └── index.ts         # Main entry point
├── services/          # Business logic services
│   ├── mparticle.ts     # mParticle API client
│   ├── database.ts      # DynamoDB operations
│   └── validation.ts    # Certificate validation
├── schemas/           # Zod validation schemas
├── types/            # TypeScript type definitions
└── utils/            # Utility functions
```

### Development Scripts
```bash
# Available npm scripts
pnpm build          # Compile TypeScript
pnpm dev            # Start development server
pnpm test           # Run all tests
pnpm lint           # Run ESLint
pnpm format         # Format code with Prettier
pnpm type-check     # TypeScript type checking
```

### Code Quality Tools
- **TypeScript**: Static type checking
- **ESLint**: Code linting with Guardian's configuration
- **Prettier**: Code formatting
- **Husky**: Git hooks for pre-commit checks
- **Jest**: Testing framework

---

## 🚀 Deployment

### Local Testing Before Deployment
```bash
# Run full test suite
pnpm test

# Type checking
pnpm type-check

# Linting
pnpm lint

# Build for production
pnpm build:prod
```

### CDK Deployment
```bash
# Navigate to CDK directory
cd ../../cdk

# Install CDK dependencies
pnpm install

# Deploy to CODE environment
pnpm cdk deploy mparticle-api-code

# Deploy to PROD environment
pnpm cdk deploy mparticle-api-prod
```

### Manual Deployment
```bash
# Package Lambda function
zip -r mparticle-api.zip dist/ node_modules/

# Update Lambda function
aws lambda update-function-code \
  --function-name mparticle-api-code \
  --zip-file fileb://mparticle-api.zip
```

---

## 🐛 Debugging

### Local Debugging
```bash
# Enable debug logging
export LOG_LEVEL=debug

# Start with Node.js debugger
node --inspect-brk=0.0.0.0:9229 dist/index.js

# Or use VS Code debugger with launch.json
```

### VS Code Debug Configuration
```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug mParticle API",
  "program": "${workspaceFolder}/dist/index.js",
  "env": {
    "STAGE": "CODE",
    "AWS_REGION": "eu-west-1",
    "LOG_LEVEL": "debug"
  },
  "console": "integratedTerminal",
  "sourceMaps": true
}
```

### CloudWatch Logs
```bash
# Stream logs in real-time
aws logs tail /aws/lambda/mparticle-api-code --follow

# Search for specific errors
aws logs filter-log-events \
  --log-group-name /aws/lambda/mparticle-api-code \
  --filter-pattern 'ERROR'
```

---

## 📚 Additional Resources

### Documentation
- [Business Context](../business-context.md) - Understanding the business requirements
- [Architecture](../architecture.md) - System design and data flow
- [API Reference](../api/README.md) - Complete API documentation
- [Security & Compliance](../operations/security-compliance.md) - Security implementation details

### External Resources
- [mParticle DSR API Documentation](https://docs.mparticle.com/developers/dsr-api/)
- [AWS Lambda Developer Guide](https://docs.aws.amazon.com/lambda/latest/dg/)
- [API Gateway Developer Guide](https://docs.aws.amazon.com/apigateway/latest/developerguide/)
- [DynamoDB Developer Guide](https://docs.aws.amazon.com/dynamodb/latest/developerguide/)

### Internal Guardian Resources
- [Baton Privacy Orchestration](../../zuora-baton/README.md)
- [Support Services Architecture](../../README.md)
- [Guardian Development Standards](https://github.com/guardian/frontend/blob/main/docs/01-development-workflow.md)

---

## ❓ Troubleshooting

### Common Issues

#### Permission Denied Errors
```bash
# Check AWS credentials
aws sts get-caller-identity

# Verify Parameter Store access
aws ssm get-parameter --name "/mparticle-api/CODE/mparticle-api-key"
```

#### Build Failures
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
pnpm install

# Check TypeScript version compatibility
pnpm list typescript
```

#### Test Failures
```bash
# Run tests in watch mode for debugging
pnpm test --watch

# Check test environment variables
cat .env.test
```

### Getting Help
- **Team Slack**: #support-platform
- **Documentation Issues**: Create PR against this repository
- **Bug Reports**: Use GitHub Issues
- **Security Issues**: Email security@guardian.co.uk

---

## ✅ Development Checklist

### Before Starting Development
- [ ] AWS credentials configured and tested
- [ ] Required Parameter Store values set
- [ ] Local development environment set up
- [ ] Test suite running successfully
- [ ] Documentation reviewed

### Before Submitting Changes
- [ ] All tests passing
- [ ] Code linted and formatted
- [ ] TypeScript compiles without errors
- [ ] Integration tests run successfully
- [ ] Documentation updated if needed
- [ ] Security implications considered

### Before Deployment
- [ ] Code reviewed by team member
- [ ] Full test suite passes in CI
- [ ] Parameter Store configuration verified
- [ ] Deployment procedure tested in CODE environment
- [ ] Monitoring and alerting verified
