import { delay } from './helpers';
import { getCancelablePromise } from '../src/helpers';

describe('getCancelablePromise()', () => {
	it('should allow uncancelled promises to resolve', () => {
		const promise = new Promise<string>((resolve) => {
			setTimeout(() => {
				resolve('Voila');
			}, 10);
		});
		const [cancelable] = getCancelablePromise(promise);
		return expect(cancelable).resolves.toBe('Voila');
	});

	it('should allow uncancelled promises to reject', () => {
		const promise = new Promise((resolve, reject) => {
			setTimeout(() => {
				reject('Boom');
			}, 10);
		});
		const [cancelable] = getCancelablePromise(promise);
		return expect(cancelable).rejects.toBe('Boom');
	});

	it('should allow cancelling resolving promises', async () => {
		const promise = new Promise<string>((resolve) => {
			setTimeout(() => {
				resolve('Voila');
			}, 10);
		});
		const [cancelable, cancel] = getCancelablePromise(promise);
		const spy = jest.fn();
		cancelable.then(spy);
		cancel();
		await delay(15);
		expect(spy.mock.calls.length).toBe(0);
	});

	it('should allow cancelling rejecting promises', async () => {
		const promise = new Promise((resolve, reject) => {
			setTimeout(reject, 10);
		});
		const [cancelable, cancel] = getCancelablePromise(promise);
		const spy = jest.fn();
		cancelable.catch(spy);
		cancel();
		await delay(15);
		expect(spy.mock.calls.length).toBe(0);
	});
});
