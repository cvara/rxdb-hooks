import React, { FC, useCallback, useState } from 'react';
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
			const { result: characters, isFetching, isExhausted } = useRxData<
				Character
			>('characters', queryConstructor);

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
		bulkDocs.forEach(doc => {
			expect(screen.queryByText(doc.name)).toBeInTheDocument();
		});

		// should be isExhausted (no limit defined)
		expect(screen.getByText('isExhausted')).toBeInTheDocument();
		// result should be an array of RxDocuments
		expect(screen.getByText('RxDocument')).toBeInTheDocument();

		done();
	});

	it('should return data in JSON format', async done => {
		const Child: FC = () => {
			const queryConstructor = useCallback(
				(c: RxCollection) => c.find(),
				[]
			);
			const { result: characters, isFetching, isExhausted } = useRxData<
				Character
			>('characters', queryConstructor, { json: true });

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
		bulkDocs.forEach(doc => {
			expect(screen.queryByText(doc.name)).toBeInTheDocument();
		});

		// should be isExhausted (no limit defined)
		expect(screen.getByText('isExhausted')).toBeInTheDocument();
		// result should be an array of plain objects
		expect(screen.getByText('JSON')).toBeInTheDocument();

		done();
	});

	it('should support infinite scroll pagination', async done => {
		const pageSize = 2;

		const Child: FC = () => {
			const queryConstructor = useCallback(
				(c: RxCollection) => c.find(),
				[]
			);
			const {
				result: characters,
				isFetching,
				isExhausted,
				currentPage,
				fetchMore,
				resetList,
			} = useRxData<Character>('characters', queryConstructor, {
				pageSize,
			});

			return (
				<CharacterList
					characters={characters}
					isFetching={isFetching}
					isExhausted={isExhausted}
					currentPage={currentPage}
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
		// should start at 1st page
		expect(screen.getByText('current page: 1')).toBeInTheDocument();

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
		expect(screen.queryByText('isExhausted')).not.toBeInTheDocument();

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
		// 2nd page should be the current page now
		expect(screen.getByText('current page: 2')).toBeInTheDocument();

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
		// 3rd page should be the current page now
		expect(screen.getByText('current page: 3')).toBeInTheDocument();

		// wait for last page data to be rendered
		await waitForDomChange();

		// last page should be rendered now
		bulkDocs.slice(2 * pageSize, pageSize).forEach(doc => {
			expect(screen.getByText(doc.name)).toBeInTheDocument();
		});

		// we fetched everything
		expect(screen.getByText('isExhausted')).toBeInTheDocument();

		// trigger a reset
		fireEvent(
			screen.getByText('reset'),
			new MouseEvent('click', {
				bubbles: true,
				cancelable: true,
			})
		);

		expect(screen.getByText('current page: 1')).toBeInTheDocument();

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

	it('should support traditional pagination', async done => {
		const startingPage = 2;
		const pageSize = 2;

		const Child: FC = () => {
			const queryConstructor = useCallback(
				(c: RxCollection) => c.find(),
				[]
			);
			const {
				result: characters,
				isFetching,
				isExhausted,
				pageCount,
				fetchPage,
				fetchMore,
				resetList,
			} = useRxData<Character>('characters', queryConstructor, {
				pageSize,
				startingPage,
			});

			return (
				<>
					<button
						onClick={() => {
							fetchPage(startingPage - 1);
						}}
					>
						previous page
					</button>
					<CharacterList
						characters={characters}
						isFetching={isFetching}
						isExhausted={isExhausted}
						pageCount={pageCount}
						fetchMore={fetchMore}
						resetList={resetList}
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

		// wait for data
		await waitForDomChange();

		// selected page data should now be rendered
		bulkDocs.slice((startingPage - 1) * pageSize, pageSize).forEach(doc => {
			expect(screen.getByText(doc.name)).toBeInTheDocument();
		});
		// rest data should not be rendered
		[
			...bulkDocs.slice(0, (startingPage - 1) * pageSize),
			...bulkDocs.slice((startingPage - 1) * pageSize + pageSize),
		].forEach(doc => {
			expect(screen.queryByText(doc.name)).not.toBeInTheDocument();
		});

		// expect page count to be correctly computed
		expect(screen.getByText('page count: 3')).toBeInTheDocument();

		// trigger fetching of previous page
		fireEvent(
			screen.getByText('previous page'),
			new MouseEvent('click', {
				bubbles: true,
				cancelable: true,
			})
		);

		// should be loading
		expect(screen.getByText('loading')).toBeInTheDocument();

		// wait for previous page data to be rendered
		await waitForDomChange();

		// previous page data should now be rendered
		bulkDocs.slice((startingPage - 2) * pageSize, pageSize).forEach(doc => {
			expect(screen.getByText(doc.name)).toBeInTheDocument();
		});
		// rest data should not be rendered
		[
			...bulkDocs.slice(0, (startingPage - 2) * pageSize),
			...bulkDocs.slice((startingPage - 2) * pageSize + pageSize),
		].forEach(doc => {
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
			const { result: characters, isFetching, isExhausted } = useRxData<
				Character
			>('characters', queryConstructor, {
				sortBy: 'name',
				sortOrder: 'asc',
			});
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
			const { result: characters, isFetching, isExhausted } = useRxData<
				Character
			>('characters', queryConstructor, {
				sortBy: 'name', // omitting sort order
			});
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
				isExhausted,
				fetchMore,
			} = useRxData<Character>('characters', queryConstructor);
			return (
				<CharacterList
					characters={characters as Character[]}
					isFetching={isFetching}
					isExhausted={isExhausted}
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
				isExhausted,
				fetchMore,
			} = useRxData<Character>('characters', queryConstructor);

			return (
				<CharacterList
					characters={characters as Character[]}
					isFetching={isFetching}
					isExhausted={isExhausted}
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
			await waitForDomChange({ timeout: 100 });
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
				isExhausted,
				fetchMore,
			} = useRxData<Character>('does_not_exist', queryConstructor);
			return (
				<CharacterList
					characters={characters as Character[]}
					isFetching={isFetching}
					isExhausted={isExhausted}
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
			await waitForDomChange({ timeout: 100 });
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
				isExhausted,
				fetchMore,
			} = useRxData<Character>('characters', queryConstructor);
			return (
				<CharacterList
					characters={characters as Character[]}
					isFetching={isFetching}
					isExhausted={isExhausted}
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
			await waitForDomChange({ timeout: 100 });
		} catch (err) {
			expect(screen.getByText('loading')).toBeInTheDocument();
		}

		done();
	});

	it('should set isFetching to true whenever the query changes', async done => {
		const Child: FC = () => {
			const [name, setName] = useState('');
			const queryConstructor = useCallback(
				(c: RxCollection) => {
					if (name) {
						return c
							.find()
							.where('name')
							.equals(name);
					}
					return c.find();
				},
				[name]
			);
			const { result: characters, isFetching, isExhausted } = useRxData<
				Character
			>('characters', queryConstructor);

			return (
				<>
					<button
						onClick={() => {
							setName('Yoda');
						}}
					>
						search for Yoda
					</button>
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
		expect(screen.queryByText('isExhausted')).not.toBeInTheDocument();

		// wait for data
		await waitForDomChange();

		// should have stopped loading
		expect(screen.queryByText('loading')).not.toBeInTheDocument();

		// data should now be rendered
		bulkDocs.forEach(doc => {
			expect(screen.queryByText(doc.name)).toBeInTheDocument();
		});

		// should be isExhausted (no limit defined)
		expect(screen.getByText('isExhausted')).toBeInTheDocument();
		// result should be an array of RxDocuments
		expect(screen.getByText('RxDocument')).toBeInTheDocument();

		// trigger query change
		fireEvent(
			screen.getByText('search for Yoda'),
			new MouseEvent('click', {
				bubbles: true,
				cancelable: true,
			})
		);

		// should start loading again
		expect(screen.queryByText('loading')).toBeInTheDocument();

		// wait for Yoda
		await waitForDomChange();

		// new data fetched, loading should have stopped
		expect(screen.queryByText('loading')).not.toBeInTheDocument();

		// just making sure the correct data are fetched
		expect(screen.getByText('Yoda')).toBeInTheDocument();
		bulkDocs
			.filter(doc => doc.name !== 'Yoda')
			.forEach(doc => {
				expect(screen.queryByText(doc.name)).not.toBeInTheDocument();
			});

		done();
	});
});
