import { useState, useEffect } from 'react';
import { RxCollection } from 'rxdb';
import useRxDB from './useRxDB';

const useRxCollection = <T>(name: string): RxCollection<T> | null => {
	const [collection, setCollection] = useState<RxCollection<T> | null>(null);
	const db = useRxDB();

	useEffect(() => {
		if (!db) {
			return;
		}
		const found = db[name];
		if (found) {
			setCollection(found);
		}
	}, [db]);

	return collection;
};

export default useRxCollection;
