// Lambda handler for imovo-rewards
// Initial setup to validate deployment (Hello World)

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log('Hello World invoked!');

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Hello World from imovo-rewards!',
    }),
  };
};