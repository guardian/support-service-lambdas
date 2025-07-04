import type {
    APIGatewayProxyEvent,
    APIGatewayProxyResult,
    Context,
    Handler,
    S3Event,
} from 'aws-lambda';
import { httpRouter } from './routers/http';

// Type guard to check if event is API Gateway
function isAPIGatewayEvent(event: any): event is APIGatewayProxyEvent {
    return event &&
        typeof event.httpMethod === 'string' &&
        typeof event.path === 'string';
}

// Type guard to check if event is S3
function isS3Event(event: any): event is S3Event {
    return event &&
        event.Records &&
        Array.isArray(event.Records) &&
        event.Records.length > 0 &&
        event.Records[0].eventSource === 'aws:s3';
}

// HTTP handler function
async function handleHttpRequest(
    event: APIGatewayProxyEvent,
    context: Context
): Promise<APIGatewayProxyResult> {
    try {
        // Your HTTP routing logic here
        return httpRouter.routeRequest(event);
    } catch (error) {
        console.error('HTTP handler error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Internal server error' })
        };
    }
}

// S3 event handler function
async function handleS3Event(
    event: S3Event,
    context: Context
): Promise<void> {
    try {
        // Your S3 event processing logic here
        for (const record of event.Records) {
            const bucketName = record.s3.bucket.name;
            const objectKey = record.s3.object.key;

            console.log(`Processing S3 object: ${objectKey} from bucket: ${bucketName}`);

            // Add your S3 processing logic here
            // Example: process file, trigger other services, etc.
        }
    } catch (error) {
        console.error('S3 handler error:', error);
        throw error; // Re-throw to trigger Lambda retry mechanism
    }
}

export const handler: Handler = async (
    event: APIGatewayProxyEvent | S3Event | any,
    context: Context
): Promise<APIGatewayProxyResult | void> => {
    console.log('Event received:', JSON.stringify(event, null, 2));

    if (isAPIGatewayEvent(event)) {
        console.log('Processing as API Gateway event');
        return handleHttpRequest(event, context);
    }
    else if (isS3Event(event)) {
        console.log('Processing as S3 event');
        return handleS3Event(event, context);
    }
    else {
        // Handle other event types or unknown events
        console.error('Unknown event type:', event);

        // If it might be an HTTP event without proper structure, try to handle gracefully
        if (event.httpMethod || event.path) {
            console.log('Attempting to process as malformed API Gateway event');
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Malformed API Gateway event' })
            };
        }

        throw new Error(`Unsupported event type: ${typeof event}`);
    }
};