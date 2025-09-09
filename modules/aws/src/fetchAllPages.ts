export type AWSPage<O> = {
	nextToken: string | undefined;
	thisPage: O[];
};

export async function fetchAllPages<O>(
	doIt: (token?: string) => Promise<AWSPage<O>>,
): Promise<O[]> {
	async function readNextPage(token?: string): Promise<O[]> {
		const { thisPage, nextToken } = await doIt(token);
		if (nextToken === undefined) return thisPage;
		console.log('need to fetch next page', nextToken);
		return [...thisPage, ...(await readNextPage(nextToken))];
	}

	return await readNextPage();
}
