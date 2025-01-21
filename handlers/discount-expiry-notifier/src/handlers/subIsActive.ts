import { getSub } from "../zuoraHttp";

export const handler = async () => {
	try {
        const subName = process.env.SUB_NAME ?? "A-S00954053";

        console.log("subName:", subName);

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