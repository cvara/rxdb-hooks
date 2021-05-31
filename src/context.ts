import { createContext } from 'react';
import { RxDatabaseBaseExtended } from './plugins';

export interface RxContext {
	db: RxDatabaseBaseExtended | null;
	idAttribute: string;
}

const Context = createContext<RxContext>(null);

export default Context;
