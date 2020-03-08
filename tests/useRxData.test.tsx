import React, { FC, useCallback } from 'react';
import { setup, teardown, Consumer } from './helpers';
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
		{
			name: 'Darth Sidius',
			affiliation: 'Sith',
		},
		{
			name: 'Obi-Wan Kenobi',
			affiliation: 'Jedi',
		},
		{
			name: 'Qui-Gon Jin',
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
		const Child: FC = () => {
			const queryConstructor = useCallback(
				(c: RxCollection) => c.find(),
				[]
			);
			const { result: characters, isFetching, exhausted } = useRxData(
				'characters',
				queryConstructor
			);

			return (
				<Consumer
					characters={characters}
					isFetching={isFetching}
					exhausted={exhausted}
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

		// wait for data
		await waitForDomChange();

		// data should now be rendered
		bulkDocs.forEach(doc => {
			expect(screen.getByText(doc.name)).toBeInTheDocument();
		});

		// should be exhausted (no limit defined)
		expect(screen.getByText('exhausted')).toBeInTheDocument();

		done();
	});
});
