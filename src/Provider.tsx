import React, { useMemo, PropsWithChildren } from 'react';
import { RxDatabase } from 'rxdb';
import Context from './context';
import { RxDatabaseBaseExtended } from './plugins';

export interface ProviderProps<Collections = any> {
	db?: RxDatabase<Collections>;
}

const Provider = <C extends unknown>({
	db,
	children,
}: PropsWithChildren<ProviderProps<C>>): JSX.Element => {
	const context = useMemo(
		() => ({
			db: db as unknown as RxDatabaseBaseExtended,
		}),
		[db]
	);
	return <Context.Provider value={context}>{children}</Context.Provider>;
};

export default Provider;
