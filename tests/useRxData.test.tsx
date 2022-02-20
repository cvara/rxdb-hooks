import React, { FC, useCallback, useEffect, useState } from 'react';
import {
	setup,
	teardown,
	CharacterList,
	Character,
	createDatabase,
	setupCollection,
	MyDatabase,
	delay,
} from './helpers';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { RxCollection } from 'rxdb';
import useRxData from '../src/useRxData';
import Provider from '../src/Provider';
import { characters } from './mockData';
import { act } from 'react-dom/test-utils';

describe('useRxData', () => {
	let db: MyDatabase;

	beforeAll(async (done) => {
		db = await setup(characters, 'characters');
		done();
	});

	afterAll(async (done) => {
		await teardown(db);
		done();
	});

	it('should read all data from a collection', async (done) => {
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
		await waitFor(async () => {
			// data should now be rendered
			characters.forEach((doc) => {
				expect(screen.queryByText(doc.name)).toBeInTheDocument();
			});

			// should be exhausted (we fetched everything in one go)
			expect(screen.getByText('isExhausted')).toBeInTheDocument();
			// result should be an array of RxDocuments
			expect(screen.getByText('RxDocument')).toBeInTheDocument();
		});

		act(() => {
			// attempt to reset list
			fireEvent(
				screen.getByText('reset'),
				new MouseEvent('click', {
					bubbles: true,
					cancelable: true,
				})
			);
		});

		// noop: cannot reset when not on infinite-scroll pagination
		expect(screen.queryByText('loading')).not.toBeInTheDocument();

		act(() => {
			// attempt to fetch page 2
			fireEvent(
				screen.getByText('fetch page 2'),
				new MouseEvent('click', {
					bubbles: true,
					cancelable: true,
				})
			);
		});

		// noop: not in traditional pagination
		expect(screen.queryByText('loading')).not.toBeInTheDocument();
		// data should still be rendered
		characters.forEach((doc) => {
			expect(screen.queryByText(doc.name)).toBeInTheDocument();
		});

		done();
	});

	it('should support queries based on findByIds()', async () => {
		const queriedIds = ['1', '2'];
		const Child: FC = () => {
			const queryConstructor = useCallback(
				(c: RxCollection<Character>) => c.findByIds(queriedIds),
				[]
			);
			const {
				result: characters,
				isFetching,
				isExhausted,
				resetList,
			} = useRxData<Character>('characters', queryConstructor, {
				json: true,
			});

			return (
				<>
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
		await waitFor(async () => {
			// data should now be rendered
			characters.forEach((doc) => {
				if (queriedIds.includes(doc.id)) {
					expect(screen.queryByText(doc.name)).toBeInTheDocument();
				} else {
					expect(
						screen.queryByText(doc.name)
					).not.toBeInTheDocument();
				}
			});
			expect(screen.queryByText('loading')).not.toBeInTheDocument();
		});
	});

	it('should cancel running findByIds() on unmount', async () => {
		const queriedIds = ['1', '2'];
		const Child: FC = () => {
			const queryConstructor = useCallback(
				async (c: RxCollection<Character>) => {
					// emulate long running query
					await delay(100);
					return c.findByIds(queriedIds);
				},
				[]
			);
			const {
				result: characters,
				isFetching,
				isExhausted,
				resetList,
			} = useRxData<Character>('characters', queryConstructor, {
				json: true,
			});

			return (
				<>
					<CharacterList
						characters={characters}
						isFetching={isFetching}
						isExhausted={isExhausted}
						resetList={resetList}
					/>
				</>
			);
		};

		// Will unmount the Child before the query has the time to complete
		const Parent: FC = ({ children }) => {
			const [isChildMounted, setIsChildMounted] = useState(true);

			useEffect(() => {
				setTimeout(() => {
					act(() => {
						setIsChildMounted(false);
					});
				}, 50);
			}, []);

			if (isChildMounted) {
				return <>{children}</>;
			}
			return null;
		};

		render(
			<Provider db={db}>
				<Parent>
					<Child />
				</Parent>
			</Provider>
		);

		// should render in loading state
		expect(screen.getByText('loading')).toBeInTheDocument();
		expect(screen.queryByText('isExhausted')).not.toBeInTheDocument();

		// let parent unmount the child
		await delay(60);

		// verify that child is unmounted
		expect(screen.queryByText('loading')).not.toBeInTheDocument();

		// wait out the long-running query
		await delay(50);
	});

	it('should return data in JSON format', async (done) => {
		const Child: FC = () => {
			const queryConstructor = useCallback(
				(c: RxCollection<Character>) => c.find(),
				[]
			);
			const {
				result: characters,
				isFetching,
				isExhausted,
			} = useRxData<Character>('characters', queryConstructor, {
				json: true,
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

		// should render in loading state
		expect(screen.getByText('loading')).toBeInTheDocument();
		expect(screen.queryByText('isExhausted')).not.toBeInTheDocument();

		// wait for data
		await waitFor(async () => {
			// data should now be rendered
			characters.forEach((doc) => {
				expect(screen.queryByText(doc.name)).toBeInTheDocument();
			});

			// should be isExhausted (no limit defined)
			expect(screen.getByText('isExhausted')).toBeInTheDocument();
			// result should be an array of plain objects
			expect(screen.getByText('JSON')).toBeInTheDocument();
		});

		done();
	});

	it('should support infinite scroll pagination', async (done) => {
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
		await waitFor(async () => {
			// first page data should now be rendered
			characters.slice(0, pageSize).forEach((doc) => {
				expect(screen.getByText(doc.name)).toBeInTheDocument();
			});
			// rest data should not be rendered
			characters.slice(pageSize).forEach((doc) => {
				expect(screen.queryByText(doc.name)).not.toBeInTheDocument();
			});

			// more data are present
			expect(screen.queryByText('isExhausted')).not.toBeInTheDocument();
		});

		act(() => {
			// trigger fetching of another page
			fireEvent(
				screen.getByText('more'),
				new MouseEvent('click', {
					bubbles: true,
					cancelable: true,
				})
			);
		});

		// should be loading
		expect(screen.getByText('loading')).toBeInTheDocument();
		// 2nd page should be the current page now
		expect(screen.getByText('current page: 2')).toBeInTheDocument();

		// wait for next page data to be rendered
		await waitFor(async () => {
			// next page should be rendered now
			characters.slice(pageSize, 2 * pageSize).forEach((doc) => {
				expect(screen.getByText(doc.name)).toBeInTheDocument();
			});
		});

		act(() => {
			// fetch last page
			fireEvent(
				screen.getByText('more'),
				new MouseEvent('click', {
					bubbles: true,
					cancelable: true,
				})
			);
		});

		// should be loading
		expect(screen.getByText('loading')).toBeInTheDocument();
		// 3rd page should be the current page now
		expect(screen.getByText('current page: 3')).toBeInTheDocument();

		// wait for last page data to be rendered
		await waitFor(async () => {
			// last page should be rendered now
			characters.slice(2 * pageSize, 3 * pageSize).forEach((doc) => {
				expect(screen.getByText(doc.name)).toBeInTheDocument();
			});

			// we fetched everything
			expect(screen.getByText('isExhausted')).toBeInTheDocument();
		});

		act(() => {
			// try to fetch more
			fireEvent(
				screen.getByText('more'),
				new MouseEvent('click', {
					bubbles: true,
					cancelable: true,
				})
			);
		});

		// should not be loading & should remain on same page:
		// there is nothing more to fetch
		expect(screen.queryByText('loading')).not.toBeInTheDocument();
		expect(screen.getByText('current page: 3')).toBeInTheDocument();

		// last page should still be rendered
		characters.slice(2 * pageSize, 3 * pageSize).forEach((doc) => {
			expect(screen.getByText(doc.name)).toBeInTheDocument();
		});

		act(() => {
			// trigger a reset
			fireEvent(
				screen.getByText('reset'),
				new MouseEvent('click', {
					bubbles: true,
					cancelable: true,
				})
			);
		});

		expect(screen.getByText('current page: 1')).toBeInTheDocument();

		await waitFor(async () => {
			// now only first page data should be rendered
			characters.slice(0, pageSize).forEach((doc) => {
				expect(screen.getByText(doc.name)).toBeInTheDocument();
			});
			characters.slice(pageSize).forEach((doc) => {
				expect(screen.queryByText(doc.name)).not.toBeInTheDocument();
			});
		});

		act(() => {
			// try to reset again
			fireEvent(
				screen.getByText('reset'),
				new MouseEvent('click', {
					bubbles: true,
					cancelable: true,
				})
			);
		});

		// should be a noop: already on page 1, no point in resetting
		expect(screen.queryByText('loading')).not.toBeInTheDocument();
		expect(screen.getByText('current page: 1')).toBeInTheDocument();

		// first page data should still be rendered
		characters.slice(0, pageSize).forEach((doc) => {
			expect(screen.getByText(doc.name)).toBeInTheDocument();
		});
		characters.slice(pageSize).forEach((doc) => {
			expect(screen.queryByText(doc.name)).not.toBeInTheDocument();
		});

		done();
	});

	it('should support traditional pagination', async (done) => {
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

		// wait for data
		await waitFor(async () => {
			// should not be in exhausted state
			expect(screen.queryByText('isExhausted')).not.toBeInTheDocument();

			// selected page data should now be rendered
			characters.slice(0, pageSize).forEach((doc) => {
				expect(screen.getByText(doc.name)).toBeInTheDocument();
			});
			// rest data should not be rendered
			characters.slice(pageSize).forEach((doc) => {
				expect(screen.queryByText(doc.name)).not.toBeInTheDocument();
			});

			// expect page count to be correctly computed
			expect(screen.getByText('page count: 3')).toBeInTheDocument();
		});

		act(() => {
			// trigger fetching of previous page
			fireEvent(
				screen.getByText('next page'),
				new MouseEvent('click', {
					bubbles: true,
					cancelable: true,
				})
			);
		});

		// should be loading
		expect(screen.getByText('loading')).toBeInTheDocument();

		// should not be in exhausted state
		expect(screen.queryByText('isExhausted')).not.toBeInTheDocument();

		// wait for next page data to be rendered
		await waitFor(async () => {
			// next page data should now be rendered
			characters.slice(pageSize, 2 * pageSize).forEach((doc) => {
				expect(screen.getByText(doc.name)).toBeInTheDocument();
			});
			// rest data should not be rendered
			[
				...characters.slice(0, pageSize),
				...characters.slice(2 * pageSize),
			].forEach((doc) => {
				expect(screen.queryByText(doc.name)).not.toBeInTheDocument();
			});

			// expect page count to be unaffected
			expect(screen.getByText('page count: 3')).toBeInTheDocument();
		});

		act(() => {
			// request a wrong page
			fireEvent(
				screen.getByText('wrong page'),
				new MouseEvent('click', {
					bubbles: true,
					cancelable: true,
				})
			);
		});

		// should be a noop since we requested a page that doesn't does not exist:
		// should not be loading
		expect(screen.queryByText('loading')).not.toBeInTheDocument();
		// same data should now be rendered
		characters.slice(pageSize, 2 * pageSize).forEach((doc) => {
			expect(screen.getByText(doc.name)).toBeInTheDocument();
		});
		[
			...characters.slice(0, pageSize),
			...characters.slice(2 * pageSize),
		].forEach((doc) => {
			expect(screen.queryByText(doc.name)).not.toBeInTheDocument();
		});

		// wrongly request more
		act(() => {
			fireEvent(
				screen.getByText('more'),
				new MouseEvent('click', {
					bubbles: true,
					cancelable: true,
				})
			);
		});

		// should be a noop when not in infinite scroll pagination:
		// should not be loading and should remain on same page
		expect(screen.queryByText('loading')).not.toBeInTheDocument();
		expect(screen.getByText('page count: 3')).toBeInTheDocument();

		done();
	});

	it('should handle null result during traditional pagination', async (done) => {
		const Child: FC = () => {
			const queryConstructor = useCallback(
				(c: RxCollection<Character>) =>
					c.findOne().where('id').equals('not existing!'),
				[]
			);
			const {
				result: characters,
				isFetching,
				isExhausted,
			} = useRxData<Character>('characters', queryConstructor, {
				pageSize: 2,
				pagination: 'Traditional',
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

		// should render in loading state
		expect(screen.getByText('loading')).toBeInTheDocument();

		// wait for data
		await waitFor(async () => {
			expect(screen.queryByText('loading')).not.toBeInTheDocument();
			characters.forEach((doc) => {
				expect(screen.queryByText(doc.name)).not.toBeInTheDocument();
			});
		});

		done();
	});

	it('should always convert results to array', async (done) => {
		const idToSearchFor = '1';
		const Child: FC = () => {
			const queryConstructor = useCallback(
				(c: RxCollection<Character>) =>
					c.findOne().where('id').equals('1'),
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

		await waitFor(async () => {
			characters.forEach((doc) => {
				if (doc.id === idToSearchFor) {
					expect(screen.getByText(doc.name)).toBeInTheDocument();
				} else {
					expect(
						screen.queryByText(doc.name)
					).not.toBeInTheDocument();
				}
			});
		});

		done();
	});

	it('should handle missing query', async (done) => {
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
		await delay(20);
		expect(screen.getByText('loading')).toBeInTheDocument();

		done();
	});

	it('should handle missing collection', async (done) => {
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
		await delay(20);
		expect(screen.getByText('loading')).toBeInTheDocument();

		done();
	});

	it('should handle missing database', async (done) => {
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
		await delay(20);
		expect(screen.getByText('loading')).toBeInTheDocument();

		done();
	});

	it('should set isFetching to true whenever the query changes', async (done) => {
		const Child: FC = () => {
			const [name, setName] = useState('');
			const queryConstructor = useCallback(
				(c: RxCollection<Character>) => {
					if (name) {
						return c.find().where('name').equals(name);
					}
					return c.find();
				},
				[name]
			);
			const {
				result: characters,
				isFetching,
				isExhausted,
			} = useRxData<Character>('characters', queryConstructor);

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
		await waitFor(async () => {
			// should have stopped loading
			expect(screen.queryByText('loading')).not.toBeInTheDocument();

			// data should now be rendered
			characters.forEach((doc) => {
				expect(screen.queryByText(doc.name)).toBeInTheDocument();
			});

			// should be isExhausted (no limit defined)
			expect(screen.getByText('isExhausted')).toBeInTheDocument();
			// result should be an array of RxDocuments
			expect(screen.getByText('RxDocument')).toBeInTheDocument();
		});

		act(() => {
			// trigger query change
			fireEvent(
				screen.getByText('search for Yoda'),
				new MouseEvent('click', {
					bubbles: true,
					cancelable: true,
				})
			);
		});

		// should start loading again
		expect(screen.queryByText('loading')).toBeInTheDocument();

		// wait for Yoda
		await waitFor(async () => {
			// new data fetched, loading should have stopped
			expect(screen.queryByText('loading')).not.toBeInTheDocument();

			// just making sure the correct data are fetched
			expect(screen.getByText('Yoda')).toBeInTheDocument();
			characters
				.filter((doc) => doc.name !== 'Yoda')
				.forEach((doc) => {
					expect(
						screen.queryByText(doc.name)
					).not.toBeInTheDocument();
				});
		});

		done();
	});
});

describe('useRxData + lazy collection init', () => {
	let db: MyDatabase;

	beforeEach(async (done) => {
		// create db without collection + data
		db = await createDatabase();
		done();
	});

	afterEach(async (done) => {
		await teardown(db);
		done();
	});

	it('should read data from lazily created collection', async (done) => {
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
			characters.forEach((doc) => {
				expect(screen.queryByText(doc.name)).toBeInTheDocument();
			});
		});

		done();
	});

	it('should read data from recreated collection', async (done) => {
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
			await db.removeCollection('characters');
			await setupCollection(db, characters, 'characters');
		});

		// wait for data
		await waitFor(async () => {
			// data should now be rendered
			characters.forEach((doc) => {
				expect(screen.queryByText(doc.name)).toBeInTheDocument();
			});

			// initial (now deleted) wrong characters data should not be rendered
			wrongCharacters.forEach((doc) => {
				expect(screen.queryByText(doc.name)).not.toBeInTheDocument();
			});
		});

		done();
	});
});
