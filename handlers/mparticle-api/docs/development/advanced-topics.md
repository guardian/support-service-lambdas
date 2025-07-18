# Advanced Topics

This document covers advanced implementation patterns, performance optimization strategies, error handling approaches, and future enhancement considerations for the mParticle API Lambda.

## 🏗️ Architecture Patterns

### Dependency Injection Pattern

The mParticle API Lambda uses dependency injection to improve testability and maintainability:

```typescript
// src/services/ServiceContainer.ts
export class ServiceContainer {
  private static instance: ServiceContainer;
  private services: Map<string, any> = new Map();

  static getInstance(): ServiceContainer {
    if (!ServiceContainer.instance) {
      ServiceContainer.instance = new ServiceContainer();
    }
    return ServiceContainer.instance;
  }

  register<T>(key: string, service: T): void {
    this.services.set(key, service);
  }

  get<T>(key: string): T {
    const service = this.services.get(key);
    if (!service) {
      throw new Error(`Service ${key} not found`);
    }
    return service;
  }
}

// Service registration
const container = ServiceContainer.getInstance();
container.register('mparticleClient', new MParticleClient(apiKey, workspaceId));
container.register('dsrRepository', new DSRRepository(dynamoClient, tableName));
container.register('certificateValidator', new CertificateValidator());
```

### Repository Pattern

Database operations are abstracted through the repository pattern:

```typescript
// src/repositories/DSRRepository.ts
export interface IDSRRepository {
  create(dsr: DSRRequest): Promise<void>;
  getById(id: string): Promise<DSRRequest | null>;
  updateStatus(id: string, status: DSRStatus, metadata?: any): Promise<void>;
  findByEmail(email: string): Promise<DSRRequest[]>;
}

export class DSRRepository implements IDSRRepository {
  constructor(
    private dynamoClient: DynamoDBClient,
    private tableName: string
  ) {}

  async create(dsr: DSRRequest): Promise<void> {
    const item = this.toDynamoItem(dsr);
    await this.dynamoClient.send(new PutItemCommand({
      TableName: this.tableName,
      Item: item,
      ConditionExpression: 'attribute_not_exists(id)'
    }));
  }

  async getById(id: string): Promise<DSRRequest | null> {
    const result = await this.dynamoClient.send(new GetItemCommand({
      TableName: this.tableName,
      Key: { id: { S: id } }
    }));

    return result.Item ? this.fromDynamoItem(result.Item) : null;
  }

  // Additional methods...
}
```

### Circuit Breaker Pattern

Protect against external service failures with circuit breaker implementation:

```typescript
// src/utils/CircuitBreaker.ts
export class CircuitBreaker {
  private failureCount = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(
    private threshold = 5,
    private timeout = 60000,
    private resetTimeout = 30000
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.resetTimeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await Promise.race([
        fn(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), this.timeout)
        )
      ]);

      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.threshold) {
      this.state = 'OPEN';
    }
  }
}

// Usage in mParticle service
export class MParticleService {
  private circuitBreaker = new CircuitBreaker(5, 10000, 60000);

  async submitDSR(request: DSRRequest): Promise<DSRResponse> {
    return this.circuitBreaker.execute(async () => {
      const response = await axios.post('/dsr', request, {
        timeout: 5000,
        headers: { Authorization: `Bearer ${this.apiKey}` }
      });
      return response.data;
    });
  }
}
```

---

## ⚡ Performance Optimization

### Connection Pooling

Optimize HTTP connections to external services:

```typescript
// src/clients/HTTPClient.ts
import { Agent } from 'https';

export class OptimizedHTTPClient {
  private agent: Agent;

  constructor() {
    this.agent = new Agent({
      keepAlive: true,
      maxSockets: 50,
      maxFreeSockets: 10,
      timeout: 60000,
      freeSocketTimeout: 30000
    });
  }

  async request(options: RequestOptions): Promise<any> {
    return axios({
      ...options,
      httpsAgent: this.agent,
      timeout: 10000
    });
  }
}
```

### Caching Strategy

Implement intelligent caching for Parameter Store and certificate validation:

```typescript
// src/services/CachedParameterStore.ts
export class CachedParameterStore {
  private cache: Map<string, { value: string; expiry: number }> = new Map();
  private readonly TTL = 300000; // 5 minutes

  constructor(private parameterStore: ParameterStore) {}

  async getParameter(name: string): Promise<string> {
    const cached = this.cache.get(name);
    const now = Date.now();

    if (cached && cached.expiry > now) {
      return cached.value;
    }

    const value = await this.parameterStore.getParameter(name);
    this.cache.set(name, {
      value,
      expiry: now + this.TTL
    });

    return value;
  }

  invalidate(name?: string): void {
    if (name) {
      this.cache.delete(name);
    } else {
      this.cache.clear();
    }
  }
}
```

### Lambda Optimization

Optimize Lambda performance through proper initialization:

```typescript
// src/index.ts - Lambda handler optimization
import { warmupHandler } from './handlers/warmup';
import { ServiceContainer } from './services/ServiceContainer';

// Initialize services outside handler for reuse across invocations
let servicesInitialized = false;

async function initializeServices(): Promise<void> {
  if (servicesInitialized) return;

  const container = ServiceContainer.getInstance();
  
  // Lazy initialization of heavy services
  const parameterStore = new CachedParameterStore(new ParameterStore());
  const mparticleClient = new MParticleClient(
    await parameterStore.getMParticleAPIKey(),
    await parameterStore.getWorkspaceId()
  );

  container.register('parameterStore', parameterStore);
  container.register('mparticleClient', mparticleClient);
  
  servicesInitialized = true;
}

export const handler = async (event: any, context: any) => {
  // Handle Lambda warmup
  if (event.source === 'aws.events' && event['detail-type'] === 'Scheduled Event') {
    return warmupHandler(event, context);
  }

  await initializeServices();
  
  // Route to appropriate handler
  return routeHandler(event, context);
};
```

### Database Query Optimization

Optimize DynamoDB queries for better performance:

```typescript
// src/repositories/OptimizedDSRRepository.ts
export class OptimizedDSRRepository extends DSRRepository {
  // Use batch operations for multiple queries
  async getMultipleByIds(ids: string[]): Promise<DSRRequest[]> {
    const batchSize = 25; // DynamoDB batch limit
    const batches = this.chunkArray(ids, batchSize);
    
    const results = await Promise.all(
      batches.map(batch => this.getBatch(batch))
    );

    return results.flat();
  }

  private async getBatch(ids: string[]): Promise<DSRRequest[]> {
    const keys = ids.map(id => ({ id: { S: id } }));
    
    const result = await this.dynamoClient.send(new BatchGetItemCommand({
      RequestItems: {
        [this.tableName]: {
          Keys: keys
        }
      }
    }));

    return (result.Responses?.[this.tableName] || [])
      .map(item => this.fromDynamoItem(item));
  }

  // Use GSI for efficient email queries
  async findByEmailOptimized(email: string): Promise<DSRRequest[]> {
    const result = await this.dynamoClient.send(new QueryCommand({
      TableName: this.tableName,
      IndexName: 'EmailIndex',
      KeyConditionExpression: 'email = :email',
      ExpressionAttributeValues: {
        ':email': { S: email }
      },
      ScanIndexForward: false, // Latest first
      Limit: 50
    }));

    return (result.Items || []).map(item => this.fromDynamoItem(item));
  }
}
```

---

## 🚨 Advanced Error Handling

### Structured Error Types

Implement comprehensive error classification:

```typescript
// src/errors/DSRErrors.ts
export abstract class DSRError extends Error {
  abstract readonly code: string;
  abstract readonly statusCode: number;
  abstract readonly retryable: boolean;

  constructor(message: string, public readonly details?: any) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class ValidationError extends DSRError {
  readonly code = 'VALIDATION_ERROR';
  readonly statusCode = 400;
  readonly retryable = false;
}

export class MParticleAPIError extends DSRError {
  readonly code = 'MPARTICLE_API_ERROR';
  readonly statusCode = 502;
  readonly retryable = true;

  constructor(message: string, public readonly mparticleStatus?: number) {
    super(message);
  }
}

export class CertificateValidationError extends DSRError {
  readonly code = 'CERTIFICATE_VALIDATION_ERROR';
  readonly statusCode = 401;
  readonly retryable = false;
}

export class DatabaseError extends DSRError {
  readonly code = 'DATABASE_ERROR';
  readonly statusCode = 500;
  readonly retryable = true;
}
```

### Error Recovery Strategies

Implement automatic retry with exponential backoff:

```typescript
// src/utils/RetryHandler.ts
export class RetryHandler {
  static async withRetry<T>(
    operation: () => Promise<T>,
    options: {
      maxRetries?: number;
      baseDelay?: number;
      maxDelay?: number;
      retryCondition?: (error: any) => boolean;
    } = {}
  ): Promise<T> {
    const {
      maxRetries = 3,
      baseDelay = 1000,
      maxDelay = 10000,
      retryCondition = (error) => error instanceof DSRError && error.retryable
    } = options;

    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        if (attempt === maxRetries || !retryCondition(error)) {
          throw error;
        }

        const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
        const jitter = Math.random() * 0.1 * delay;
        
        await new Promise(resolve => setTimeout(resolve, delay + jitter));
      }
    }

    throw lastError!;
  }
}

// Usage in service layer
export class RobustMParticleService {
  async submitDSR(request: DSRRequest): Promise<DSRResponse> {
    return RetryHandler.withRetry(
      () => this.mparticleClient.submitDSR(request),
      {
        maxRetries: 3,
        retryCondition: (error) => 
          error.mparticleStatus >= 500 || error.code === 'NETWORK_ERROR'
      }
    );
  }
}
```

### Graceful Degradation

Implement fallback mechanisms for service failures:

```typescript
// src/services/FallbackService.ts
export class DSRServiceWithFallback {
  constructor(
    private primaryService: MParticleService,
    private fallbackQueue: SQSService,
    private notificationService: NotificationService
  ) {}

  async submitDSR(request: DSRRequest): Promise<DSRResponse> {
    try {
      return await this.primaryService.submitDSR(request);
    } catch (error) {
      // Log the primary service failure
      console.error('Primary mParticle service failed', { error, request });

      // Queue for later processing
      await this.fallbackQueue.sendMessage({
        type: 'DSR_RETRY',
        payload: request,
        originalError: error.message
      });

      // Notify monitoring systems
      await this.notificationService.sendAlert({
        severity: 'HIGH',
        message: 'mParticle service degraded, using fallback queue',
        context: { requestId: request.id }
      });

      // Return fallback response
      return {
        id: request.id,
        status: 'queued',
        message: 'Request queued for processing when service is restored'
      };
    }
  }
}
```

---

## 📊 Monitoring and Observability

### Custom Metrics and Tracing

Implement comprehensive observability:

```typescript
// src/observability/MetricsCollector.ts
export class MetricsCollector {
  private cloudWatch: CloudWatchClient;

  constructor() {
    this.cloudWatch = new CloudWatchClient({ region: process.env.AWS_REGION });
  }

  async recordDSRSubmission(type: string, success: boolean, duration: number): Promise<void> {
    const metrics = [
      {
        MetricName: 'DSRSubmissions',
        Dimensions: [
          { Name: 'Type', Value: type },
          { Name: 'Success', Value: success.toString() }
        ],
        Value: 1,
        Unit: 'Count'
      },
      {
        MetricName: 'DSRSubmissionDuration',
        Dimensions: [{ Name: 'Type', Value: type }],
        Value: duration,
        Unit: 'Milliseconds'
      }
    ];

    await this.cloudWatch.send(new PutMetricDataCommand({
      Namespace: 'MParticleAPI',
      MetricData: metrics
    }));
  }

  async recordCertificateValidation(success: boolean, errorType?: string): Promise<void> {
    const dimensions = [{ Name: 'Success', Value: success.toString() }];
    if (!success && errorType) {
      dimensions.push({ Name: 'ErrorType', Value: errorType });
    }

    await this.cloudWatch.send(new PutMetricDataCommand({
      Namespace: 'MParticleAPI',
      MetricData: [{
        MetricName: 'CertificateValidations',
        Dimensions: dimensions,
        Value: 1,
        Unit: 'Count'
      }]
    }));
  }
}
```

### Distributed Tracing

Implement request correlation across services:

```typescript
// src/tracing/RequestTracer.ts
export class RequestTracer {
  private static correlationId: string | null = null;

  static setCorrelationId(id: string): void {
    RequestTracer.correlationId = id;
  }

  static getCorrelationId(): string {
    return RequestTracer.correlationId || 'unknown';
  }

  static trace<T>(operation: string, fn: () => Promise<T>): Promise<T> {
    const startTime = Date.now();
    const correlationId = RequestTracer.getCorrelationId();

    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'INFO',
      operation: `${operation}_START`,
      correlationId
    }));

    return fn()
      .then(result => {
        console.log(JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'INFO',
          operation: `${operation}_SUCCESS`,
          correlationId,
          duration: Date.now() - startTime
        }));
        return result;
      })
      .catch(error => {
        console.log(JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'ERROR',
          operation: `${operation}_FAILURE`,
          correlationId,
          duration: Date.now() - startTime,
          error: error.message
        }));
        throw error;
      });
  }
}
```

---

## 🔮 Future Enhancements

### Planned Improvements

#### 1. GraphQL API Implementation
```typescript
// Future: GraphQL schema for more flexible queries
const typeDefs = `
  type DSRRequest {
    id: ID!
    email: String!
    type: DSRType!
    status: DSRStatus!
    submittedAt: DateTime!
    completedAt: DateTime
    downloadUrls: [String!]
  }

  enum DSRType {
    GDPR_DELETE
    CCPA_DELETE
    EXPORT
  }

  enum DSRStatus {
    SUBMITTED
    IN_PROGRESS
    COMPLETED
    FAILED
  }

  type Query {
    dsrRequest(id: ID!): DSRRequest
    dsrRequestsByEmail(email: String!): [DSRRequest!]!
  }

  type Mutation {
    submitDSR(input: DSRInput!): DSRRequest!
  }
`;
```

#### 2. Real-time Status Updates
```typescript
// Future: WebSocket support for real-time updates
export class RealTimeNotifier {
  private apiGatewayWS: ApiGatewayManagementApiClient;

  async notifyStatusUpdate(connectionId: string, update: DSRStatusUpdate): Promise<void> {
    await this.apiGatewayWS.send(new PostToConnectionCommand({
      ConnectionId: connectionId,
      Data: JSON.stringify(update)
    }));
  }
}
```

#### 3. Multi-Region Support
```typescript
// Future: Cross-region replication and failover
export class MultiRegionDSRService {
  constructor(
    private primaryRegion: string,
    private fallbackRegions: string[]
  ) {}

  async submitWithFailover(request: DSRRequest): Promise<DSRResponse> {
    try {
      return await this.submitToRegion(this.primaryRegion, request);
    } catch (error) {
      for (const region of this.fallbackRegions) {
        try {
          return await this.submitToRegion(region, request);
        } catch (fallbackError) {
          console.warn(`Failover to ${region} failed`, fallbackError);
        }
      }
      throw new Error('All regions failed');
    }
  }
}
```

#### 4. Machine Learning Integration
```typescript
// Future: ML-powered request classification and fraud detection
export class MLRequestAnalyzer {
  private sagemakerClient: SageMakerRuntimeClient;

  async analyzeRequest(request: DSRRequest): Promise<RequestAnalysis> {
    const response = await this.sagemakerClient.send(new InvokeEndpointCommand({
      EndpointName: 'dsr-fraud-detection',
      ContentType: 'application/json',
      Body: JSON.stringify({
        email: request.email,
        type: request.type,
        timestamp: request.submittedAt,
        userAgent: request.userAgent,
        ipAddress: request.sourceIp
      })
    }));

    return JSON.parse(response.Body?.toString() || '{}');
  }
}
```

### Technical Debt and Improvements

#### Code Quality Enhancements
- **TypeScript Strict Mode**: Enable strict mode for better type safety
- **API Versioning**: Implement semantic versioning for API endpoints
- **Documentation Generation**: Auto-generate API docs from code comments
- **Performance Benchmarking**: Establish performance regression testing

#### Security Enhancements
- **Zero Trust Architecture**: Implement comprehensive zero trust security
- **Certificate Pinning**: Pin to specific mParticle certificate fingerprints
- **Rate Limiting**: Implement application-level rate limiting
- **Audit Logging**: Enhanced audit trail with cryptographic integrity

#### Operational Improvements
- **Blue-Green Deployment**: Zero-downtime deployment strategy
- **Canary Releases**: Gradual rollout with automatic rollback
- **Chaos Engineering**: Resilience testing with controlled failures
- **Cost Optimization**: Right-sizing and resource optimization

---

## 🔧 Development Guidelines

### Code Standards

#### TypeScript Best Practices
```typescript
// Use strict typing
interface DSRRequest {
  readonly id: string;
  readonly email: string;
  readonly type: DSRType;
  readonly submittedAt: Date;
}

// Prefer composition over inheritance
class DSRService {
  constructor(
    private readonly mparticleClient: MParticleClient,
    private readonly repository: DSRRepository,
    private readonly metrics: MetricsCollector
  ) {}
}

// Use discriminated unions for error handling
type DSRResult = 
  | { success: true; data: DSRResponse }
  | { success: false; error: DSRError };
```

#### Error Handling Standards
- **Fail Fast**: Validate inputs early and comprehensively
- **Structured Errors**: Use typed error classes with consistent structure
- **Error Context**: Include relevant context for debugging
- **Recovery Strategies**: Implement appropriate retry and fallback logic

#### Testing Standards
- **Test Pyramid**: Unit tests (70%), Integration tests (20%), E2E tests (10%)
- **Test Coverage**: Minimum 85% coverage with focus on critical paths
- **Test Isolation**: Each test should be independent and idempotent
- **Performance Tests**: Include performance regression testing

### Documentation Standards

#### Code Documentation
```typescript
/**
 * Submits a Data Subject Request to mParticle for processing.
 * 
 * @param request - The DSR details including email and request type
 * @returns Promise resolving to the submitted request with tracking ID
 * @throws {ValidationError} When request data is invalid
 * @throws {MParticleAPIError} When mParticle service is unavailable
 * 
 * @example
 * ```typescript
 * const response = await submitDSR({
 *   email: 'user@example.com',
 *   type: 'gdpr_delete'
 * });
 * console.log(`Request submitted with ID: ${response.id}`);
 * ```
 */
export async function submitDSR(request: DSRRequest): Promise<DSRResponse> {
  // Implementation...
}
```

#### Architecture Decision Records (ADRs)
Document significant architectural decisions:

```markdown
# ADR-001: Use DynamoDB for DSR Request Storage

## Status
Accepted

## Context
Need to store DSR request metadata with fast read/write access patterns.

## Decision
Use DynamoDB with single-table design and GSI for email queries.

## Consequences
- Fast queries and updates
- Automatic scaling
- Higher cost than RDS for low volume
- Limited query flexibility
```

---

## 📈 Performance Benchmarks

### Target Performance Metrics
- **API Response Time**: P95 < 500ms
- **mParticle Integration**: P95 < 2000ms
- **Database Operations**: P95 < 100ms
- **Certificate Validation**: P95 < 200ms
- **Throughput**: 1000 requests/minute sustained

### Optimization Checklist
- [ ] Lambda memory allocation optimized
- [ ] Connection pooling implemented
- [ ] Parameter Store caching active
- [ ] DynamoDB queries optimized
- [ ] Circuit breakers configured
- [ ] Retry strategies implemented
- [ ] Monitoring and alerting active

This advanced documentation provides the foundation for scaling and enhancing the mParticle API Lambda while maintaining high standards of reliability, security, and performance.
