# Testing Strategy

This document outlines the testing approach for the mParticle API Lambda, focusing on unit testing to ensure code quality and reliability.

## 🧪 Testing Philosophy

The mParticle API Lambda follows a unit testing strategy to ensure:
- Individual function reliability
- Type safety and validation
- Error handling correctness
- Business logic accuracy

---

## 📁 Test Structure

### Directory Organization
```
tests/
├── unit/                    # Unit tests
│   ├── handlers/           # Handler function tests
│   ├── services/           # Service layer tests
│   ├── utils/              # Utility function tests
│   └── schemas/            # Validation schema tests
├── fixtures/              # Test data and mocks
└── helpers/               # Test utility functions
```

---

## 🎯 Unit Testing

### Test Framework
- **Jest**: Primary testing framework
- **TypeScript**: Type-safe test development
- **Coverage**: Minimum 85% code coverage requirement

### Example Unit Tests

#### Handler Function Testing
```typescript
// tests/unit/handlers/httpRouter.test.ts
import { submitHandler } from '../../../src/handlers/httpRouter';
import { mockAPIGatewayProxyEvent } from '../../helpers/mockEvents';

describe('submitHandler', () => {
  it('should submit valid DSR request', async () => {
    const event = mockAPIGatewayProxyEvent({
      body: JSON.stringify({
        email: 'test@example.com',
        type: 'gdpr_delete',
        regulation: 'GDPR'
      })
    });

    const result = await submitHandler(event);

    expect(result.statusCode).toBe(201);
    expect(JSON.parse(result.body)).toMatchObject({
      id: expect.any(String),
      status: 'submitted'
    });
  });

  it('should reject invalid email format', async () => {
    const event = mockAPIGatewayProxyEvent({
      body: JSON.stringify({
        email: 'invalid-email',
        type: 'gdpr_delete'
      })
    });

    const result = await submitHandler(event);

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toMatchObject({
      error: {
        code: 'VALIDATION_ERROR',
        message: expect.stringContaining('Invalid email')
      }
    });
  });
});
```

#### Service Layer Testing
```typescript
// tests/unit/services/mparticle.test.ts
import { MParticleService } from '../../../src/services/mparticle';
import { mockMParticleResponse } from '../../fixtures/mparticle';

jest.mock('axios');
const mockAxios = axios as jest.Mocked<typeof axios>;

describe('MParticleService', () => {
  const service = new MParticleService('test-api-key', 'test-workspace');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should submit DSR request successfully', async () => {
    mockAxios.post.mockResolvedValue({
      data: mockMParticleResponse.submitSuccess
    });

    const result = await service.submitDSR({
      email: 'test@example.com',
      type: 'gdpr_delete'
    });

    expect(result.id).toBeDefined();
    expect(result.status).toBe('submitted');
    expect(mockAxios.post).toHaveBeenCalledWith(
      expect.stringContaining('/dsr'),
      expect.objectContaining({
        email: 'test@example.com',
        type: 'gdpr_delete'
      }),
      expect.objectContaining({
        headers: {
          'Authorization': 'Bearer test-api-key'
        }
      })
    );
  });

  it('should handle mParticle API errors', async () => {
    mockAxios.post.mockRejectedValue(new Error('API Error'));

    await expect(service.submitDSR({
      email: 'test@example.com',
      type: 'gdpr_delete'
    })).rejects.toThrow('Failed to submit DSR to mParticle');
  });
});
```

#### Schema Validation Testing
```typescript
// tests/unit/schemas/dataSubjectRequest.test.ts
import { DataSubjectRequestSchema } from '../../../src/schemas/dataSubjectRequest';

describe('DataSubjectRequestSchema', () => {
  it('should validate correct DSR payload', () => {
    const validPayload = {
      email: 'test@example.com',
      type: 'gdpr_delete',
      regulation: 'GDPR'
    };

    const result = DataSubjectRequestSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
    expect(result.data).toEqual(validPayload);
  });

  it('should reject invalid email format', () => {
    const invalidPayload = {
      email: 'not-an-email',
      type: 'gdpr_delete'
    };

    const result = DataSubjectRequestSchema.safeParse(invalidPayload);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(['email']);
  });

  it('should reject invalid request type', () => {
    const invalidPayload = {
      email: 'test@example.com',
      type: 'invalid_type'
    };

    const result = DataSubjectRequestSchema.safeParse(invalidPayload);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(['type']);
  });
});
```

### Running Unit Tests
```bash
# Run all unit tests
pnpm test:unit

# Run with coverage
pnpm test:unit --coverage

# Run specific test file
pnpm test:unit handlers/httpRouter.test.ts

# Run in watch mode
pnpm test:unit --watch
```

---

## 🔗 Integration Testing

### AWS Service Integration

#### DynamoDB Integration
```typescript
// tests/integration/database/dsrRepository.test.ts
import { DSRRepository } from '../../../src/services/database';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

describe('DSRRepository Integration', () => {
  let repository: DSRRepository;
  let dynamoClient: DynamoDBClient;

  beforeAll(async () => {
    // Use local DynamoDB for testing
    dynamoClient = new DynamoDBClient({
      endpoint: 'http://localhost:8000',
      region: 'eu-west-1'
    });
    repository = new DSRRepository(dynamoClient, 'test-table');
    
    // Create test table
    await createTestTable();
  });

  afterAll(async () => {
    await deleteTestTable();
    dynamoClient.destroy();
  });

  it('should store and retrieve DSR request', async () => {
    const dsrData = {
      id: 'test-id-123',
      email: 'test@example.com',
      type: 'gdpr_delete',
      status: 'submitted',
      submittedAt: new Date().toISOString()
    };

    await repository.create(dsrData);
    const retrieved = await repository.getById('test-id-123');

    expect(retrieved).toMatchObject(dsrData);
  });

  it('should update DSR status', async () => {
    const dsrId = 'test-id-456';
    await repository.create({
      id: dsrId,
      email: 'test@example.com',
      type: 'gdpr_delete',
      status: 'submitted'
    });

    await repository.updateStatus(dsrId, 'completed');
    const updated = await repository.getById(dsrId);

    expect(updated.status).toBe('completed');
    expect(updated.completedAt).toBeDefined();
  });
});
```

#### Parameter Store Integration
```typescript
// tests/integration/aws/parameterStore.test.ts
import { ParameterStore } from '../../../src/services/parameterStore';
import { SSMClient } from '@aws-sdk/client-ssm';

describe('ParameterStore Integration', () => {
  let parameterStore: ParameterStore;

  beforeAll(() => {
    const ssmClient = new SSMClient({ region: 'eu-west-1' });
    parameterStore = new ParameterStore(ssmClient);
  });

  it('should retrieve mParticle API key', async () => {
    const apiKey = await parameterStore.getMParticleAPIKey('CODE');
    
    expect(apiKey).toBeDefined();
    expect(typeof apiKey).toBe('string');
    expect(apiKey.length).toBeGreaterThan(0);
  });

  it('should handle missing parameters gracefully', async () => {
    await expect(
      parameterStore.getParameter('/nonexistent/parameter')
    ).rejects.toThrow('Parameter not found');
  });
});
```

### External API Integration

#### mParticle API Integration
```typescript
// tests/integration/mparticle/apiClient.test.ts
import { MParticleAPIClient } from '../../../src/services/mparticle';

describe('mParticle API Integration', () => {
  let client: MParticleAPIClient;

  beforeAll(() => {
    client = new MParticleAPIClient(
      process.env.MPARTICLE_API_KEY_TEST!,
      process.env.MPARTICLE_WORKSPACE_ID_TEST!
    );
  });

  it('should submit DSR request to mParticle', async () => {
    const dsrRequest = {
      email: 'integration-test@example.com',
      type: 'gdpr_delete' as const,
      regulation: 'GDPR'
    };

    const response = await client.submitDSR(dsrRequest);

    expect(response.id).toBeDefined();
    expect(response.status).toBe('submitted');
    expect(response.email).toBe(dsrRequest.email);
  });

  it('should query DSR status from mParticle', async () => {
    // First submit a request
    const submitResponse = await client.submitDSR({
      email: 'status-test@example.com',
      type: 'gdpr_delete'
    });

    // Then query its status
    const statusResponse = await client.getDSRStatus(submitResponse.id);

    expect(statusResponse.id).toBe(submitResponse.id);
    expect(['submitted', 'in_progress', 'completed']).toContain(statusResponse.status);
  });
});
```

### Running Integration Tests
```bash
# Set up test environment
export STAGE=TEST
export AWS_REGION=eu-west-1

# Start local DynamoDB
docker run -d -p 8000:8000 amazon/dynamodb-local

# Run integration tests
pnpm test:integration

# Run specific integration test
pnpm test:integration database/dsrRepository.test.ts
```

---

## 🌐 End-to-End Testing

### API Gateway E2E Tests
```typescript
// tests/e2e/api/dsrWorkflow.test.ts
import axios from 'axios';

describe('DSR Workflow E2E', () => {
  const apiBaseUrl = process.env.API_BASE_URL!;
  let submittedRequestId: string;

  it('should complete full DSR workflow', async () => {
    // 1. Submit DSR request
    const submitResponse = await axios.post(
      `${apiBaseUrl}/data-subject-requests`,
      {
        email: 'e2e-test@example.com',
        type: 'gdpr_delete',
        regulation: 'GDPR'
      }
    );

    expect(submitResponse.status).toBe(201);
    expect(submitResponse.data.id).toBeDefined();
    submittedRequestId = submitResponse.data.id;

    // 2. Query request status
    const statusResponse = await axios.get(
      `${apiBaseUrl}/data-subject-requests/${submittedRequestId}`
    );

    expect(statusResponse.status).toBe(200);
    expect(statusResponse.data.id).toBe(submittedRequestId);
    expect(statusResponse.data.status).toBe('submitted');

    // 3. Simulate callback (in real scenario, mParticle sends this)
    const callbackResponse = await axios.post(
      `${apiBaseUrl}/data-subject-requests/${submittedRequestId}/callback`,
      {
        request_id: submittedRequestId,
        status: 'completed',
        completion_date: new Date().toISOString()
      },
      {
        headers: {
          'X-MP-Signature': 'test-signature',
          'X-MP-Certificate': 'test-certificate'
        }
      }
    );

    expect(callbackResponse.status).toBe(200);

    // 4. Verify status update
    const finalStatusResponse = await axios.get(
      `${apiBaseUrl}/data-subject-requests/${submittedRequestId}`
    );

    expect(finalStatusResponse.data.status).toBe('completed');
  });
});
```

### Baton Integration E2E Tests
```typescript
// tests/e2e/baton/integration.test.ts
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

describe('Baton Integration E2E', () => {
  let lambdaClient: LambdaClient;

  beforeAll(() => {
    lambdaClient = new LambdaClient({ region: 'eu-west-1' });
  });

  it('should handle Baton-initiated DSR request', async () => {
    const batonPayload = {
      action: 'initiate',
      payload: {
        identityId: 'guardian-user-123',
        email: 'baton-test@example.com',
        requestType: 'delete',
        regulation: 'GDPR',
        correlationId: 'baton-workflow-789'
      }
    };

    const response = await lambdaClient.send(new InvokeCommand({
      FunctionName: 'mparticle-api-code',
      Payload: JSON.stringify(batonPayload)
    }));

    const result = JSON.parse(Buffer.from(response.Payload!).toString());

    expect(result.success).toBe(true);
    expect(result.mparticleRequestId).toBeDefined();
    expect(result.correlationId).toBe('baton-workflow-789');
  });
});
```

---

## 🔒 Security Testing

### Certificate Validation Tests
```typescript
// tests/security/certificates/validation.test.ts
import { CertificateValidator } from '../../../src/services/certificateValidator';
import { readFileSync } from 'fs';

describe('Certificate Validation Security', () => {
  let validator: CertificateValidator;

  beforeAll(() => {
    validator = new CertificateValidator();
  });

  it('should validate legitimate mParticle certificate', async () => {
    const validCert = readFileSync('tests/fixtures/valid-mparticle-cert.pem', 'utf8');
    
    const isValid = await validator.validateCertificate(validCert);
    
    expect(isValid).toBe(true);
  });

  it('should reject expired certificate', async () => {
    const expiredCert = readFileSync('tests/fixtures/expired-cert.pem', 'utf8');
    
    const isValid = await validator.validateCertificate(expiredCert);
    
    expect(isValid).toBe(false);
  });

  it('should reject untrusted certificate', async () => {
    const untrustedCert = readFileSync('tests/fixtures/untrusted-cert.pem', 'utf8');
    
    const isValid = await validator.validateCertificate(untrustedCert);
    
    expect(isValid).toBe(false);
  });
});
```

### Input Validation Security Tests
```typescript
// tests/security/input-validation/injection.test.ts
import { DataSubjectRequestSchema } from '../../../src/schemas/dataSubjectRequest';

describe('Input Validation Security', () => {
  it('should prevent SQL injection attempts', () => {
    const maliciousPayload = {
      email: "'; DROP TABLE users; --",
      type: 'gdpr_delete'
    };

    const result = DataSubjectRequestSchema.safeParse(maliciousPayload);
    
    expect(result.success).toBe(false);
  });

  it('should prevent XSS attempts', () => {
    const xssPayload = {
      email: '<script>alert("xss")</script>@example.com',
      type: 'gdpr_delete'
    };

    const result = DataSubjectRequestSchema.safeParse(xssPayload);
    
    expect(result.success).toBe(false);
  });

  it('should prevent oversized payloads', () => {
    const oversizedPayload = {
      email: 'a'.repeat(1000) + '@example.com',
      type: 'gdpr_delete'
    };

    const result = DataSubjectRequestSchema.safeParse(oversizedPayload);
    
    expect(result.success).toBe(false);
  });
});
```

---

## 🚀 Performance Testing

### Load Testing
```typescript
// tests/performance/load.test.ts
import axios from 'axios';

describe('Performance Load Testing', () => {
  const apiBaseUrl = process.env.API_BASE_URL!;

  it('should handle concurrent DSR submissions', async () => {
    const concurrentRequests = 50;
    const requests = Array.from({ length: concurrentRequests }, (_, i) => 
      axios.post(`${apiBaseUrl}/data-subject-requests`, {
        email: `load-test-${i}@example.com`,
        type: 'gdpr_delete'
      })
    );

    const startTime = Date.now();
    const responses = await Promise.all(requests);
    const endTime = Date.now();

    const duration = endTime - startTime;
    const avgResponseTime = duration / concurrentRequests;

    expect(responses.every(r => r.status === 201)).toBe(true);
    expect(avgResponseTime).toBeLessThan(1000); // Average under 1 second
  });

  it('should maintain performance under sustained load', async () => {
    const duration = 30000; // 30 seconds
    const requestInterval = 100; // 100ms between requests
    const responses: any[] = [];
    
    const endTime = Date.now() + duration;
    let requestCount = 0;

    while (Date.now() < endTime) {
      const startRequest = Date.now();
      
      try {
        const response = await axios.post(`${apiBaseUrl}/data-subject-requests`, {
          email: `sustained-test-${requestCount}@example.com`,
          type: 'gdpr_delete'
        });
        
        responses.push({
          status: response.status,
          duration: Date.now() - startRequest
        });
      } catch (error) {
        responses.push({
          status: 'error',
          duration: Date.now() - startRequest
        });
      }

      requestCount++;
      await new Promise(resolve => setTimeout(resolve, requestInterval));
    }

    const successRate = responses.filter(r => r.status === 201).length / responses.length;
    const avgDuration = responses.reduce((sum, r) => sum + r.duration, 0) / responses.length;

    expect(successRate).toBeGreaterThan(0.95); // 95% success rate
    expect(avgDuration).toBeLessThan(2000); // Average under 2 seconds
  });
});
```

---

## 🔄 Continuous Integration

### GitHub Actions Workflow
```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Run unit tests
        run: pnpm test:unit --coverage
      
      - name: Upload coverage reports
        uses: codecov/codecov-action@v3

  integration-tests:
    runs-on: ubuntu-latest
    services:
      dynamodb:
        image: amazon/dynamodb-local
        ports:
          - 8000:8000
    
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'pnpm'
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: eu-west-1
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Run integration tests
        run: pnpm test:integration
        env:
          DYNAMODB_ENDPOINT: http://localhost:8000

  security-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Run security tests
        run: pnpm test:security
      
      - name: Run dependency audit
        run: pnpm audit

  e2e-tests:
    runs-on: ubuntu-latest
    needs: [unit-tests, integration-tests]
    if: github.ref == 'refs/heads/main'
    
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Run E2E tests
        run: pnpm test:e2e
        env:
          API_BASE_URL: ${{ secrets.E2E_API_BASE_URL }}
```

### Test Scripts Configuration
```json
{
  "scripts": {
    "test": "jest",
    "test:unit": "jest tests/unit",
    "test:integration": "jest tests/integration",
    "test:e2e": "jest tests/e2e",
    "test:security": "jest tests/security",
    "test:performance": "jest tests/performance",
    "test:coverage": "jest --coverage",
    "test:watch": "jest --watch",
    "test:ci": "jest --ci --coverage --watchAll=false"
  }
}
```

---

## 📊 Test Coverage Requirements

### Coverage Thresholds
```javascript
// jest.config.js
module.exports = {
  collectCoverageFrom: [
    'src/**/*.{ts,js}',
    '!src/**/*.d.ts',
    '!src/types/**/*'
  ],
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    },
    './src/handlers/': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    },
    './src/services/': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
```

### Quality Gates
- **Unit Test Coverage**: Minimum 85% overall
- **Handler Coverage**: Minimum 90% (critical business logic)
- **Integration Test Coverage**: All AWS service interactions
- **Security Test Coverage**: All input validation and authentication
- **E2E Test Coverage**: All primary user workflows

---

## 🛠️ Test Utilities and Helpers

### Mock Factories
```typescript
// tests/helpers/mockEvents.ts
import { APIGatewayProxyEvent } from 'aws-lambda';

export const mockAPIGatewayProxyEvent = (overrides: Partial<APIGatewayProxyEvent> = {}): APIGatewayProxyEvent => ({
  resource: '/data-subject-requests',
  path: '/data-subject-requests',
  httpMethod: 'POST',
  headers: {},
  multiValueHeaders: {},
  queryStringParameters: null,
  multiValueQueryStringParameters: null,
  pathParameters: null,
  stageVariables: null,
  requestContext: {
    resourceId: 'test',
    resourcePath: '/data-subject-requests',
    httpMethod: 'POST',
    requestId: 'test-request-id',
    protocol: 'HTTP/1.1',
    stage: 'test',
    domainName: 'test.example.com',
    path: '/test/data-subject-requests',
    // ... other required fields
  } as any,
  body: null,
  isBase64Encoded: false,
  ...overrides
});
```

### Test Data Fixtures
```typescript
// tests/fixtures/dsrRequests.ts
export const validDSRRequest = {
  email: 'test@example.com',
  type: 'gdpr_delete' as const,
  regulation: 'GDPR'
};

export const mockDSRResponse = {
  id: 'test-dsr-123',
  status: 'submitted' as const,
  email: 'test@example.com',
  type: 'gdpr_delete' as const,
  submittedAt: '2024-01-15T10:30:00Z'
};
```

---

## 📋 Testing Checklist

### Before Deployment
- [ ] All unit tests passing
- [ ] Integration tests with real AWS services passing
- [ ] Security tests validating all inputs
- [ ] Performance tests meeting SLA requirements
- [ ] Code coverage above threshold
- [ ] No high-severity security vulnerabilities

### Regular Testing
- [ ] Weekly full test suite execution
- [ ] Monthly security test review
- [ ] Quarterly performance benchmark validation
- [ ] Annual penetration testing (external)

### Test Maintenance
- [ ] Test data cleanup after each run
- [ ] Mock services properly isolated
- [ ] Test environments consistently configured
- [ ] Test documentation kept up-to-date
