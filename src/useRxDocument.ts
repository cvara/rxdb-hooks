import { useCallback, useContext } from 'react';
import useData from './useRxData';
import { RxCollection } from 'rxdb';
import Context from './context';

interface RxDocumentRet<T> {
	result?: T;
	isFetching: boolean;
}

interface UseRxDocumentOptions {
	idAttribute?: string;
}

const useRxDocument = <T>(
	collectionName: string,
	id?: string,
	options: UseRxDocumentOptions = {}
): RxDocumentRet<T> => {
	const context = useContext(Context);
	const idAttribute = options.idAttribute || context.idAttribute;

	const queryConstructor = useCallback(
		(c: RxCollection<T>) =>
			c
				.find()
				.where(idAttribute)
				.equals(id),
		[id, idAttribute]
	);

	const { result, isFetching } = useData<T>(
		collectionName,
		id ? queryConstructor : undefined
	);

	return { result: result[0], isFetching };
};

export default useRxDocument;
