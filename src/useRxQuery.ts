import { useEffect, useCallback, useReducer, Reducer } from 'react';
import { RxQuery, RxDocument, isRxQuery } from 'rxdb';
import { Override } from './type.helpers';
import { DeepReadonly } from 'rxdb/dist/types/types';
import { getCancelablePromise } from './helpers';

export type ResultMap<T> = Map<string, RxDocument<T, any>>;
export type AnyQueryResult<T> = DeepReadonly<T>[] | RxDocument<T>[];

export type RxQueryResult<T> = {
	/**
	 * Resulting documents.
	 */
	result: AnyQueryResult<T>;

	/**
	 * Indicates that fetching is in progress.
	 */
	isFetching: boolean;

	/**
	 * Indicates that all available results have been already fetched.
	 * Relevant in "infinite scroll" pagination mode
	 */
	isExhausted: boolean;

	/**
	 * Total number of pages, based on total number of results and page size.
	 * Relevant in "traditional" pagination mode
	 */
	pageCount: number;

	/**
	 * The number of the current page.
	 * Relevant in "infinite scroll" pagination mode
	 */
	currentPage: number;

	/**
	 * Allows consumer to request a specific page of results.
	 * Relevant in "traditional" pagination mode
	 */
	fetchPage: (page: number) => void;

	/**
	 * Allows consumer to incrementally request more results.
	 * Relevant in "infinite scroll" pagination mode
	 */
	fetchMore: () => void;

	/**
	 * Allows consumer to reset results.
	 * Relevant in "infinite scroll" pagination mode
	 */
	resetList: () => void;
};

export type RxQueryResultJSON<T> = Override<
	RxQueryResult<T>,
	{
		result: DeepReadonly<T>[];
	}
>;

export type RxQueryResultDoc<T> = Override<
	RxQueryResult<T>,
	{
		result: RxDocument<T>[];
	}
>;

/**
 * Traditional:
 *    Results are split into pages, starts by rendering the first page and total
 *    pageCount is returned, allowing for requesting results of any specific page.
 *    Requires `pageSize` to be defined
 *
 * Infinite:
 *    First page of results is rendered, allowing for gradually requesting more.
 *    Requires `pageSize` to be defined
 */
export type PaginationMode = 'Traditional' | 'Infinite';

export interface UseRxQueryOptions {
	/**
	 * Controls page size, in both "infinite scroll" & "traditional" pagination
	 */
	pageSize?: number;

	/**
	 * Determines pagination mode
	 */
	pagination?: PaginationMode;

	/**
	 * Converts resulting RxDocuments to plain objects
	 */
	json?: boolean;
}

/**
 * Most query functions on RxCollection return RxQuery objects with
 * BehaviorSubject instances ($) attached to them except for .findByIds()
 * which returns a promise.
 */
export type ObservableReturningQuery<T> =
	| RxQuery<T, RxDocument<T>>
	| RxQuery<T, RxDocument<T>[]>;
export type PromiseReturning<T> = Promise<ResultMap<T>>;
export type AnyRxQuery<T> = ObservableReturningQuery<T> | PromiseReturning<T>;

interface RxState<T> {
	result: AnyQueryResult<T>;
	isFetching: boolean;
	isExhausted: boolean;
	page: number | undefined;
	pageCount: number;
}

enum ActionType {
	Reset,
	FetchMore,
	FetchPage,
	FetchSuccess,
	CountPages,
	QueryChanged,
}

interface ResetAction {
	type: ActionType.Reset;
}

interface FetchMoreAction {
	type: ActionType.FetchMore;
}

interface FetchPageAction {
	type: ActionType.FetchPage;
	page: number;
}

interface CountPagesAction {
	type: ActionType.CountPages;
	pageCount: number;
}

interface FetchSuccessAction<T> {
	type: ActionType.FetchSuccess;
	docs: AnyQueryResult<T>;
	pagination: PaginationMode;
	pageSize: number;
}

interface QueryChangedAction {
	type: ActionType.QueryChanged;
}

type AnyAction<T> =
	| ResetAction
	| FetchMoreAction
	| FetchPageAction
	| CountPagesAction
	| FetchSuccessAction<T>
	| QueryChangedAction;

const reducer = <T>(state: RxState<T>, action: AnyAction<T>): RxState<T> => {
	switch (action.type) {
		case ActionType.Reset:
			return {
				...state,
				result: [],
				isFetching: true,
				page: 1,
			};
		case ActionType.FetchMore:
			return {
				...state,
				isFetching: true,
				page: state.page + 1,
			};
		case ActionType.FetchPage:
			return {
				...state,
				isFetching: true,
				page: action.page,
			};
		case ActionType.CountPages:
			return {
				...state,
				pageCount: action.pageCount,
			};
		case ActionType.FetchSuccess:
			return {
				...state,
				result: action.docs,
				isFetching: false,
				isExhausted: !action.pageSize
					? true
					: action.pagination === 'Infinite'
					? action.docs.length < state.page * action.pageSize
					: false,
			};
		case ActionType.QueryChanged:
			return {
				...state,
				isFetching: true,
			};
		/* istanbul ignore next */
		default:
			return state;
	}
};

const getResultArray = <T>(
	result: RxDocument<T>[] | RxDocument<T> | ResultMap<T> | null,
	json?: boolean
): AnyQueryResult<T> => {
	if (!result) {
		return [];
	}
	if (result instanceof Map) {
		return Array.from(result, ([, doc]) => (json ? doc.toJSON() : doc));
	}
	const resultArray = Array.isArray(result) ? result : [result];
	return json ? resultArray.map((doc) => doc.toJSON()) : resultArray;
};

const getResultLength = <T>(
	result: RxDocument<T>[] | RxDocument<T> | ResultMap<T> | null
): number => {
	if (!result) {
		return 0;
	}
	if (result instanceof Map) {
		return result.size;
	}
	const resultArray = Array.isArray(result) ? result : [result];
	return resultArray.length;
};

function useRxQuery<T>(query: AnyRxQuery<T>): RxQueryResultDoc<T>;

function useRxQuery<T>(
	query: AnyRxQuery<T>,
	options?: Override<UseRxQueryOptions, { json?: false }>
): RxQueryResultDoc<T>;

function useRxQuery<T>(
	query: AnyRxQuery<T>,
	options?: Override<UseRxQueryOptions, { json: true }>
): RxQueryResultJSON<T>;

/**
 * Subscribes to specified query and provides results, also providing:
 *  - state indicators for fetching and list depletion
 *  - a fetchMore callback function for pagination support
 *  - a resetList callback function for conveniently reseting list data
 */
function useRxQuery<T>(
	query: AnyRxQuery<T>,
	options: UseRxQueryOptions = {}
): RxQueryResult<T> {
	const { pageSize, pagination = 'Infinite', json } = options;

	const initialState: RxState<T> = {
		result: [],
		page: pageSize ? 1 : undefined,
		isFetching: true,
		isExhausted: false,
		pageCount: 0,
	};

	const [state, dispatch] = useReducer<Reducer<RxState<T>, AnyAction<T>>>(
		reducer,
		initialState
	);

	const fetchPage = useCallback(
		(page: number) => {
			if (!pageSize || pagination !== 'Traditional') {
				return;
			}
			if (page < 1 || page > state.pageCount) {
				return;
			}
			dispatch({ type: ActionType.FetchPage, page });
		},
		[pageSize, pagination, state.pageCount]
	);

	const fetchMore = useCallback(() => {
		if (!pageSize || pagination !== 'Infinite') {
			return;
		}
		if (state.isFetching || state.isExhausted) {
			return;
		}
		dispatch({ type: ActionType.FetchMore });
	}, [pageSize, pagination, state.isFetching, state.isExhausted]);

	const resetList = useCallback(() => {
		if (!pageSize) {
			return;
		}
		if (state.page === 1) {
			return;
		}
		dispatch({ type: ActionType.Reset });
	}, [pageSize, state.page]);

	const performObservableReturningQuery = useCallback(
		(query: ObservableReturningQuery<T>) => {
			// avoid re-assigning reference to original query
			let _query = query;

			if (pageSize && pagination === 'Traditional') {
				_query = _query
					.skip((state.page - 1) * pageSize)
					.limit(pageSize);
			}

			if (pageSize && pagination === 'Infinite') {
				_query = _query.limit(state.page * pageSize);
			}

			dispatch({
				type: ActionType.QueryChanged,
			});
			// TODO: find more elegant way to resolve type error
			// (TS doesn't consider _query.$.subscribe to be callable)
			const sub = (_query.$.subscribe as any)(
				(result: RxDocument<T> | RxDocument<T>[]) => {
					const docs = getResultArray(result, json);
					dispatch({
						type: ActionType.FetchSuccess,
						docs,
						pagination,
						pageSize,
					});
				}
			);

			return () => {
				sub.unsubscribe();
			};
		},
		[json, pageSize, pagination, state.page]
	);

	const performPromiseReturningQuery = useCallback(
		(query: PromiseReturning<T>) => {
			dispatch({
				type: ActionType.QueryChanged,
			});
			const [cancelableQuery, cancel] = getCancelablePromise(query);
			cancelableQuery.then((result) => {
				const docs = getResultArray(result, json);
				dispatch({
					type: ActionType.FetchSuccess,
					docs,
					pagination,
					pageSize,
				});
			});
			// to be used as cleanup code in useEffect
			return cancel;
		},
		[json, pageSize, pagination]
	);

	useEffect(() => {
		if (!query) {
			return;
		}
		if ('then' in query) {
			return performPromiseReturningQuery(query);
		}
		if (isRxQuery(query)) {
			return performObservableReturningQuery(query);
		}
	}, [query, performPromiseReturningQuery, performObservableReturningQuery]);

	useEffect(() => {
		if (!query || !pageSize || pagination !== 'Traditional') {
			return;
		}
		if ('then' in query) {
			// TODO: does pagination make sense when using findByIds()?
			return;
		}
		if (isRxQuery(query)) {
			// Unconvential counting of documents/pages due to missing RxQuery.count():
			// https://github.com/pubkey/rxdb/blob/master/orga/BACKLOG.md#rxquerycount
			// TODO: find more elegant way to resolve type error
			// (TS doesn't consider _query.$.subscribe to be callable)
			const countQuerySub = (query.$.subscribe as any)(
				(result: RxDocument<T> | RxDocument<T>[]) => {
					const resultLength = getResultLength(result);
					dispatch({
						type: ActionType.CountPages,
						pageCount: Math.ceil(resultLength / pageSize),
					});
				}
			);

			return () => {
				countQuerySub.unsubscribe();
			};
		}
	}, [query, pageSize, pagination]);

	return {
		result: state.result,
		isFetching: state.isFetching,
		isExhausted: state.isExhausted,
		pageCount: state.pageCount,
		currentPage: state.page,
		fetchPage,
		fetchMore,
		resetList,
	};
}

export default useRxQuery;
