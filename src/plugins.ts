import { Subject } from 'rxjs';
import { RxCollection } from 'rxdb';
import { RxDatabaseBase } from 'rxdb/dist/types/rx-database';

type CollectionRecord = Record<string, RxCollection>;
export type RxDatabaseBaseExtended = RxDatabaseBase & {
	collections$: Subject<CollectionRecord>;
};

export const newCollectionObserver = {
	rxdb: true,
	prototypes: {
		RxDatabase: (proto: RxDatabaseBaseExtended) => {
			const collections$ = new Subject<CollectionRecord>();
			proto.collections$ = collections$;

			const orig = proto.addCollections;
			proto.addCollections = async function(...args) {
				const col = await orig.apply(this, args);
				collections$.next(col);
				return col;
			};
		},
	},
};
