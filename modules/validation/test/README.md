# Validation Module Test Documentation

This directory contains comprehensive tests for the validation module to ensure reliability, performance, and integration compatibility across the lambda handlers ecosystem.

## Test Structure

### 1. Core Functionality Tests (`validation.test.ts`)
Tests the basic functionality of both `validateInput` and `validateInputSafe` functions:

- **Basic validation scenarios**: Valid and invalid inputs
- **Error handling**: Custom error messages, null/undefined inputs
- **Complex schema validation**: Nested objects, arrays, enums
- **String validation**: Min/max length, format validation
- **Transform and defaults**: Data transformation and default value handling
- **Type safety**: Ensuring TypeScript type inference works correctly

**Coverage**: 29 tests covering all core functionality with 100% code coverage.

### 2. Performance Tests (`performance.test.ts`)
Validates that the validation functions perform well under load:

- **Simple schema validation**: 1000 iterations should complete under 100ms
- **Complex schema validation**: 100 iterations should complete under 100ms
- **Error handling performance**: 500 error cases should complete under 100ms
- **Memory stability**: 10,000 validations without memory leaks

**Coverage**: 6 tests focusing on performance characteristics.

### 3. Integration Tests (`integration.test.ts`)
Demonstrates real-world usage patterns in lambda handlers:

- **API Gateway events**: Validating HTTP request structures
- **SQS events**: Validating message queue event structures
- **Error handling patterns**: Graceful error responses
- **Safe validation patterns**: Using fallback configurations
- **Real-world schemas**: User registration, payment processing

**Coverage**: 8 tests showing practical lambda handler integration.

## Running Tests

```bash
# Run all tests
pnpm --filter validation test

# Run with coverage report
pnpm --filter validation run test:coverage

# Run in watch mode for development
pnpm --filter validation run test:watch
```

## Test Results Summary

- **Total Tests**: 43 tests across all test suites
- **Code Coverage**: 100% statement, branch, function, and line coverage
- **Performance**: All performance benchmarks passing
- **Integration**: All real-world lambda patterns validated

## Testing Philosophy

1. **Comprehensive Coverage**: Every function, branch, and edge case is tested
2. **Performance Validation**: Ensures the module doesn't introduce latency
3. **Real-world Scenarios**: Tests mirror actual lambda handler usage patterns
4. **Type Safety**: Validates TypeScript integration and type inference
5. **Error Handling**: Thorough testing of error conditions and messages

## Adding New Tests

When adding new functionality to the validation module:

1. Add unit tests to `validation.test.ts` for new functions
2. Add performance tests to `performance.test.ts` if performance-critical
3. Add integration tests to `integration.test.ts` for new usage patterns
4. Ensure 100% test coverage is maintained
5. Update this documentation

## Test Data

The tests use a variety of schemas to validate different use cases:

- **Simple schemas**: Basic object validation
- **Complex nested schemas**: Multi-level object validation with optional fields
- **Array schemas**: Validation of arrays and array items
- **String schemas**: Length and format validation
- **Transform schemas**: Data transformation and default values
- **Real-world schemas**: Actual lambda event structures

Each test is designed to be independent and can run in any order.
