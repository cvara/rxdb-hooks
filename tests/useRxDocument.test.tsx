import React, { FC, useState } from 'react';
import { setup, teardown, Character } from './helpers';
import {
	render,
	screen,
	waitForDomChange,
	fireEvent,
} from '@testing-library/react';
import { RxDatabase } from 'rxdb';
import useRxDocument from '../src/useRxDocument';
import Provider from '../src/Provider';

describe('useRxDocument', () => {
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

	it('should find a single document by its id', async done => {
		const Child: FC = () => {
			const { result: character, isFetching } = useRxDocument<Character>(
				'characters',
				'4'
			);

			return <Character character={character} isFetching={isFetching} />;
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

		expect(screen.queryByText('Obi-Wan Kenobi')).toBeInTheDocument();

		done();
	});

	it('should allow lazy evaluation of id', async done => {
		const Child: FC = () => {
			const [id, setId] = useState(undefined);

			const { result: character, isFetching } = useRxDocument<Character>(
				'characters',
				id
			);

			const onSetId = () => {
				setId('4');
			};

			return (
				<>
					<button onClick={onSetId}>setId</button>
					<Character character={character} isFetching={isFetching} />
				</>
			);
		};

		render(
			<Provider db={db} idAttribute="_id">
				<Child />
			</Provider>
		);

		// should render in loading state, with missing data
		expect(screen.getByText('loading')).toBeInTheDocument();
		expect(screen.queryByText('Obi-Wan Kenobi')).not.toBeInTheDocument();

		// emulate lazy evaluation of id
		fireEvent(
			screen.getByText('setId'),
			new MouseEvent('click', {
				bubbles: true,
				cancelable: true,
			})
		);

		// wait for data
		await waitForDomChange();

		// should exit loading state & data should be rendered
		expect(screen.queryByText('loading')).not.toBeInTheDocument();
		expect(screen.getByText('Obi-Wan Kenobi')).toBeInTheDocument();

		done();
	});

	it('should allow custom id attributes through Provider context', async done => {
		const Child: FC = () => {
			const { result: character, isFetching } = useRxDocument<Character>(
				'characters',
				'Yoda'
			);

			return <Character character={character} isFetching={isFetching} />;
		};

		render(
			<Provider db={db} idAttribute="name">
				<Child />
			</Provider>
		);

		// should render in loading state
		expect(screen.getByText('loading')).toBeInTheDocument();

		// wait for data
		await waitForDomChange();

		expect(screen.queryByText('Yoda')).toBeInTheDocument();

		done();
	});

	it('should allow custom id attributes through options', async done => {
		const Child: FC = () => {
			const { result: character, isFetching } = useRxDocument<Character>(
				'characters',
				'Yoda',
				{ idAttribute: 'name' }
			);

			return <Character character={character} isFetching={isFetching} />;
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

		expect(screen.queryByText('Yoda')).toBeInTheDocument();

		done();
	});

	it('should support lazy db instantiation', async done => {
		const Child: FC = () => {
			const { result: character, isFetching } = useRxDocument<Character>(
				'characters',
				'4'
			);

			return <Character character={character} isFetching={isFetching} />;
		};

		const App: FC = () => {
			const [lazyDb, setLazyDb] = useState(null);

			const handleInit = () => {
				setLazyDb(db);
			};

			return (
				<Provider db={lazyDb}>
					<Child />
					<button onClick={handleInit}>init</button>
				</Provider>
			);
		};

		render(<App />);

		// should render in loading state
		expect(screen.getByText('loading')).toBeInTheDocument();

		// trigger db init
		fireEvent(
			screen.getByText('init'),
			new MouseEvent('click', {
				bubbles: true,
				cancelable: true,
			})
		);

		// wait for data
		await waitForDomChange();

		expect(screen.queryByText('Obi-Wan Kenobi')).toBeInTheDocument();

		done();
	});
});
