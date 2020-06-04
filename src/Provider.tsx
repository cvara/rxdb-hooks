import React, { FC, useMemo } from 'react';
import { RxDatabase } from 'rxdb';
import Context from './context';

interface ProviderProps {
	db?: RxDatabase;
	idAttribute?: string;
}

const Provider: FC<ProviderProps> = ({ db, idAttribute = '_id', children }) => {
	const context = useMemo(
		() => ({
			db,
			idAttribute,
		}),
		[db, idAttribute]
	);
	return <Context.Provider value={context}>{children}</Context.Provider>;
};

export default Provider;
