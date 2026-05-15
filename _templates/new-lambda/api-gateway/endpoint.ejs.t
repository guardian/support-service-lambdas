---
# This template creates add file to contain endpoint logic

to: handlers/<%=lambdaName%>/src/endpoints.ts
sh: git add handlers/<%=lambdaName%>/src/endpoints.ts
---
import { z } from 'zod';

export const testRequestSchema = z.object({
    name: z.string(),
});

export const testResponseSchema = z.object({
    message: z.string(),
});

export type TestRequest = z.infer<typeof testRequestSchema>;

export function testRequestEndpoint(request: TestRequest): string {
    return `Hello, ${request.name}!`;
}