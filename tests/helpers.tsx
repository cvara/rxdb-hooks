import React, { FC } from 'react';
import {
	RxDatabase,
	RxCollection,
	createRxDatabase,
	isRxDocument,
	isRxDatabase,
} from 'rxdb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';

// Mimic typings used in official RxDB docs:
// https://rxdb.info/tutorials/typescript.html
export type Character = {
	id: string;
	name: string;
	affiliation: string;
	age: number;
};

export type CharacterCollection = RxCollection<Character>;

export type MyDatabaseCollections = {
	characters: CharacterCollection;
};

export type MyDatabase = RxDatabase<MyDatabaseCollections>;

export const createDatabase = async (
	dbName = 'test_database'
): Promise<MyDatabase> => {
	const db: MyDatabase = await createRxDatabase({
		name: dbName,
		storage: getRxStorageDexie(),
		ignoreDuplicate: true,
	});
	return db;
};

export const setupCollection = async (
	db: MyDatabase,
	documents: Character[],
	collectionName = 'test_collection'
): Promise<RxCollection> => {
	const collection = await db.addCollections({
		[collectionName]: {
			schema: {
				title: 'characters',
				version: 0,
				type: 'object',
				primaryKey: 'id',
				properties: {
					id: {
						type: 'string',
						maxLength: 100,
					},
					name: {
						type: 'string',
						maxLength: 100,
					},
					affiliation: {
						type: 'string',
					},
					age: {
						type: 'integer',
					},
				},
				indexes: ['name'],
			},
		},
	});
	await collection[collectionName].bulkInsert(documents);
	return collection[collectionName];
};

export const setup = async (
	documents: Character[],
	collectionName = 'test_collection',
	dbName?: string
): Promise<MyDatabase> => {
	const db = await createDatabase(dbName);
	await setupCollection(db, documents, collectionName);
	return db;
};

export const teardown = async (db: MyDatabase): Promise<void> => {
	if (isRxDatabase(db)) {
		db.remove();
	}
};

interface CharacterListProps {
	characters: Character[];
	isFetching: boolean;
	isExhausted: boolean;
	pageCount?: number;
	currentPage?: number;
	resetList?: () => void;
	fetchMore?: () => void;
}

export const CharacterList: FC<CharacterListProps> = ({
	characters,
	isFetching,
	isExhausted,
	resetList,
	pageCount,
	currentPage,
	fetchMore,
}) => {
	const handleReset = () => {
		if (typeof resetList === 'function') {
			resetList();
		}
	};

	const handleMore = () => {
		if (typeof fetchMore === 'function') {
			fetchMore();
		}
	};

	return (
		<div>
			<ul>
				{characters.map((character, index) => (
					<li key={index} data-index={index}>
						{character.name}
					</li>
				))}
			</ul>
			<div>{isExhausted ? 'isExhausted' : null}</div>
			<div>{isFetching ? 'loading' : null}</div>
			<div>page count: {pageCount}</div>
			<div>current page: {currentPage}</div>
			<div>{characters.every(isRxDocument) ? 'RxDocument' : 'JSON'}</div>
			<button onClick={handleReset}>reset</button>
			<button onClick={handleMore}>more</button>
		</div>
	);
};

interface CharacterProps {
	character?: Character;
	isFetching: boolean;
}

export const Character: FC<CharacterProps> = ({ character, isFetching }) => {
	return (
		<div>
			<div>{character ? character.name : null}</div>
			<div>{isFetching ? 'loading' : null}</div>
			<div>{isRxDocument(character) ? 'RxDocument' : 'JSON'}</div>
		</div>
	);
};

export const sortByNameAsc = (a: Character, b: Character): number => {
	if (a.name < b.name) {
		return -1;
	}
	if (a.name > b.name) {
		return 1;
	}
	return 0;
};

export const sortByNameDesc = (a: Character, b: Character): number => {
	if (a.name < b.name) {
		return 1;
	}
	if (a.name > b.name) {
		return -1;
	}
	return 0;
};

export const delay = (ms: number): Promise<void> =>
	new Promise(resolve => {
		setTimeout(resolve, ms);
	});
