// test-local.ts
import type {
    APIGatewayProxyEvent,
    Callback,
    Context
} from 'aws-lambda';
import { handler } from './src/index';

const run = async ({
    httpMethod,
    path
}: {
    httpMethod: 'GET' | 'POST';
    path: string;
}) => {
    const result: unknown = await handler({
        httpMethod,
        path
    } as APIGatewayProxyEvent, {} as Context, (() => { }) as Callback<unknown>);
    return result;
}
run({
    httpMethod: 'GET',
    path: '/requests/as123'
})
    .then((response) => console.log(response))
    .catch((err) => console.error(err));


