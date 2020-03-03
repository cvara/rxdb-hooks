import RxDB, { setup, teardown } from './rxdb';
import { RxDatabase } from 'rxdb';

describe('dummy test', () => {
	let db: RxDatabase;

	beforeAll(async done => {
		db = await setup('characters');
		done();
	});

	afterAll(async done => {
		await teardown(db);
		done();
	});

	it('should create a database and a collection', () => {
		expect(RxDB.isRxDatabase(db)).toBe(true);
		expect(RxDB.isRxCollection(db['characters'])).toBe(true);
	});
});
