/**
 * Second variable in array is a function that can be invoked to cancel the promise.
 */
export type CancelablePromise<T> = [Promise<T>, () => void];

/**
 * Makes promise cancelable.
 * Wraps original promise in an object that exposes said promise
 * and also exposes a cancel() method for canceling the promise.
 * Canceling the promise will prevent it from resolving/rejecting once the
 * the underlying promise resolves/reject.
 */
export const getCancelablePromise = <T>(
	promise: Promise<T>
): CancelablePromise<T> => {
	let hasCanceled = false;

	const wrappedPromise = new Promise<T>((resolve, reject) => {
		promise.then(
			(val: T) => {
				if (!hasCanceled) {
					resolve(val);
				}
			},
			(error: any) => {
				if (!hasCanceled) {
					reject(error);
				}
			}
		);
	});

	return [
		wrappedPromise,
		() => {
			hasCanceled = true;
		},
	];
};
