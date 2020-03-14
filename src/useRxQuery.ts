import { useEffect, useCallback, useReducer, Reducer } from 'react';
import { RxQuery, RxDocument, isRxQuery } from 'rxdb';

interface RxState<T> {
	result: T[] | RxDocument<T>[];
	isFetching: boolean;
	exhausted: boolean;
	limit: number;
}

export interface RxQueryResult<T> {
	result: T[] | RxDocument<T>[];
	isFetching: boolean;
	exhausted: boolean;
	fetchMore: () => void;
	resetList: () => void;
}

export interface RxQueryResultJSON<T> extends RxQueryResult<T> {
	result: T[];
}

export interface RxQueryResultDoc<T> extends RxQueryResult<T> {
	result: RxDocument<T>[];
}

export interface UseRxQueryOptions {
	pageSize?: number;
	sortBy?: string;
	sortOrder?: 'asc' | 'desc';
	json?: boolean;
}

enum ActionType {
	Reset = 'Reset',
	FetchMore = 'FetchMore',
	FetchSuccess = 'FetchSuccess',
}

interface ResetAction {
	type: ActionType.Reset;
	pageSize: number;
}

interface FetchMoreAction {
	type: ActionType.FetchMore;
	pageSize: number;
}

interface FetchSuccessAction<T> {
	type: ActionType.FetchSuccess;
	docs: T[];
}

type AnyAction<T> = ResetAction | FetchMoreAction | FetchSuccessAction<T>;

const reducer = <T>(state: RxState<T>, action: AnyAction<T>): RxState<T> => {
	switch (action.type) {
		case ActionType.Reset:
			return {
				...state,
				result: [],
				isFetching: true,
				limit: action.pageSize,
			};
		case ActionType.FetchMore:
			return {
				...state,
				isFetching: true,
				limit: state.limit + action.pageSize,
			};
		case ActionType.FetchSuccess:
			return {
				...state,
				result: action.docs,
				isFetching: false,
				exhausted: !state.limit || action.docs.length < state.limit,
			};
	}
};

function useRxQuery<T>(query: RxQuery): RxQueryResultDoc<T>;

function useRxQuery<T>(
	query: RxQuery,
	options?: UseRxQueryOptions & { json?: false }
): RxQueryResultDoc<T>;

function useRxQuery<T>(
	query: RxQuery,
	options?: UseRxQueryOptions & { json: true }
): RxQueryResultJSON<T>;

/**
 * Subscribes to specified query and provides results, also providing:
 *  - state indicators for fetching and list depletion
 *  - a fetchMore callback function for pagination support
 *  - a resetList callback function for conveniently reseting list data
 */
function useRxQuery<T>(
	query: RxQuery,
	options: UseRxQueryOptions = {}
): RxQueryResult<T> {
	const { pageSize = 0, sortBy, sortOrder = 'desc', json } = options;

	const initialState = {
		result: [],
		limit: pageSize,
		isFetching: true,
		exhausted: false,
	};

	const [state, dispatch] = useReducer<Reducer<RxState<T>, AnyAction<T>>>(
		reducer,
		initialState
	);

	const { result, limit, isFetching, exhausted } = state;

	const fetchMore = useCallback(() => {
		if (!limit || isFetching || exhausted) {
			return;
		}
		dispatch({ type: ActionType.FetchMore, pageSize });
	}, [limit, isFetching, exhausted, pageSize]);

	const resetList = useCallback(() => {
		if (!limit || limit <= pageSize) {
			return;
		}
		dispatch({ type: ActionType.Reset, pageSize });
	}, [pageSize, limit]);

	useEffect(() => {
		if (!isRxQuery(query)) {
			return;
		}

		if (limit) {
			query = query.limit(limit);
		}

		if (sortBy) {
			query = query.sort({
				[sortBy]: sortOrder,
			});
		}

		const sub = query.$.subscribe(
			(documents: RxDocument<T>[] | RxDocument<T>) => {
				const docs = Array.isArray(documents) ? documents : [documents];
				dispatch({
					type: ActionType.FetchSuccess,
					docs: json ? docs.map(doc => doc.toJSON()) : docs,
				});
			}
		);

		return (): void => {
			sub.unsubscribe();
		};
	}, [query, limit, sortBy, sortOrder]);

	return {
		result,
		isFetching,
		exhausted,
		fetchMore,
		resetList,
	};
}

export default useRxQuery;
