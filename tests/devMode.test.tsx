import React from 'react';
import { setup, teardown, MyDatabase } from './helpers';

import { renderHook } from '@testing-library/react-hooks';
import { addRxPlugin } from 'rxdb';
import { RxDBDevModePlugin } from 'rxdb/plugins/dev-mode';
import Provider from '../src/Provider';
import { characters } from './mockData';
import useRxDB from '../src/useRxDB';

addRxPlugin(RxDBDevModePlugin);

describe('when RxDBDevModePlugin', () => {
	let db: MyDatabase;

	beforeAll(async done => {
		db = await setup(characters, 'characters');
		done();
	});

	afterAll(async done => {
		await teardown(db);
		done();
	});

	describe('useRxDB', () => {
		it('should return the db instsance', () => {
			const wrapper = ({ children }) => (
				<Provider db={db}>{children}</Provider>
			);
			const { result } = renderHook(() => useRxDB(), { wrapper });
			expect(result.current).toBe(db);
		});
	});
});
