module.exports = {
	root: true,
	parser: '@typescript-eslint/parser',
	plugins: ['@typescript-eslint', 'react'],
	env: {
		es6: true,
		browser: true,
		node: true,
	},
	extends: [
		'eslint:recommended',
		'plugin:@typescript-eslint/eslint-recommended',
		'plugin:@typescript-eslint/recommended',
		'plugin:react/recommended',
		'plugin:react-hooks/recommended',
		'prettier',
	],
	settings: {
		react: {
			version: 'detect',
		},
	},
	rules: {
		'react/prop-types': 0,
		'@typescript-eslint/explicit-function-return-type': 0,
	},
};
