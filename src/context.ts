import { createContext } from 'react';
import { RxDatabase } from 'rxdb';

const Context = createContext<RxDatabase | null>(null);

export default Context;
