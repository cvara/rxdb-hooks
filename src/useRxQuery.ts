import { useEffect, useCallback, useReducer, Reducer } from 'react';
import { RxQuery, RxDocument, isRxQuery } from 'rxdb';

export interface RxQueryResult<T> {
	/**
	 * Resulting documents.
	 */
	result: T[] | RxDocument<T>[];

	/**
	 * Indicates that fetching is in progress.
	 */
	isFetching: boolean;

	/**
	 * Indicates that all available results have been already fetched.
	 */
	exhausted: boolean;

	/**
	 * Total number of pages, based on total number of results and page size.
	 * Relevant in "traditional" pagination mode
	 */
	pageCount: number;

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
}

export interface RxQueryResultJSON<T> extends RxQueryResult<T> {
	result: T[];
}

export interface RxQueryResultDoc<T> extends RxQueryResult<T> {
	result: RxDocument<T>[];
}

export interface UseRxQueryOptions {
	/**
	 * Controls page size, in both "infinite scroll" & "traditional" pagination
	 */
	pageSize?: number;

	/**
	 * Defines starting page & enables "traditional" pagination mode
	 */
	startingPage?: number;

	/**
	 * Sort property
	 */
	sortBy?: string;

	/**
	 * Sort order
	 */
	sortOrder?: 'asc' | 'desc';

	/**
	 * Converts resulting RxDocuments to plain objects
	 */
	json?: boolean;
}

enum PaginationMode {
	/**
	 * Results are split into pages and total pageCount is returned.
	 * Requires `startingPage` & `pageSize` options to be defined.
	 */
	Traditional,

	/**
	 * First page of results is rendered, allowing for gradually requesting more.
	 * Requires `pageSize` to be defined
	 */
	InfiniteScroll,

	/**
	 * Entire matching dataset is returned in one go
	 */
	None,
}

interface RxState<T> {
	result: T[] | RxDocument<T>[];
	isFetching: boolean;
	exhausted: boolean;
	limit: number;
	page: number | undefined;
	pageCount: number;
}

enum ActionType {
	Reset,
	FetchMore,
	FetchPage,
	FetchSuccess,
	CountPages,
}

interface ResetAction {
	type: ActionType.Reset;
	pageSize: number;
}

interface FetchMoreAction {
	type: ActionType.FetchMore;
	pageSize: number;
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
	docs: T[];
}

type AnyAction<T> =
	| ResetAction
	| FetchMoreAction
	| FetchPageAction
	| CountPagesAction
	| FetchSuccessAction<T>;

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
				exhausted: !state.limit || action.docs.length < state.limit,
			};
	}
};

const getPaginationMode = (options: UseRxQueryOptions): PaginationMode => {
	const { startingPage, pageSize } = options;
	if (!pageSize) {
		return PaginationMode.None;
	}
	if (!startingPage) {
		return PaginationMode.InfiniteScroll;
	}
	return PaginationMode.Traditional;
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
	const {
		pageSize = 0,
		startingPage,
		sortBy,
		sortOrder = 'desc',
		json,
	} = options;

	const paginationMode = getPaginationMode(options);

	const initialState = {
		result: [],
		page: startingPage,
		limit: paginationMode === PaginationMode.InfiniteScroll ? pageSize : 0,
		isFetching: true,
		exhausted: false,
		pageCount: 0,
	};

	const [state, dispatch] = useReducer<Reducer<RxState<T>, AnyAction<T>>>(
		reducer,
		initialState
	);

	const fetchPage = useCallback(
		(page: number) => {
			if (paginationMode !== PaginationMode.Traditional) {
				// only available on Traditional mode
				return;
			}
			if (page < 0 || page > state.pageCount) {
				// can't request page outside available range
				return;
			}
			dispatch({
				type: ActionType.FetchPage,
				page,
			});
		},
		[paginationMode, state.pageCount]
	);

	const fetchMore = useCallback(() => {
		if (!state.limit || state.isFetching || state.exhausted) {
			return;
		}
		dispatch({ type: ActionType.FetchMore, pageSize });
	}, [state.limit, state.isFetching, state.exhausted, pageSize]);

	const resetList = useCallback(() => {
		if (!state.limit || state.limit <= pageSize) {
			return;
		}
		dispatch({ type: ActionType.Reset, pageSize });
	}, [pageSize, state.limit]);

	useEffect(() => {
		if (!isRxQuery(query)) {
			return;
		}
		// avoid re-assigning reference to original query
		let _query = query;

		if (paginationMode === PaginationMode.Traditional) {
			_query = _query.skip((state.page - 1) * pageSize).limit(pageSize);
		}

		if (paginationMode === PaginationMode.InfiniteScroll) {
			_query = _query.limit(state.limit);
		}

		if (sortBy) {
			_query = _query.sort({
				[sortBy]: sortOrder,
			});
		}

		const sub = _query.$.subscribe(
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
	}, [
		query,
		pageSize,
		paginationMode,
		sortBy,
		sortOrder,
		state.limit,
		state.page,
	]);

	useEffect(() => {
		if (!state.page || !isRxQuery(query)) {
			return;
		}
		// Unconvential counting of documents/pages to due to missing RxQuery.count():
		// https://github.com/pubkey/rxdb/blob/master/orga/BACKLOG.md#rxquerycount
		const countQuerySub = query.$.subscribe(
			(documents: RxDocument<T>[] | RxDocument<T>) => {
				const docs = Array.isArray(documents) ? documents : [documents];
				dispatch({
					type: ActionType.CountPages,
					pageCount: Math.ceil(docs.length / pageSize),
				});
			}
		);

		return (): void => {
			countQuerySub.unsubscribe();
		};
	}, [state.page, query, pageSize]);

	return {
		result: state.result,
		isFetching: state.isFetching,
		exhausted: state.exhausted,
		pageCount: state.pageCount,
		fetchPage,
		fetchMore,
		resetList,
	};
}

export default useRxQuery;
