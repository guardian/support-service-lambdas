import type { Handler } from 'aws-lambda';

interface SpendPayload {
	spend: number;
}

export const handler: Handler<SpendPayload, SpendPayload> = (event) => {
	console.log(event);
};
