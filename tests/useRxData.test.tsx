import React, { FC, useCallback, useState } from 'react';
import {
	setup,
	teardown,
	CharacterList,
	Character,
	createDatabase,
	setupCollection,
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
import { characters } from './mockData';

describe('useRxData', () => {
	let db: RxDatabase;

	beforeAll(async done => {
		db = await setup(characters, 'characters');
		done();
	});

	afterAll(async done => {
		await teardown(db);
		done();
	});

	it('should read all data from a collection', async done => {
		const Child: FC = () => {
			const queryConstructor = useCallback(
				(c: RxCollection<Character>) => c.find(),
				[]
			);
			const {
				result: characters,
				isFetching,
				isExhausted,
				resetList,
				fetchPage,
			} = useRxData<Character>('characters', queryConstructor);

			return (
				<>
					<button
						onClick={() => {
							fetchPage(2);
						}}
					>
						fetch page 2
					</button>
					<CharacterList
						characters={characters}
						isFetching={isFetching}
						isExhausted={isExhausted}
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

		// attempt to reset list
		fireEvent(
			screen.getByText('reset'),
			new MouseEvent('click', {
				bubbles: true,
				cancelable: true,
			})
		);

		// noop: cannot reset when not on infinite-scroll pagination
		expect(screen.queryByText('loading')).not.toBeInTheDocument();

		// attempt to fetch page 2
		fireEvent(
			screen.getByText('fetch page 2'),
			new MouseEvent('click', {
				bubbles: true,
				cancelable: true,
			})
		);

		// noop: not in traditional pagination
		expect(screen.queryByText('loading')).not.toBeInTheDocument();
		// data should still be rendered
		characters.forEach(doc => {
			expect(screen.queryByText(doc.name)).toBeInTheDocument();
		});

		done();
	});

	it('should return data in JSON format', async done => {
		const Child: FC = () => {
			const queryConstructor = useCallback(
				(c: RxCollection<Character>) => c.find(),
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
		characters.forEach(doc => {
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
				(c: RxCollection<Character>) => c.find(),
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
		characters.slice(0, pageSize).forEach(doc => {
			expect(screen.getByText(doc.name)).toBeInTheDocument();
		});
		// rest data should not be rendered
		characters.slice(pageSize).forEach(doc => {
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
		characters.slice(pageSize, pageSize).forEach(doc => {
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
		characters.slice(2 * pageSize, pageSize).forEach(doc => {
			expect(screen.getByText(doc.name)).toBeInTheDocument();
		});

		// we fetched everything
		expect(screen.getByText('isExhausted')).toBeInTheDocument();

		// try to fetch more
		fireEvent(
			screen.getByText('more'),
			new MouseEvent('click', {
				bubbles: true,
				cancelable: true,
			})
		);

		// should not be loading & should remain on same page:
		// there is nothing more to fetch
		expect(screen.queryByText('loading')).not.toBeInTheDocument();
		expect(screen.getByText('current page: 3')).toBeInTheDocument();

		// last page should still be rendered
		characters.slice(2 * pageSize, pageSize).forEach(doc => {
			expect(screen.getByText(doc.name)).toBeInTheDocument();
		});

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
		characters.slice(0, pageSize).forEach(doc => {
			expect(screen.getByText(doc.name)).toBeInTheDocument();
		});
		characters.slice(pageSize).forEach(doc => {
			expect(screen.queryByText(doc.name)).not.toBeInTheDocument();
		});

		// try to reset again
		fireEvent(
			screen.getByText('reset'),
			new MouseEvent('click', {
				bubbles: true,
				cancelable: true,
			})
		);

		// should be a noop: already on page 1, no point in resetting
		expect(screen.queryByText('loading')).not.toBeInTheDocument();
		expect(screen.getByText('current page: 1')).toBeInTheDocument();

		// first page data should still be rendered
		characters.slice(0, pageSize).forEach(doc => {
			expect(screen.getByText(doc.name)).toBeInTheDocument();
		});
		characters.slice(pageSize).forEach(doc => {
			expect(screen.queryByText(doc.name)).not.toBeInTheDocument();
		});

		done();
	});

	it('should support traditional pagination', async done => {
		const pageSize = 2;

		const Child: FC = () => {
			const queryConstructor = useCallback(
				(c: RxCollection<Character>) => c.find(),
				[]
			);
			const {
				result: characters,
				isFetching,
				isExhausted,
				pageCount,
				currentPage,
				fetchPage,
				fetchMore,
				resetList,
			} = useRxData<Character>('characters', queryConstructor, {
				pageSize,
				pagination: 'Traditional',
			});

			return (
				<>
					<button
						onClick={() => {
							fetchPage(currentPage + 1);
						}}
					>
						next page
					</button>
					<button
						onClick={() => {
							fetchPage(0);
						}}
					>
						wrong page
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

		// wait for data (twice since pages are also counted)
		await waitForDomChange();
		await waitForDomChange();

		// should not be in exhausted state
		expect(screen.queryByText('isExhausted')).not.toBeInTheDocument();

		// selected page data should now be rendered
		characters.slice(0, pageSize).forEach(doc => {
			expect(screen.getByText(doc.name)).toBeInTheDocument();
		});
		// rest data should not be rendered
		characters.slice(pageSize).forEach(doc => {
			expect(screen.queryByText(doc.name)).not.toBeInTheDocument();
		});

		// expect page count to be correctly computed
		expect(screen.getByText('page count: 3')).toBeInTheDocument();

		// trigger fetching of previous page
		fireEvent(
			screen.getByText('next page'),
			new MouseEvent('click', {
				bubbles: true,
				cancelable: true,
			})
		);

		// should be loading
		expect(screen.getByText('loading')).toBeInTheDocument();

		// should not be in exhausted state
		expect(screen.queryByText('isExhausted')).not.toBeInTheDocument();

		// wait for next page data to be rendered
		await waitForDomChange();

		// next page data should now be rendered
		characters.slice(pageSize, pageSize).forEach(doc => {
			expect(screen.getByText(doc.name)).toBeInTheDocument();
		});
		// rest data should not be rendered
		[
			...characters.slice(0, pageSize),
			...characters.slice(2 * pageSize),
		].forEach(doc => {
			expect(screen.queryByText(doc.name)).not.toBeInTheDocument();
		});

		// expect page count to be unaffected
		expect(screen.getByText('page count: 3')).toBeInTheDocument();

		// request a wrong page
		fireEvent(
			screen.getByText('wrong page'),
			new MouseEvent('click', {
				bubbles: true,
				cancelable: true,
			})
		);

		// should be a noop since we requested a page that doesn't does not exist:
		// should not be loading
		expect(screen.queryByText('loading')).not.toBeInTheDocument();
		// same data should now be rendered
		characters.slice(pageSize, pageSize).forEach(doc => {
			expect(screen.getByText(doc.name)).toBeInTheDocument();
		});
		[
			...characters.slice(0, pageSize),
			...characters.slice(2 * pageSize),
		].forEach(doc => {
			expect(screen.queryByText(doc.name)).not.toBeInTheDocument();
		});

		// wrongly request more
		fireEvent(
			screen.getByText('more'),
			new MouseEvent('click', {
				bubbles: true,
				cancelable: true,
			})
		);

		// should be a noop when not in infinite scroll pagination:
		// should not be loading and should remain on same page
		expect(screen.queryByText('loading')).not.toBeInTheDocument();
		expect(screen.getByText('page count: 3')).toBeInTheDocument();

		done();
	});

	it('should always convert results to array', async done => {
		const idToSearchFor = '1';
		const Child: FC = () => {
			const queryConstructor = useCallback(
				(c: RxCollection<Character>) =>
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

		characters.forEach(doc => {
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
				(c: RxCollection<Character>) => c.find(),
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
				(c: RxCollection<Character>) => c.find(),
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
				(c: RxCollection<Character>) => {
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
		characters.forEach(doc => {
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
		characters
			.filter(doc => doc.name !== 'Yoda')
			.forEach(doc => {
				expect(screen.queryByText(doc.name)).not.toBeInTheDocument();
			});

		done();
	});
});

describe('useRxData + lazy collection init', () => {
	let db: RxDatabase;

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
			const { result: characters, isFetching, isExhausted } = useRxData<
				Character
			>('characters', queryConstructor);

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

		// lazily create collection
		await setupCollection(db, characters, 'characters');

		// wait for data - this will timeout
		await waitForDomChange();

		done();
	});
});
