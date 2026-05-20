import '@testing-library/jest-dom';
import 'fake-indexeddb/auto';

// rxdb >= 16 uses crypto.subtle for schema hashing, which requires
// TextEncoder/TextDecoder and a Web Crypto implementation. jsdom < 22
// does not expose these in the browser-like global, so polyfill them
// from node's built-ins.
import { TextEncoder, TextDecoder } from 'util';
import { webcrypto } from 'crypto';

const g = globalThis as unknown as {
	TextEncoder?: typeof TextEncoder;
	TextDecoder?: typeof TextDecoder;
	crypto?: Crypto;
};
if (typeof g.TextEncoder === 'undefined') {
	g.TextEncoder = TextEncoder;
}
if (typeof g.TextDecoder === 'undefined') {
	g.TextDecoder = TextDecoder;
}
if (typeof g.crypto === 'undefined' || typeof g.crypto.subtle === 'undefined') {
	Object.defineProperty(globalThis, 'crypto', {
		value: webcrypto,
		configurable: true,
		writable: true,
	});
}
