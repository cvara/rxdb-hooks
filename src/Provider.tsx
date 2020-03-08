import React, { FC } from 'react';
import { RxDatabase } from 'rxdb';
import Context from './context';

interface ProviderProps {
	db: RxDatabase;
}

const Provider: FC<ProviderProps> = ({ db, children }) => (
	<Context.Provider value={db}>{children}</Context.Provider>
);

export default Provider;
