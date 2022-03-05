import { useMemo } from 'react';
import { RxCollection } from 'rxdb';
import { Override } from './type.helpers';
import useRxCollection from './useRxCollection';
import useRxQuery, {
	UseRxQueryOptions,
	RxQueryResult,
	RxQueryResultJSON,
	RxQueryResultDoc,
	AnyRxQuery,
} from './useRxQuery';

export type QueryConstructor<T> = (
	collection: RxCollection<T>
) => AnyRxQuery<T> | undefined;

function useRxData<T>(
	collectionName: string,
	queryConstructor: QueryConstructor<T> | undefined
): RxQueryResultDoc<T>;

function useRxData<T>(
	collectionName: string,
	queryConstructor: QueryConstructor<T> | undefined,
	options?: Override<UseRxQueryOptions, { json?: false }>
): RxQueryResultDoc<T>;

function useRxData<T>(
	collectionName: string,
	queryConstructor: QueryConstructor<T> | undefined,
	options?: Override<UseRxQueryOptions, { json: true }>
): RxQueryResultJSON<T>;

/**
 * Convenience wrapper around useRxQuery that expects a collection name
 * & a query constructor function
 */
function useRxData<T>(
	collectionName: string,
	queryConstructor: QueryConstructor<T> | undefined,
	options: UseRxQueryOptions = {}
): RxQueryResult<T> {
	const collection = useRxCollection<T>(collectionName);

	const query = useMemo(() => {
		if (!collection || typeof queryConstructor !== 'function') {
			return null;
		}
		return queryConstructor(collection);
	}, [collection, queryConstructor]);

	// get around type-narrowing issue
	// TODO: find a better workaround
	return options.json
		? // eslint-disable-next-line react-hooks/rules-of-hooks
		  useRxQuery(query, { ...options, json: true })
		: // eslint-disable-next-line react-hooks/rules-of-hooks
		  useRxQuery(query, { ...options, json: false });
}

export default useRxData;
