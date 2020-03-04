import RxDB, { RxDatabase } from 'rxdb';
import memoryAdapter from 'pouchdb-adapter-memory';

RxDB.plugin(memoryAdapter);

interface Character {
	name: string;
	affiliation: string;
}

export const setup = async (
	documents: Character[],
	collectionName = 'test_collection'
): Promise<RxDatabase> => {
	const db = await RxDB.create({
		name: 'test_database',
		adapter: 'memory',
	});
	const collection = await db.collection({
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
	await collection.bulkInsert(documents);
	return db;
};

export const teardown = async (db: RxDatabase): Promise<void> => {
	if (RxDB.isRxDatabase(db)) {
		db.remove();
	}
};

export default RxDB;
