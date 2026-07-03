import type { ZodType } from 'zod';
import { z } from 'zod';
import { mergeValues, pickKeys } from '@modules/objectFunctions';
import type { DoesNotHaveDuplicateResponseKey } from '@modules/zuora/objectQuery/doesNotHaveDuplicateResponseKey';
import type {
	ObjectQueryExpandRegistry,
	ObjectQueryFieldRegistry,
} from '@modules/zuora/objectQuery/queries/types';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';

/**
 * https://developer.zuora.com/docs/guides/expand-filter-fields-sort#using-filter-query-parameter
 */
export type ObjectQueryFilterObject<F extends string> = {
	field: F | `${string}__c`;
	operator: 'EQ' | 'NE' | 'GT' | 'GE' | 'LT' | 'LE' | 'SW' | 'IN';
	value: string;
};

/**
 * https://developer.zuora.com/docs/guides/expand-filter-fields-sort#using-sort-query-parameter
 */
export type ObjectQuerySortObject<F extends string> = {
	field: F;
	direction: 'ASC' | 'DESC';
};

export const objectQueryResponseSchema = <T>(
	itemSchema: z.ZodType<T>,
): ZodType<{ nextPage: string | null; data: T[] }> =>
	z.object({
		nextPage: z.string().nullable(),
		data: z.array(itemSchema),
	});

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
		const TFields extends keyof TFieldRegistry,
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
				mergeValues(pickKeys(this.expandRegistry, expand)),
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
		const TFields extends keyof TFieldRegistry,
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
