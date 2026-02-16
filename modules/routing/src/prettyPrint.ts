export const prettyPrint = (value: unknown): string => {
	if (value === null || value === undefined) {
		return String(value);
	}
	if (value instanceof Error) {
		return (
			(value.stack ?? '') +
			'\n' +
			objectToPrettyString(value) +
			(value.cause ? '\nCaused by: ' + prettyPrint(value.cause) : '')
		);
	}
	if (typeof value === 'object' || Array.isArray(value)) {
		return objectToPrettyString(value);
	}
	// will be boolean | number | string | symbol | bigint | function
	// eslint-disable-next-line @typescript-eslint/no-base-to-string -- typescript limitation
	return String(value);
};

function objectToPrettyString(object: unknown) {
	try {
		const jsonString = JSON.stringify(object)
			.replace(/"([A-Za-z0-9]+)":/g, ' $1: ') // Remove quotes around keys
			.replace(/}$/, ' }');
		if (jsonString.length <= 80) {
			return jsonString;
		}
		return JSON.stringify(object, null, 2).replace(/"([A-Za-z0-9]+)":/g, '$1:');
	} catch (e) {
		console.error('caught error when trying to serialise log line', e);
		return String(object);
	}
}
