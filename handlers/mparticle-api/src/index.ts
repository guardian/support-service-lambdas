import type {
    APIGatewayProxyEvent,
    APIGatewayProxyResult,
    Context,
    Handler,
} from 'aws-lambda';
import { httpRouter } from './routers/http';
import { BatonRerEventRequest } from './routers/baton';

// Type guard to check if event is API Gateway
function isAPIGatewayEvent(event: any): event is APIGatewayProxyEvent {
    return event &&
        typeof event.httpMethod === 'string' &&
        typeof event.path === 'string';
}

// Type guard to check if event is Baton RER
function isBatonRerEvent(event: any): event is BatonRerEventRequest {
    return event &&
        event.requestType &&
        event.requestType.toUpperCase() === "RER"
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

// Baton RER event handler function
async function handleBatonRerEvent(
    event: BatonRerEventRequest,
    context: Context
): Promise<void> {
    try {
        console.log(`Processing Baton RER event`, event);

    } catch (error) {
        console.error('Baton RER handler error:', error);
        throw error; // Re-throw to trigger Lambda retry mechanism
    }
}

export const handler: Handler = async (
    event: APIGatewayProxyEvent | BatonRerEventRequest | any,
    context: Context
): Promise<APIGatewayProxyResult | void> => {
    if (isAPIGatewayEvent(event)) {
        console.debug('Processing as API Gateway event');
        return handleHttpRequest(event, context);
    }
    else if (isBatonRerEvent(event)) {
        console.debug('Processing as Baton RER event');
        return handleBatonRerEvent(event, context);
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