/** @type {import('jest').Config} */
module.exports = {
	preset: 'ts-jest',
	testEnvironment: 'jsdom',
	// jsdom test env defaults to the 'browser' export condition which makes
	// the resolver pick ESM builds of CJS+ESM dual packages (e.g. dexie).
	// Force the node/CJS path so jest can require them without ESM hoops.
	testEnvironmentOptions: {
		customExportConditions: ['node', 'node-addons'],
	},
	transform: {
		'^.+\\.tsx?$': [
			require.resolve('ts-jest'),
			{
				tsconfig: 'tsconfig.test.json',
				diagnostics: {
					// rxdb >= 15 ships .d.ts files marked @ts-nocheck which
					// triggers TS18056 in newer ts-jest; ignore that purely
					// informational diagnostic so the suite still runs.
					ignoreCodes: [18056],
				},
			},
		],
	},
	moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
	setupFilesAfterEnv: ['./jest.setup.ts'],
	collectCoverage: true,
	collectCoverageFrom: ['./src/**/{!(index),}.ts'],
	coverageReporters: ['text', 'html', 'lcov'],
};
