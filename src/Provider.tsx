import React, { FC, useMemo, useEffect } from 'react';
import { RxDatabase, addRxPlugin } from 'rxdb';
import Context from './context';
import { newCollectionObserver } from './plugins';

export interface ProviderProps {
	db?: RxDatabase;
	idAttribute?: string;
}

const Provider: FC<ProviderProps> = ({ db, idAttribute = '_id', children }) => {
	useEffect(() => {
		addRxPlugin(newCollectionObserver);
	}, []);
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
