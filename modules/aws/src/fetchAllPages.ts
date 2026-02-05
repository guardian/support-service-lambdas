import { logger } from '@modules/routing/logger';

export type AWSPage<O> = {
	nextToken: string | undefined;
	thisPage: O[];
};

export async function fetchAllPages<O>(
	msg: string,
	doIt: (token?: string) => Promise<AWSPage<O>>,
): Promise<O[]> {
	async function readNextPage(
		token?: string,
		curPage: number = 1,
	): Promise<O[]> {
		const { thisPage, nextToken } = await doIt(token);
		if (nextToken === undefined) {
			logger.log(
				`${msg} page ${curPage}: got ${thisPage.length} items - all pages complete`,
			);
			return thisPage;
		}
		logger.log(
			`${msg} page ${curPage}: got ${thisPage.length} items - fetching next page`,
		);
		return [...thisPage, ...(await readNextPage(nextToken, curPage + 1))];
	}

	const allResults = await readNextPage();
	logger.log(`${msg} total returned: ${allResults.length}`);
	return allResults;
}
