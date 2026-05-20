import { Subject } from 'rxjs';
import { RxCollection, RxDatabase, RxPlugin } from 'rxdb';

type CollectionRecord = Record<string, RxCollection>;

/**
 * Minimal shape of the `RxDatabase` prototype that the `observeNewCollections`
 * plugin patches at runtime.
 *
 * We intentionally avoid importing `RxDatabaseBase` from `rxdb/dist/types/...`
 * so the library does not depend on rxdb's internal subpath exports, which
 * are not part of the public API and have shifted between major versions of
 * rxdb (14 → 15 → 16).
 */
type RxDatabasePrototype = {
	addCollections: RxDatabase['addCollections'];
	newCollections$?: Subject<CollectionRecord>;
};

export type RxDatabaseBaseExtended = RxDatabase & {
	newCollections$?: Subject<CollectionRecord>;
};

/**
 * Extends RxDB prototype with a newCollections$ property: a stream emitting any
 * new collections added via addCollections().
 */
export const observeNewCollections: RxPlugin = {
	name: 'new-collection-observer',
	rxdb: true,
	prototypes: {
		RxDatabase: (proto: RxDatabasePrototype) => {
			const newCollections$ = new Subject<CollectionRecord>();
			proto.newCollections$ = newCollections$;

			const orig = proto.addCollections;
			proto.addCollections = async function (...args) {
				const col = await orig.apply(this, args);
				newCollections$.next(col);
				return col;
			};
		},
	},
};
