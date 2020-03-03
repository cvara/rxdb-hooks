import RxDB, { RxDatabase } from 'rxdb';
import memoryAdapter from 'pouchdb-adapter-memory';

RxDB.plugin(memoryAdapter);

export const setup = async (
	collectionName = 'test_collection'
): Promise<RxDatabase> => {
	const db = await RxDB.create({
		name: 'test_database',
		adapter: 'memory',
	});
	await db.collection({
		name: collectionName,
		schema: {
			title: 'characters',
			version: 0,
			type: 'object',
			properties: {
				name: {
					type: 'string',
					primary: true,
				},
				affiliation: {
					type: 'string',
				},
			},
		},
	});
	return db;
};

export const teardown = async (db: RxDatabase): Promise<void> => {
	if (RxDB.isRxDatabase(db)) {
		db.remove();
	}
};

export default RxDB;
