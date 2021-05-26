import React, { FC, useMemo } from 'react';
import RxDB, { RxDatabase } from 'rxdb';
import Context from './context';
import { BehaviorSubject } from 'rxjs';

RxDB.plugin({
	rxdb: true,
	prototypes: {
		RxDatabase: proto => {
			proto.collections$ = new BehaviorSubject({});
		},
	},

	hooks: {
		createRxCollection: function(col) {
			col.database.collections$.next({
				...col.database.collections$.getValue(),
				[col.name]: col,
			});
		},
	},
});
export interface ProviderProps {
	db?: RxDatabase;
	idAttribute?: string;
}

const Provider: FC<ProviderProps> = ({ db, idAttribute = '_id', children }) => {
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
