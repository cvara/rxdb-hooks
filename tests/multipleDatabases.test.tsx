import React, { FC, useCallback } from 'react';
import {
	setup,
	teardown,
	CharacterList,
	Character,
	MyDatabase,
} from './helpers';
import { render, screen, waitFor } from '@testing-library/react';
import { addRxPlugin, RxCollection } from 'rxdb';
import { RxDBQueryBuilderPlugin } from 'rxdb/plugins/query-builder';
import useRxData from '../src/useRxData';
import Provider from '../src/Provider';
import { characters } from './mockData';

addRxPlugin(RxDBQueryBuilderPlugin);

describe('multiple databases', () => {
	let db1: MyDatabase;
	let db2: MyDatabase;

	const characters1 = characters.slice(0, 2);
	const characters2 = characters.slice(2);

	beforeAll(async done => {
		db1 = await setup(characters1, 'characters', 'database_1');
		db2 = await setup(characters2, 'characters', 'database_2');
		done();
	});

	afterAll(async done => {
		await teardown(db1);
		await teardown(db2);
		done();
	});

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
			<CharacterList
				characters={characters}
				isFetching={isFetching}
				isExhausted={isExhausted}
			/>
		);
	};

	it('should read data from innermost database', async done => {
		render(
			<Provider db={db1}>
				<Provider db={db2}>
					<Child />
				</Provider>
			</Provider>
		);

		await waitFor(async () => {
			// data of db2 should now be rendered
			characters2.forEach(doc => {
				expect(screen.getByText(doc.name)).toBeInTheDocument();
			});
		});
		// data of db1 should not be rendered
		characters1.forEach(doc => {
			expect(screen.queryByText(doc.name)).not.toBeInTheDocument();
		});

		done();
	});

	it('should support nesting with repeated databases', async done => {
		render(
			<Provider db={db1}>
				<Provider db={db2}>
					<Provider db={db1}>
						<Child />
					</Provider>
				</Provider>
			</Provider>
		);

		await waitFor(async () => {
			// data of db1 should now be rendered
			characters1.forEach(doc => {
				expect(screen.getByText(doc.name)).toBeInTheDocument();
			});
		});
		// data of db2 should not be rendered
		characters2.forEach(doc => {
			expect(screen.queryByText(doc.name)).not.toBeInTheDocument();
		});

		done();
	});
});
