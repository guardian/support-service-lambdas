import { z } from 'zod';

export async function doZuoraAuth(url: string, data: ZuoraAuth): Promise<string> {
	console.log('authenticating with Zuora...');
    const req = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: JSON.stringify(data)//new URLSearchParams(data as any).toString(),  // Convert data to URL-encoded string
    };

    try {
        const response = await fetch(url, req);
		console.log('response:', JSON.stringify(response));

        if (!response.ok) {
            throw new Error(`Error retrieving access token from Zuora: ${JSON.stringify(response)}`);
        }

        const responseData = await response.json() as ZuoraAuthResponse;
		console.log('responseData:', JSON.stringify(responseData));

        return responseData.access_token;
    } catch (error) {
        throw new Error(`Error retrieving access token from Zuora: ${String(error)}`);
    }
}

export type ZuoraAuth = {
    client_id: string;
    client_secret: string;
    grant_type: 'client_credentials';
}

const ZuoraAuthResponseSchema = z.object({
	access_token: z.string(),
});
type ZuoraAuthResponse = z.infer<typeof ZuoraAuthResponseSchema>;
