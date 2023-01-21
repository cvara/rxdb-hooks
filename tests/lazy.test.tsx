import React, { FC, useCallback } from 'react';
import {
	teardown,
	CharacterList,
	Character,
	createDatabase,
	setupCollection,
	MyDatabase,
} from './helpers';
import { render, screen, waitFor } from '@testing-library/react';
import { RxCollection } from 'rxdb';
import useRxData from '../src/useRxData';
import Provider from '../src/Provider';
import { characters } from './mockData';
import { act } from 'react-dom/test-utils';

describe('useRxData + lazy collection init', () => {
	let db: MyDatabase;

	beforeEach(async done => {
		// create db without collection + data
		db = await createDatabase();
		done();
	});

	afterEach(async done => {
		await teardown(db);
		done();
	});

	it('should read data from lazily created collection', async done => {
		const Child: FC = () => {
			const queryConstructor = useCallback(
				(c: RxCollection<Character>) => c.find(),
				[]
			);
			const {
				result: characters,
				isFetching,
				isExhausted,
			} = useRxData<Character>('characters', queryConstructor);

			return (
				<>
					<CharacterList
						characters={characters}
						isFetching={isFetching}
						isExhausted={isExhausted}
					/>
				</>
			);
		};

		render(
			<Provider db={db}>
				<Child />
			</Provider>
		);

		// should render in loading state
		expect(screen.getByText('loading')).toBeInTheDocument();

		// lazily create a collection we don't care about
		await act(async () => {
			await setupCollection(db, [], 'other');
		});

		// lazily create the collection we'be been waiting for
		await act(async () => {
			await setupCollection(db, characters, 'characters');
		});

		// wait for data
		await waitFor(async () => {
			// data should now be rendered
			characters.forEach(doc => {
				expect(screen.queryByText(doc.name)).toBeInTheDocument();
			});
		});

		done();
	});

	it('should read data from recreated collection', async done => {
		const Child: FC = () => {
			const queryConstructor = useCallback(
				(c: RxCollection<Character>) => c.find(),
				[]
			);
			const {
				result: characters,
				isFetching,
				isExhausted,
			} = useRxData<Character>('characters', queryConstructor);

			return (
				<>
					<CharacterList
						characters={characters}
						isFetching={isFetching}
						isExhausted={isExhausted}
					/>
				</>
			);
		};

		render(
			<Provider db={db}>
				<Child />
			</Provider>
		);

		// should render in loading state
		expect(screen.getByText('loading')).toBeInTheDocument();

		const wrongCharacters: Character[] = [
			{
				id: '1',
				name: 'Boba Fett',
				affiliation: 'Mandalorian',
				age: 56,
			},
		];

		// lazily create the collection we've been waiting for
		await act(async () => {
			await setupCollection(db, wrongCharacters, 'characters');
			await db.collections.characters.remove();
			await setupCollection(db, characters, 'characters');
		});

		// wait for data
		await waitFor(async () => {
			// data should now be rendered
			characters.forEach(doc => {
				expect(screen.queryByText(doc.name)).toBeInTheDocument();
			});

			// initial (now deleted) wrong characters data should not be rendered
			wrongCharacters.forEach(doc => {
				expect(screen.queryByText(doc.name)).not.toBeInTheDocument();
			});
		});

		done();
	});
});
