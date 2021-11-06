import React, { FC } from 'react';
import {
	RxDatabase,
	RxCollection,
	createRxDatabase,
	isRxDocument,
	isRxDatabase,
} from 'rxdb';
import memoryAdapter from 'pouchdb-adapter-memory';
import { addPouchPlugin, getRxStoragePouch } from 'rxdb/plugins/pouchdb';

/**
 * For how to use pouchdb memory adapter as a storage option in rxdb@10 see:
 * https://github.com/pubkey/rxdb/blob/master/orga/releases/10.0.0.md#the-main-thing-first
 */
addPouchPlugin(memoryAdapter);

export interface Character {
	id: string;
	name: string;
	affiliation: string;
	age: number;
}

export const createDatabase = async (): Promise<RxDatabase> => {
	const db = await createRxDatabase({
		name: 'test_database',
		storage: getRxStoragePouch('memory'),
		ignoreDuplicate: true,
	});
	return db;
};

export const setupCollection = async (
	db: RxDatabase,
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
				indexes: ['name'],
			},
		},
	});
	await collection[collectionName].bulkInsert(documents);
	return collection[collectionName];
};

export const setup = async (
	documents: Character[],
	collectionName = 'test_collection'
): Promise<RxDatabase> => {
	const db = await createDatabase();
	await setupCollection(db, documents, collectionName);
	return db;
};

export const teardown = async (db: RxDatabase): Promise<void> => {
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
