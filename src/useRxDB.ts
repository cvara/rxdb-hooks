import { useContext } from 'react';
import Context from './context';
import { RxDatabaseBaseExtended } from './plugins';

function useRxDB(): RxDatabaseBaseExtended {
	const { db } = useContext(Context);
	return db;
}

export default useRxDB;
