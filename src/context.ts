import { createContext } from 'react';
import { RxDatabase } from 'rxdb';

export interface RxContext {
	db: RxDatabase | null;
	idAttribute: string;
}

const Context = createContext<RxContext>(null);

export default Context;
