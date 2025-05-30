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
    path: '/data-subject-requests/38689d80-4ae9-40f8-a628-b41077e3d62c'
})
    .then((response) => console.log(response))
    .catch((err) => console.error(err));


