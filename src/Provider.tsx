import React, { useMemo, useEffect, PropsWithChildren } from 'react';
import { RxDatabase, addRxPlugin } from 'rxdb';
import Context from './context';
import { observeNewCollections, RxDatabaseBaseExtended } from './plugins';

export interface ProviderProps<Collections = any> {
	db?: RxDatabase<Collections>;
	idAttribute?: string;
}

const Provider = <C extends unknown>({
	db,
	idAttribute = '_id',
	children,
}: PropsWithChildren<ProviderProps<C>>): JSX.Element => {
	useEffect(() => {
		addRxPlugin(observeNewCollections);
	}, []);
	const context = useMemo(
		() => ({
			db: db as unknown as RxDatabaseBaseExtended,
			idAttribute,
		}),
		[db, idAttribute]
	);
	return <Context.Provider value={context}>{children}</Context.Provider>;
};

export default Provider;
