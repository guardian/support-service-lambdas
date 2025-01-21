import { getSub } from '../zuoraHttp';

export const handler = async () => {
	try {
		//sub name will be passed in via json path in state machine
		const subName = process.env.SUB_NAME ?? 'A-S00954053';

		const getSubResponse = await getSub(subName);

		return {
			status: getSubResponse.status,
		};
	} catch (error) {
		throw new Error(
			`Error retrieving sub from Zuora: ${JSON.stringify(error)}`,
		);
	}
};
