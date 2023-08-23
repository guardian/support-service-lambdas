export const main = async (): Promise<string> => {
	const message = "hello world";
	console.debug(message);
	return Promise.resolve(message);
};