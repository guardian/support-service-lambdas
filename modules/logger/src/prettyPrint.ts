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
		const { replacer, resolveBackReferences } = makeRefReplacer();
		const jsonString = resolveBackReferences(
			JSON.stringify(object, replacer)
				.replace(/"([A-Za-z0-9]+)":/g, ' $1: ') // Remove quotes around keys
				.replace(/}$/, ' }'),
		);
		if (jsonString.length <= 80) {
			return jsonString;
		}
		const pretty = makeRefReplacer();
		return pretty.resolveBackReferences(
			JSON.stringify(object, pretty.replacer, 2).replace(
				/"([A-Za-z0-9]+)":/g,
				'$1:',
			),
		);
	} catch (e) {
		console.error('caught error when trying to serialise log line', e);
		return String(object);
	}
}

export function makeRefReplacer(): {
	replacer: (key: string, value: unknown) => unknown;
	resolveBackReferences: (jsonString: string) => string;
} {
	const seen = new Map<object, number>();
	let nextIndex = 1;
	const displayTextByPlaceholder = new Map<string, string>();
	// avoid real data colliding with the references
	const callNonce = Math.floor(Math.random() * 1e9).toString(36);

	const replacer = (_key: string, value: unknown): unknown => {
		if (value !== null && typeof value === 'object') {
			const existingIndex = seen.get(value);
			if (existingIndex !== undefined) {
				const type = value.constructor.name || 'Object';
				const placeholder = `${callNonce}_${displayTextByPlaceholder.size}`;
				displayTextByPlaceholder.set(
					placeholder,
					`[${type}@${existingIndex}] (back reference)`,
				);
				return placeholder;
			}
			seen.set(value, nextIndex++);
		}
		return value;
	};

	const resolveBackReferences = (jsonString: string) => {
		let result = jsonString;
		for (const [placeholder, displayText] of displayTextByPlaceholder) {
			result = result.split(`"${placeholder}"`).join(displayText);
		}
		return result;
	};

	return { replacer, resolveBackReferences };
}
