module.exports = {
	preset: 'ts-jest',
	testEnvironment: 'jsdom',
	transform: {
		'^.+\\.(t|j)sx?$': require.resolve('ts-jest'),
	},
	moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
	globals: {
		'ts-jest': {
			tsConfig: 'tsconfig.test.json',
		},
	},
	setupFilesAfterEnv: ['./jest.setup.ts'],
	collectCoverage: true,
	collectCoverageFrom: ['./src/**/{!(index),}.ts'],
	coverageReporters: ['text', 'html', 'lcov'],
};
