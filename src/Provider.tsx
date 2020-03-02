import React, { ReactNode } from 'react';
import { RxDatabase } from 'rxdb';
import Context from './context';

interface ProviderProps {
	db: RxDatabase;
	children: ReactNode;
}

const Provider = ({ db, children }: ProviderProps): JSX.Element => (
	<Context.Provider value={db}>{children}</Context.Provider>
);

export default Provider;
