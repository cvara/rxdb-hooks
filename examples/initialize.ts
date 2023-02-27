import { addRxPlugin, createRxDatabase } from 'rxdb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { RxDBQueryBuilderPlugin } from 'rxdb/plugins/query-builder';
import { RxDBDevModePlugin } from 'rxdb/plugins/dev-mode';

import { characters } from './data';

addRxPlugin(RxDBDevModePlugin);
addRxPlugin(RxDBQueryBuilderPlugin);

const initialize = async () => {
	// create RxDB
	const db = await createRxDatabase({
		name: 'test_database',
		storage: getRxStorageDexie(),
		ignoreDuplicate: true,
	});

	// create a collection
	const collection = await db.addCollections({
		characters: {
			schema: {
				title: 'characters',
				version: 0,
				type: 'object',
				primaryKey: 'id',
				properties: {
					id: {
						type: 'string',
						maxLength: 250,
					},
					name: {
						type: 'string',
					},
					affiliation: {
						type: 'string',
					},
					age: {
						type: 'integer',
					},
				},
			},
		},
	});

	await collection.characters.bulkInsert(characters);

	return db;
};

export default initialize;
