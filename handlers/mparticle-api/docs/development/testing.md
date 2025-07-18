# Testing Strategy

This document describes the existing unit tests for the mParticle API Lambda and provides guidance on using and extending them as new endpoints and features are added.

## 🧪 Current Testing Approach

The mParticle API Lambda uses **unit testing only** to ensure code quality and reliability. The test suite focuses on:
- Handler function validation
- Input schema validation
- Service layer logic
- Error handling scenarios

---

## 📁 Existing Test Structure

The current unit tests are organized as follows:

```
tests/
├── unit/
│   ├── handlers/
│   │   ├── httpRouter.test.ts       # HTTP endpoint tests
│   │   └── batonRouter.test.ts      # Baton integration tests
│   ├── services/
│   │   ├── mparticle.test.ts        # mParticle API client tests
│   │   └── validation.test.ts       # Certificate validation tests
│   └── schemas/
│       └── validation.test.ts       # Zod schema validation tests
├── fixtures/                        # Test data and mock responses
└── helpers/                         # Test utility functions
```

---

## 🎯 Existing Unit Tests

### HTTP Router Tests (`httpRouter.test.ts`)

Tests the HTTP endpoints that handle:
- DSR submission requests
- Status query requests  
- Callback processing from mParticle
- Event forwarding

**Key test scenarios:**
- Valid request processing
- Input validation errors
- Authentication failures
- mParticle API integration

### Baton Router Tests (`batonRouter.test.ts`)

Tests the Baton integration endpoints that handle:
- RER (Right to Erasure Request) initiation
- Status checking for ongoing requests
- Cross-account Lambda invocation

**Key test scenarios:**
- Valid Baton payloads
- Invalid correlation IDs
- Timeout handling
- Error propagation

### Service Layer Tests

#### mParticle Service (`mparticle.test.ts`)
Tests the mParticle API client service:
- DSR submission
- Status queries
- Error handling
- API authentication

#### Validation Service (`validation.test.ts`)
Tests certificate and signature validation:
- X.509 certificate parsing
- Certificate chain validation
- RSA signature verification
- Security edge cases

### Schema Validation Tests (`validation.test.ts`)

Tests Zod schemas for:
- Data Subject Request payloads
- Baton integration payloads
- Event data structures
- Input sanitization

---

## 🏃‍♂️ Running the Tests

### Basic Test Commands

```bash
# Run all unit tests
pnpm test

# Run tests with coverage report
pnpm test --coverage

# Run tests in watch mode for development
pnpm test --watch

# Run specific test file
pnpm test httpRouter.test.ts

# Run tests matching a pattern
pnpm test --testNamePattern="should handle valid DSR"
```

### Coverage Requirements

The test suite maintains:
- **85% minimum** overall code coverage
- **90% minimum** for handler functions (critical business logic)
- **80% minimum** for service layers

---

## 🔧 Extending Tests for New HTTP Endpoints

When adding new HTTP endpoints to the `httpRouter`, follow this pattern:

### 1. Add Handler Tests

```typescript
// In tests/unit/handlers/httpRouter.test.ts

describe('newEndpointHandler', () => {
  it('should process valid request', async () => {
    const event = mockAPIGatewayProxyEvent({
      httpMethod: 'POST',
      path: '/new-endpoint',
      body: JSON.stringify({
        // your request payload
      })
    });

    const result = await newEndpointHandler(event);

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toMatchObject({
      // expected response structure
    });
  });

  it('should handle validation errors', async () => {
    const event = mockAPIGatewayProxyEvent({
      body: JSON.stringify({
        // invalid payload
      })
    });

    const result = await newEndpointHandler(event);

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toMatchObject({
      error: {
        code: 'VALIDATION_ERROR',
        message: expect.any(String)
      }
    });
  });
});
```

### 2. Add Schema Tests

```typescript
// In tests/unit/schemas/validation.test.ts

describe('NewEndpointSchema', () => {
  it('should validate correct payload', () => {
    const validPayload = {
      // valid data structure
    };

    const result = NewEndpointSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it('should reject invalid data', () => {
    const invalidPayload = {
      // invalid data structure
    };

    const result = NewEndpointSchema.safeParse(invalidPayload);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(['fieldName']);
  });
});
```

---

## 🤖 Extending Tests for New Baton Features

When adding new Baton integration features, extend the `batonRouter.test.ts`:

### 1. Add Feature Tests

```typescript
// In tests/unit/handlers/batonRouter.test.ts

describe('newBatonFeature', () => {
  it('should handle new action type', async () => {
    const batonEvent = {
      action: 'new-action',
      payload: {
        correlationId: 'test-correlation-123',
        // additional payload data
      }
    };

    const result = await batonHandler(batonEvent);

    expect(result.success).toBe(true);
    expect(result.correlationId).toBe('test-correlation-123');
  });

  it('should validate required payload fields', async () => {
    const invalidEvent = {
      action: 'new-action',
      payload: {
        // missing required fields
      }
    };

    const result = await batonHandler(invalidEvent);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Missing required field');
  });
});
```

### 2. Mock External Dependencies

```typescript
// Mock mParticle API calls
jest.mock('../../../src/services/mparticle');
const mockMParticleService = MParticleService as jest.MockedClass<typeof MParticleService>;

beforeEach(() => {
  mockMParticleService.mockClear();
});
```

---

## 🛠️ Test Utilities and Helpers

### Using Mock Factories

The test suite includes helper functions for creating mock events:

```typescript
// tests/helpers/mockEvents.ts

// Create mock API Gateway event
const event = mockAPIGatewayProxyEvent({
  httpMethod: 'POST',
  path: '/your-endpoint',
  body: JSON.stringify({ data: 'test' })
});

// Create mock Baton event
const batonEvent = mockBatonEvent({
  action: 'your-action',
  payload: { correlationId: 'test-123' }
});
```

### Using Test Fixtures

Pre-defined test data is available in the fixtures directory:

```typescript
// tests/fixtures/
import { validDSRRequest, mockMParticleResponse } from '../fixtures/testData';

// Use in your tests
const response = await service.submitDSR(validDSRRequest);
expect(response).toMatchObject(mockMParticleResponse);
```

---

## � Testing Best Practices

### When Adding New Tests

1. **Follow existing patterns** - Use the same structure and naming conventions
2. **Test both success and failure cases** - Ensure error handling is covered
3. **Mock external dependencies** - Don't make real API calls in unit tests
4. **Use descriptive test names** - Make it clear what each test validates
5. **Keep tests focused** - Each test should validate one specific behavior

### Test Organization

- **Group related tests** using `describe` blocks
- **Use `beforeEach`** for common setup
- **Clean up mocks** between tests
- **Keep assertions simple** and focused

### Coverage Guidelines

- **All new handlers** must have comprehensive test coverage
- **All new schemas** must be validated with positive and negative test cases
- **Error scenarios** must be tested alongside happy paths
- **Edge cases** should be covered for critical business logic

---

## � Development Workflow

### Testing During Development

1. **Write tests first** (TDD approach) or alongside feature development
2. **Run tests frequently** using watch mode (`pnpm test --watch`)
3. **Check coverage** regularly to ensure adequate test coverage
4. **Fix failing tests** before committing code

### Before Deployment

Ensure all tests pass:
```bash
# Run full test suite
pnpm test

# Verify coverage meets requirements
pnpm test --coverage

# Check for any test warnings or errors
pnpm test --verbose
```

The CI/CD pipeline will automatically run all tests on every commit and block deployment if tests fail or coverage drops below the required threshold.
