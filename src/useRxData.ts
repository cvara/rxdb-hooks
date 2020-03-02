/* eslint @typescript-eslint/camelcase: 0 */
import { useState, useEffect, useCallback } from 'react';
import { unstable_batchedUpdates } from 'react-dom';
import { RxCollection, RxQuery, isRxQuery, RxDocument } from 'rxdb';
import useRxCollection from './useRxCollection';

interface RxData<T> {
	result: T[];
	isFetching: boolean;
	exhausted: boolean;
	fetchMore: () => void;
	resetList: () => void;
}

interface UseRxDataOptions {
	pageSize?: number;
	sort?: string;
}

const useRxData = <T>(
	collectionName: string,
	queryConstructor?: (collection: RxCollection<T>) => RxQuery<T>,
	{ pageSize = 0, sort }: UseRxDataOptions = {}
): RxData<T> => {
	const collection = useRxCollection<T>(collectionName);

	const [result, setResult] = useState<T[]>([]);
	const [limit, setLimit] = useState<number>(pageSize);
	// absorbs initial delay until collection becomes available
	const [isFetching, setIsFetching] = useState(true);
	const [exhausted, setExhausted] = useState(true);

	const fetchMore = useCallback(() => {
		// avoid increasing the limit again in the midst of a pending query
		if (!limit || isFetching) {
			return;
		}
		setIsFetching(true);
		setLimit(prevLimit => prevLimit + pageSize);
	}, [limit, isFetching]);

	const resetList = useCallback(() => {
		if (limit && limit > pageSize) {
			setResult([]);
			setIsFetching(true);
			setLimit(pageSize);
		}
	}, [pageSize, limit]);

	useEffect(() => {
		if (!collection || typeof queryConstructor !== 'function') {
			return;
		}
		// build query
		let query = queryConstructor(collection);
		if (!isRxQuery(query)) {
			return;
		}
		if (limit) {
			query = query.limit(limit);
		}
		if (sort) {
			const [sortBy, sortOrder = 'desc'] = (sort || '').split('|');
			query = query.sort({
				[sortBy]: sortOrder,
			});
		}
		// subscribe to query, updating state
		const sub = query.$.subscribe(
			(documents: RxDocument<T>[] | RxDocument<T>) => {
				// make sure an array is always returned
				const docs = (Array.isArray(documents)
					? documents
					: [documents]
				).map(doc => doc.toJSON());

				unstable_batchedUpdates(() => {
					setResult(docs);
					setIsFetching(false);
					setExhausted(docs.length < limit);
				});
			}
		);
		return (): void => {
			sub.unsubscribe();
		};
	}, [queryConstructor, collection, limit, sort]);

	return {
		result,
		isFetching,
		exhausted,
		fetchMore,
		resetList,
	};
};

export default useRxData;
