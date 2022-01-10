module.exports = {
	preset: 'ts-jest',
	testEnvironment: 'jsdom',
	transform: {
		'^.+\\.tsx?$': require.resolve('ts-jest'),
	},
	moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
	globals: {
		'ts-jest': {
			tsconfig: 'tsconfig.test.json',
		},
	},
	setupFilesAfterEnv: ['./jest.setup.ts'],
	collectCoverage: true,
	collectCoverageFrom: ['./src/**/{!(index),}.ts'],
	coverageReporters: ['text', 'html', 'lcov'],
};
