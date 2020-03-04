import React, { FunctionComponent, useCallback } from 'react';
import { setup, teardown } from './rxdb';
import { render, screen, waitForDomChange } from '@testing-library/react';
import { RxDatabase, RxCollection } from 'rxdb';
import useRxData from '../src/useRxData';
import Provider from '../src/Provider';

describe('useRxData', () => {
	let db: RxDatabase;
	const bulkDocs = [
		{
			name: 'Darth Vader',
			affiliation: 'Sith',
		},
		{
			name: 'Yoda',
			affiliation: 'Jedi',
		},
	];

	beforeAll(async done => {
		db = await setup(bulkDocs, 'characters');
		done();
	});

	afterAll(async done => {
		await teardown(db);
		done();
	});

	it('should read data from collection', async done => {
		const Child: FunctionComponent = () => {
			const queryConstructor = useCallback(
				(c: RxCollection) => c.find(),
				[]
			);
			const { result: characters, isFetching } = useRxData(
				'characters',
				queryConstructor
			);

			if (isFetching) {
				return <div>loading</div>;
			}

			return (
				<ul>
					{characters.map(character => (
						<li key={character.name}>{character.name}</li>
					))}
				</ul>
			);
		};

		const Parent: FunctionComponent = () => (
			<Provider db={db}>
				<Child />
			</Provider>
		);

		render(<Parent />);

		// should render in loading state
		expect(screen.getByText('loading')).toBeInTheDocument();

		// wait for data
		await waitForDomChange();

		// data should now be rendered
		bulkDocs.forEach(doc => {
			expect(screen.getByText(doc.name)).toBeInTheDocument();
		});

		done();
	});
});
