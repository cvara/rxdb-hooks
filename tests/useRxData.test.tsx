import React, { FC, useCallback } from 'react';
import {
	setup,
	teardown,
	CharacterList,
	sortByNameAsc,
	sortByNameDesc,
	Character,
} from './helpers';
import {
	render,
	screen,
	waitForDomChange,
	fireEvent,
} from '@testing-library/react';
import { RxDatabase, RxCollection } from 'rxdb';
import useRxData from '../src/useRxData';
import Provider from '../src/Provider';

describe('useRxData', () => {
	let db: RxDatabase;
	const bulkDocs = [
		{
			id: '1',
			name: 'Darth Vader',
			affiliation: 'Sith',
		},
		{
			id: '2',
			name: 'Yoda',
			affiliation: 'Jedi',
		},
		{
			id: '3',
			name: 'Darth Sidius',
			affiliation: 'Sith',
		},
		{
			id: '4',
			name: 'Obi-Wan Kenobi',
			affiliation: 'Jedi',
		},
		{
			id: '5',
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

	it('should read all data from a collection', async done => {
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
				<CharacterList
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
		expect(screen.queryByText('exhausted')).not.toBeInTheDocument();

		// wait for data
		await waitForDomChange();

		// data should now be rendered
		bulkDocs.forEach(doc => {
			expect(screen.queryByText(doc.name)).toBeInTheDocument();
		});

		// should be exhausted (no limit defined)
		expect(screen.getByText('exhausted')).toBeInTheDocument();

		done();
	});

	it('should read paginated data from a collection', async done => {
		const pageSize = 2;

		const Child: FC = () => {
			const queryConstructor = useCallback(
				(c: RxCollection) => c.find(),
				[]
			);
			const {
				result: characters,
				isFetching,
				exhausted,
				fetchMore,
				resetList,
			} = useRxData('characters', queryConstructor, {
				pageSize,
			});

			return (
				<CharacterList
					characters={characters}
					isFetching={isFetching}
					exhausted={exhausted}
					fetchMore={fetchMore}
					resetList={resetList}
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

		// first page data should now be rendered
		bulkDocs.slice(0, pageSize).forEach(doc => {
			expect(screen.getByText(doc.name)).toBeInTheDocument();
		});
		// rest data should not be rendered
		bulkDocs.slice(pageSize).forEach(doc => {
			expect(screen.queryByText(doc.name)).not.toBeInTheDocument();
		});

		// more data are present
		expect(screen.queryByText('exhausted')).not.toBeInTheDocument();

		// trigger fetching of another page
		fireEvent(
			screen.getByText('more'),
			new MouseEvent('click', {
				bubbles: true,
				cancelable: true,
			})
		);

		// should be loading
		expect(screen.getByText('loading')).toBeInTheDocument();

		// wait for next page data to be rendered
		await waitForDomChange();

		// next page should be rendered now
		bulkDocs.slice(pageSize, pageSize).forEach(doc => {
			expect(screen.getByText(doc.name)).toBeInTheDocument();
		});

		// fetch last page
		fireEvent(
			screen.getByText('more'),
			new MouseEvent('click', {
				bubbles: true,
				cancelable: true,
			})
		);

		// should be loading
		expect(screen.getByText('loading')).toBeInTheDocument();

		// wait for last page data to be rendered
		await waitForDomChange();

		// last page should be rendered now
		bulkDocs.slice(2 * pageSize, pageSize).forEach(doc => {
			expect(screen.getByText(doc.name)).toBeInTheDocument();
		});

		// we fetched everything
		expect(screen.getByText('exhausted')).toBeInTheDocument();

		// trigger a reset
		fireEvent(
			screen.getByText('reset'),
			new MouseEvent('click', {
				bubbles: true,
				cancelable: true,
			})
		);

		await waitForDomChange();

		// now only first page data should be rendered
		bulkDocs.slice(0, pageSize).forEach(doc => {
			expect(screen.getByText(doc.name)).toBeInTheDocument();
		});
		bulkDocs.slice(pageSize).forEach(doc => {
			expect(screen.queryByText(doc.name)).not.toBeInTheDocument();
		});

		done();
	});

	it('should read sorted data from a collection', async done => {
		const Child: FC = () => {
			const queryConstructor = useCallback(
				(c: RxCollection) => c.find(),
				[]
			);
			const { result: characters, isFetching, exhausted } = useRxData(
				'characters',
				queryConstructor,
				{
					sortBy: 'name',
					sortOrder: 'asc',
				}
			);
			return (
				<CharacterList
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

		// wait for data
		await waitForDomChange();

		const sortedDocs = bulkDocs.slice(0).sort(sortByNameAsc);
		// data should now be rendered in ascending name order
		sortedDocs.forEach((doc, index) => {
			expect(Number(screen.queryByText(doc.name).dataset.index)).toBe(
				index
			);
		});

		done();
	});

	it('should default to desc sort order', async done => {
		const Child: FC = () => {
			const queryConstructor = useCallback(
				(c: RxCollection) => c.find(),
				[]
			);
			const { result: characters, isFetching, exhausted } = useRxData(
				'characters',
				queryConstructor,
				{
					sortBy: 'name', // omitting sort order
				}
			);
			return (
				<CharacterList
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

		// wait for data
		await waitForDomChange();

		const sortedDocs = bulkDocs.slice(0).sort(sortByNameDesc);
		// data should now be rendered in ascending name order
		sortedDocs.forEach((doc, index) => {
			expect(Number(screen.queryByText(doc.name).dataset.index)).toBe(
				index
			);
		});

		done();
	});

	it('should always convert results to array', async done => {
		const idToSearchFor = '1';
		const Child: FC = () => {
			const queryConstructor = useCallback(
				(c: RxCollection) =>
					c
						.findOne()
						.where('id')
						.equals('1'),
				[]
			);
			const {
				result: characters,
				isFetching,
				exhausted,
				fetchMore,
			} = useRxData('characters', queryConstructor);
			return (
				<CharacterList
					characters={characters as Character[]}
					isFetching={isFetching}
					exhausted={exhausted}
					fetchMore={fetchMore}
				/>
			);
		};
		render(
			<Provider db={db}>
				<Child />
			</Provider>
		);

		await waitForDomChange();

		bulkDocs.forEach(doc => {
			if (doc.id === idToSearchFor) {
				expect(screen.getByText(doc.name)).toBeInTheDocument();
			} else {
				expect(screen.queryByText(doc.name)).not.toBeInTheDocument();
			}
		});

		done();
	});

	it('should handle missing query', async done => {
		const Child: FC = () => {
			const queryConstructor = useCallback(() => undefined, []);
			const {
				result: characters,
				isFetching,
				exhausted,
				fetchMore,
			} = useRxData('characters', queryConstructor);

			return (
				<CharacterList
					characters={characters as Character[]}
					isFetching={isFetching}
					exhausted={exhausted}
					fetchMore={fetchMore}
				/>
			);
		};
		render(
			<Provider db={db}>
				<Child />
			</Provider>
		);

		// dom should remain in loading state
		expect(screen.getByText('loading')).toBeInTheDocument();
		try {
			await waitForDomChange({ timeout: 500 });
		} catch (err) {
			expect(screen.getByText('loading')).toBeInTheDocument();
		}

		done();
	});

	it('should handle missing collection', async done => {
		const Child: FC = () => {
			const queryConstructor = useCallback(
				(c: RxCollection) => c.find(),
				[]
			);
			const {
				result: characters,
				isFetching,
				exhausted,
				fetchMore,
			} = useRxData('does_not_exist', queryConstructor);
			return (
				<CharacterList
					characters={characters as Character[]}
					isFetching={isFetching}
					exhausted={exhausted}
					fetchMore={fetchMore}
				/>
			);
		};
		render(
			<Provider db={db}>
				<Child />
			</Provider>
		);

		// dom should remain in loading state
		expect(screen.getByText('loading')).toBeInTheDocument();
		try {
			await waitForDomChange({ timeout: 500 });
		} catch (err) {
			expect(screen.getByText('loading')).toBeInTheDocument();
		}

		done();
	});

	it('should handle missing database', async done => {
		const Child: FC = () => {
			const queryConstructor = useCallback(
				(c: RxCollection) => c.find(),
				[]
			);
			const {
				result: characters,
				isFetching,
				exhausted,
				fetchMore,
			} = useRxData('characters', queryConstructor);
			return (
				<CharacterList
					characters={characters as Character[]}
					isFetching={isFetching}
					exhausted={exhausted}
					fetchMore={fetchMore}
				/>
			);
		};
		render(
			<Provider db={undefined}>
				<Child />
			</Provider>
		);

		// dom should remain in loading state
		expect(screen.getByText('loading')).toBeInTheDocument();
		try {
			await waitForDomChange({ timeout: 500 });
		} catch (err) {
			expect(screen.getByText('loading')).toBeInTheDocument();
		}

		done();
	});
});
