import { useContext } from 'react';
import { RxDatabase } from 'rxdb';
import Context from './context';

const useRxDB = (): RxDatabase => {
	const db = useContext(Context);
	return db;
};

export default useRxDB;
