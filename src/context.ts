import { createContext } from 'react';
import { RxDatabase } from 'rxdb';

interface Context {
	db: RxDatabase | null;
	idAttribute: string;
}

const Context = createContext<Context>(null);

export default Context;
