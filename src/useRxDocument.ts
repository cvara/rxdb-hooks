import { useCallback, useContext } from 'react';
import useRxData from './useRxData';
import { RxCollection, RxDocument } from 'rxdb';
import Context from './context';
import { Override } from './type.helpers';
import { DeepReadonly } from 'rxdb/dist/types/types';

export interface RxDocumentRet<T> {
	result?: DeepReadonly<T> | RxDocument<T>;
	isFetching: boolean;
}

export interface RxDocumentJSON<T> extends RxDocumentRet<T> {
	result?: DeepReadonly<T>;
}

export interface RxDocumentDoc<T> extends RxDocumentRet<T> {
	result?: RxDocument<T>;
}

export interface UseRxDocumentOptions {
	idAttribute?: string;
	json?: boolean;
}

function useRxDocument<T>(
	collectionName: string,
	id?: string | number,
	options?: Override<UseRxDocumentOptions, { json: true }>
): RxDocumentJSON<T>;

function useRxDocument<T>(
	collectionName: string,
	id?: string | number,
	options?: Override<UseRxDocumentOptions, { json?: false }>
): RxDocumentDoc<T>;

/**
 * Searches for a single document by an id attribute.
 */
function useRxDocument<T>(
	collectionName: string,
	id?: string | number,
	options: UseRxDocumentOptions = {}
): RxDocumentRet<T> {
	const { idAttribute, json } = options;

	const context = useContext(Context);
	const preferredIdAttribute = idAttribute || context.idAttribute;

	/**
	 * As a means of holding off data fetching when id is missing
	 * don't return a valid RxQuery object
	 */
	const queryConstructor = useCallback(
		(c: RxCollection<T>) => {
			if (!id) {
				return undefined;
			}
			return c.findOne({ selector: { [preferredIdAttribute]: id } });
		},
		[id, preferredIdAttribute]
	);

	// get around type-narrowing issue
	// TODO: find a better workaround
	const { result, isFetching } = json
		? // eslint-disable-next-line react-hooks/rules-of-hooks
		  useRxData<T>(collectionName, queryConstructor, { json: true })
		: // eslint-disable-next-line react-hooks/rules-of-hooks
		  useRxData<T>(collectionName, queryConstructor, { json: false });

	return { result: result[0], isFetching };
}

export default useRxDocument;
