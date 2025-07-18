# Getting Started

This guide will help you set up, configure, and run the mParticle API Lambda for local development and testing.

## 🚀 Quick Start

### Prerequisites
- **Node.js**: Version 18.x or higher
- **pnpm**: Package manager (installed globally)
- **AWS CLI**: Configured with appropriate credentials
- **AWS CDK**: For infrastructure deployment (optional for development)

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

##  Additional Resources

### Documentation
- [Business Context](../business-context.md) - Understanding the business requirements
- [Architecture](../architecture.md) - System design and data flow
- [API Reference](../api/README.md) - Complete API documentation
- [Security & Compliance](../operations/security-compliance.md) - Security implementation details

### External Resources
- [mParticle DSR API Documentation](https://docs.mparticle.com/developers/dsr-api/)
- [AWS Lambda Developer Guide](https://docs.aws.amazon.com/lambda/latest/dg/)
- [API Gateway Developer Guide](https://docs.aws.amazon.com/apigateway/latest/developerguide/)
### Internal Guardian Resources
- [Baton Privacy Orchestration](../../zuora-baton/README.md)
- [Support Services Architecture](../../README.md)
- [Guardian Development Standards](https://github.com/guardian/frontend/blob/main/docs/01-development-workflow.md)

### Getting Help
- **Team Slack**: #support-platform
- **Documentation Issues**: Create PR against this repository
- **Bug Reports**: Use GitHub Issues
- **Security Issues**: Email security@guardian.co.uk

---

## ✅ Development Checklist

### Before Starting Development
- [ ] AWS credentials configured and tested
- [ ] Local development environment set up
- [ ] Test suite running successfully
- [ ] Documentation reviewed

### Before Submitting Changes
- [ ] All tests passing
- [ ] Code linted and formatted
- [ ] TypeScript compiles without errors
- [ ] Documentation updated if needed
- [ ] Security implications considered
