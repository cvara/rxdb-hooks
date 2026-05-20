export type Override<T, R> = Omit<T, keyof R> & R;

/**
 * Local equivalent of rxdb's internal `DeepReadonly` type.
 *
 * Defined here (instead of imported from `rxdb/dist/types/types`) so that
 * `rxdb-hooks` does not rely on rxdb's internal subpath exports, which are
 * not part of the public API and shift between major versions of rxdb.
 */
export type DeepReadonly<T> = T extends (infer R)[]
	? DeepReadonlyArray<R>
	: // eslint-disable-next-line @typescript-eslint/ban-types
	T extends Function
	? T
	: T extends object
	? DeepReadonlyObject<T>
	: T;

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface DeepReadonlyArray<T> extends ReadonlyArray<DeepReadonly<T>> {}

type DeepReadonlyObject<T> = {
	readonly [P in keyof T]: DeepReadonly<T[P]>;
};
