import { useEffect, useCallback, useReducer, Reducer } from 'react';
import { RxQuery, RxDocument, isRxQuery } from 'rxdb';
import { Override } from './type.helpers';

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
}

export interface RxQueryResultJSON<T> extends RxQueryResult<T> {
	result: T[];
}

export interface RxQueryResultDoc<T> extends RxQueryResult<T> {
	result: RxDocument<T>[];
}

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

interface RxState<T> {
	result: T[] | RxDocument<T>[];
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
	docs: T[];
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
	result: RxDocument<T>[] | RxDocument<T> | null
): RxDocument<T>[] => {
	if (!result) {
		return [];
	}
	if (Array.isArray(result)) {
		return result;
	}
	return [result];
};

function useRxQuery<T>(query: RxQuery): RxQueryResultDoc<T>;

function useRxQuery<T>(
	query: RxQuery,
	options?: Override<UseRxQueryOptions, { json?: false }>
): RxQueryResultDoc<T>;

function useRxQuery<T>(
	query: RxQuery,
	options?: Override<UseRxQueryOptions, { json: true }>
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

	useEffect(() => {
		if (!isRxQuery(query)) {
			return;
		}
		// avoid re-assigning reference to original query
		let _query = query;

		if (pageSize && pagination === 'Traditional') {
			_query = _query.skip((state.page - 1) * pageSize).limit(pageSize);
		}

		if (pageSize && pagination === 'Infinite') {
			_query = _query.limit(state.page * pageSize);
		}

		dispatch({
			type: ActionType.QueryChanged,
		});

		const sub = _query.$.subscribe(
			(result: RxDocument<T>[] | RxDocument<T> | null) => {
				const docs = getResultArray(result);
				dispatch({
					type: ActionType.FetchSuccess,
					docs: json ? docs.map(doc => doc.toJSON()) : docs,
					pagination,
					pageSize,
				});
			}
		);

		return () => {
			sub.unsubscribe();
		};
	}, [query, pageSize, pagination, state.page, json]);

	useEffect(() => {
		if (!pageSize || pagination !== 'Traditional' || !isRxQuery(query)) {
			return;
		}
		// Unconvential counting of documents/pages due to missing RxQuery.count():
		// https://github.com/pubkey/rxdb/blob/master/orga/BACKLOG.md#rxquerycount
		const countQuerySub = query.$.subscribe(
			(result: RxDocument<T>[] | RxDocument<T> | null) => {
				const docs = getResultArray(result);
				dispatch({
					type: ActionType.CountPages,
					pageCount: Math.ceil(docs.length / pageSize),
				});
			}
		);

		return () => {
			countQuerySub.unsubscribe();
		};
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
