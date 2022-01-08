import React, { FC, useMemo } from 'react';
import {
	setup,
	teardown,
	CharacterList,
	Character,
	MyDatabase,
} from './helpers';
import { render, screen, waitForDomChange } from '@testing-library/react';
import useRxQuery from '../src/useRxQuery';
import Provider from '../src/Provider';
import { characters } from './mockData';
import useRxCollection from '../src/useRxCollection';

describe('useRxQuery', () => {
	let db: MyDatabase;

	beforeAll(async done => {
		db = await setup(characters, 'characters');
		done();
	});

	afterAll(async done => {
		await teardown(db);
		done();
	});

	it('should allow invocation with no options', async done => {
		const Child: FC = () => {
			const collection = useRxCollection<Character>('characters');
			const query = useMemo(() => {
				if (!collection) {
					return;
				}
				return collection.find();
			}, [collection]);

			const { result: characters, isFetching, isExhausted } = useRxQuery<
				Character
			>(query);

			return (
				<CharacterList
					characters={characters}
					isFetching={isFetching}
					isExhausted={isExhausted}
				/>
			);
		};

		render(
			<Provider db={db}>
				<Child />
			</Provider>
		);

		// should render in loading state
		expect(screen.getByText('loading')).toBeInTheDocument();
		expect(screen.queryByText('isExhausted')).not.toBeInTheDocument();

		// wait for data
		await waitForDomChange();

		// data should now be rendered
		characters.forEach(doc => {
			expect(screen.queryByText(doc.name)).toBeInTheDocument();
		});

		// should be exhausted (we fetched everything in one go)
		expect(screen.getByText('isExhausted')).toBeInTheDocument();
		// result should be an array of RxDocuments
		expect(screen.getByText('RxDocument')).toBeInTheDocument();

		done();
	});
});
