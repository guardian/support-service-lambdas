// test-local.ts
import type {
    APIGatewayProxyEvent,
    APIGatewayProxyEventHeaders,
    Callback,
    Context
} from 'aws-lambda';
import { handler } from './src/index';

const run = async ({
    httpMethod,
    path,
    body,
    headers
}: {
    httpMethod: 'GET' | 'POST';
    path: string;
    body?: string;
    headers?: APIGatewayProxyEventHeaders;
}) => {
    const result: unknown = await handler({
        httpMethod,
        path,
        body,
        headers
    } as APIGatewayProxyEvent, {} as Context, (() => { }) as Callback<unknown>);
    return result;
}
// run({
//     httpMethod: 'GET',
//     path: '/data-subject-requests/38689d80-4ae9-40f8-a628-b41077e3d62c'
// })
// run({
//     httpMethod: 'POST',
//     path: '/events',
//     body: JSON.stringify({
//         events: [
//             {
//                 data: {
//                 },
//                 eventType: "commerce_event"
//             }
//         ],
//         deviceInfo: {},
//         userAttributes: {},
//         deletedUserAttributes: [],
//         userIdentities: {},
//         applicationInfo: {},
//         schemaVersion: 2,
//         environment: "production",
//         context: {},
//         ip: "172.217.12.142"
//     })
// })
run({
    httpMethod: 'POST',
    path: '/data-subject-requests/4d9b1dbf-6d1b-4932-a1e0-dc74d21b9092/callback',
    body: JSON.stringify({
        "controller_id": "1402",
        "expected_completion_time": "2025-06-09T00:00:00Z",
        "status_callback_url": "https://webhook.site/6dfd0447-e1f9-4a98-a391-25481898763b",
        "subject_request_id": "475974fa-6b42-4370-bb56-b5d845686bb5",
        "request_status": "completed",
        "results_url": null,
        "extensions": null
    }),
    headers:
    {
        "x-opendsr-processor-domain": "opendsr.mparticle.com",
        "x-opendsr-signature": "q/zaWUW4dJYXo7Bu9NR0AkkwbS/lnab2cQ/6hxuhNw/8xnljzjXB3jJhUM7UTr5+KZZ5/delbtAKVNPXLAGZ7DoeWMnWwYeyq3Pzw4l5wugg3YtFLS5o0MRlGye6Vj0UH2c/T8vQ87/KNl5hYrhYqrZvNb+f+gL9eSZ80lQwMu27fVSrnh7yztNLHLP593kV9oq1QBXQqf8yRVGy7fcFieNHtgYAuKFJeDkCwx7e4ismhKNkfM8Xlt6TEdR8dAwB6TVbz3W7bk4dTUKQrAVX84js4V5Sphj+vUBT/NATel6HYlkSsOk10HLjbaM2BwQtd51rD6ex9VbtpP0G8mHDVw==",
    }
})
    .then((response) => console.log(response))
    .catch((err) => console.error(err));