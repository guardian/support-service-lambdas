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

// Matches the quoted marker strings produced by makeRefReplacer, e.g. "@@REF_Object_1@@",
// and unwraps them into the unquoted `[Object@1] (back reference)` form.
const backReferencePattern = /"@@REF_(\w+)_(\d+)@@"/g;
const unwrapBackReferences = (s: string) =>
	s.replace(backReferencePattern, '[$1@$2] (back reference)');

function objectToPrettyString(object: unknown) {
	try {
		const jsonString = unwrapBackReferences(
			JSON.stringify(object, makeRefReplacer())
				.replace(/"([A-Za-z0-9]+)":/g, ' $1: ') // Remove quotes around keys
				.replace(/}$/, ' }'),
		);
		if (jsonString.length <= 80) {
			return jsonString;
		}
		return unwrapBackReferences(
			JSON.stringify(object, makeRefReplacer(), 2).replace(
				/"([A-Za-z0-9]+)":/g,
				'$1:',
			),
		);
	} catch (e) {
		console.error('caught error when trying to serialise log line', e);
		return String(object);
	}
}

export function makeRefReplacer(): (key: string, value: unknown) => unknown {
	const seen = new Map<object, number>();
	let nextIndex = 1;

	return (_key: string, value: unknown): unknown => {
		if (value !== null && typeof value === 'object') {
			const existingIndex = seen.get(value);
			if (existingIndex !== undefined) {
				const type = value.constructor.name || 'Object';
				return `@@REF_${type}_${existingIndex}@@`;
			}
			seen.set(value, nextIndex++);
		}
		return value;
	};
}
