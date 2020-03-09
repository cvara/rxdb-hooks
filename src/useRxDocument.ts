import { useCallback, useContext } from 'react';
import useData from './useRxData';
import { RxCollection } from 'rxdb';
import Context from './context';

interface RxDocumentRet<T> {
	result?: T;
	isFetching: boolean;
}

const useRxDocument = <T>(
	collectionName: string,
	id?: string
): RxDocumentRet<T> => {
	const { idAttribute } = useContext(Context);
	const queryConstructor = useCallback(
		(c: RxCollection<T>) =>
			c
				.find()
				.where(idAttribute)
				.equals(id),
		[id]
	);
	const { result, isFetching } = useData<T>(
		collectionName,
		id ? queryConstructor : undefined
	);
	return { result: result[0], isFetching };
};

export default useRxDocument;
