import { pickKeys } from '@modules/objectFunctions';
import type { ZodType, ZodTypeDef } from 'zod';
import { z } from 'zod';
import type {
	ExpandRegistryEntry,
	ObjectQueryExpandRegistry,
	ObjectQueryFieldRegistry,
} from '@modules/zuora/objectQuery/queries/types';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';

export type ObjectQueryFilterObject<F extends string> = {
	field: F | `${string}__c`;
	operator: 'EQ' | 'NE' | 'GT' | 'GE' | 'LT' | 'LE' | 'SW' | 'IN';
	value: string;
};

export type ObjectQuerySortObject<F extends string> = {
	field: F;
	direction: 'ASC' | 'DESC';
};

export const objectQueryResponseSchema = <T>(
	itemSchema: z.ZodType<T, ZodTypeDef, unknown>,
): ZodType<{ nextPage: string | null; data: T[] }, ZodTypeDef, unknown> =>
	z.object({
		nextPage: z.string().nullable(),
		data: z.array(itemSchema),
	});

/** Distributes a union of object types into their intersection. */
type UnionToIntersection<U> = (
	U extends unknown ? (x: U) => void : never
) extends (x: infer I) => void
	? I
	: never;

/**
 * The zod shape produced by merging the selected expand entries. Each entry is
 * already a `{ responseKey: schema }` fragment, so the shape is simply the
 * intersection of the selected entries.
 */
type ExpandShape<
	TRegistry extends Record<string, ExpandRegistryEntry>,
	TExpands extends keyof TRegistry,
> = UnionToIntersection<TRegistry[TExpands]>;

/** The responseKey(s) that a given expand entry maps to (its object key). */
type ResponseKeyOf<
	TRegistry extends Record<string, ExpandRegistryEntry>,
	E extends keyof TRegistry,
> = E extends keyof TRegistry ? keyof TRegistry[E] : never;

/** Branded error surfaced when duplicate responseKeys are detected. */
type HasDuplicateResponseKey = {
	__error: 'Two expand keys map to the same responseKey - remove the redundant one';
};

/** True when key `K`'s responseKey is also produced by another chosen key. */
type KeyHasResponseKeyTwin<
	TRegistry extends Record<string, ExpandRegistryEntry>,
	TAll extends keyof TRegistry,
	K extends keyof TRegistry,
> = [Exclude<TAll, K>] extends [never]
	? false
	: ResponseKeyOf<TRegistry, K> extends ResponseKeyOf<
				TRegistry,
				Exclude<TAll, K>
		  >
		? true
		: false;

/**
 * Homomorphic mapped type over the chosen expand-key tuple. Each element keeps
 * its literal key type unless its responseKey collides with another chosen key,
 * in which case the element type becomes `HasDuplicateResponseKey` so the
 * offending array entry fails to type-check exactly at the call site. Being
 * homomorphic over the tuple (`[I in keyof TKeys]`), it preserves inference of
 * the chosen keys.
 */
type DoesNotHaveDuplicateResponseKey<
	TRegistry extends Record<string, ExpandRegistryEntry>,
	TKeys extends ReadonlyArray<keyof TRegistry>,
> = {
	[I in keyof TKeys]: KeyHasResponseKeyTwin<
		TRegistry,
		TKeys[number],
		Extract<TKeys[I], keyof TRegistry>
	> extends true
		? HasDuplicateResponseKey
		: TKeys[I];
};

/** Merges the selected expand entries into a single zod shape fragment. */
export function pickExpands<
	TRegistry extends Record<string, ExpandRegistryEntry>,
	TExpands extends keyof TRegistry,
>(
	registry: TRegistry,
	keys: readonly TExpands[],
): ExpandShape<TRegistry, TExpands> {
	// eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- merging the selected single-key entry objects yields exactly their intersection
	return Object.assign({}, ...keys.map((k) => registry[k])) as ExpandShape<
		TRegistry,
		TExpands
	>;
}

/**
 * Auto complete/type checker friendly object query builder.
 *
 * Use object "objectQuery" in ./index.ts to actually run your own queries
 */
export class ObjectQueryBuilder<
	TFieldRegistry extends ObjectQueryFieldRegistry,
	TExpandRegistry extends ObjectQueryExpandRegistry,
	const TQueryField extends string,
> {
	constructor(
		private readonly objectType: string,
		private readonly fieldRegistry: TFieldRegistry,
		private readonly expandRegistry: TExpandRegistry,
		// eslint-disable-next-line @typescript-eslint/no-unused-vars -- just needed for type checking/auto complete for filter and sort
		queryableFields: readonly TQueryField[],
	) {}

	/**
	 * this builds the schema for a given  in a type safe way.
	 * @param fields
	 * @param expand
	 */
	buildItemSchema<
		TFields extends keyof TFieldRegistry,
		const TExpandKeys extends ReadonlyArray<keyof TExpandRegistry>,
	>(
		fields: readonly TFields[],
		expand: TExpandKeys &
			DoesNotHaveDuplicateResponseKey<TExpandRegistry, NoInfer<TExpandKeys>>,
	) {
		return z.object(
			Object.assign(
				{},
				pickKeys(this.fieldRegistry, fields),
				pickExpands(this.expandRegistry, expand),
			),
		);
	}

	/**
	 * build and run the actual query for this object type.
	 * @param zuoraClient
	 * @param fields
	 * @param expand
	 * @param filter
	 * @param pageSize
	 * @param cursor
	 * @param sort
	 */
	async execute<
		TFields extends keyof TFieldRegistry,
		const TExpandKeys extends ReadonlyArray<keyof TExpandRegistry>,
	>(
		zuoraClient: ZuoraClient,
		fields: readonly TFields[],
		expand: TExpandKeys &
			DoesNotHaveDuplicateResponseKey<TExpandRegistry, NoInfer<TExpandKeys>>,
		filter: Array<ObjectQueryFilterObject<TQueryField>>,
		pageSize: number,
		cursor?: string,
		sort?: Array<ObjectQuerySortObject<TQueryField>>,
	) {
		const itemSchema = this.buildItemSchema<TFields, TExpandKeys>(
			fields,
			expand,
		);
		const schema = objectQueryResponseSchema(itemSchema);

		const params = new URLSearchParams();
		params.set('pageSize', String(pageSize));
		for (const field of fields) {
			params.append('fields[]', String(field));
		}
		for (const expandKey of expand) {
			params.append('expand[]', String(expandKey));
		}
		for (const f of filter) {
			params.append('filter[]', `${f.field}.${f.operator}:${f.value}`);
		}
		if (sort !== undefined) {
			for (const s of sort) {
				params.append('sort[]', `${s.field}.${s.direction}`);
			}
		}
		if (cursor !== undefined) {
			params.set('cursor', cursor);
		}

		params.set('includeNullFields', 'true');

		const path = `/object-query/${this.objectType}`;

		return await zuoraClient.get(path, schema, params);
	}
}
