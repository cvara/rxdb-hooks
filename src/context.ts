import { createContext } from 'react';
import { RxDatabaseBaseExtended } from './plugins';

export interface RxContext {
	db: RxDatabaseBaseExtended | null;
}

const Context = createContext<RxContext>(null);

export default Context;
