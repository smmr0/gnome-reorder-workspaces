/* global module */

module.exports = (async () => {
	const eslintConfigSummer = (await import('eslint-config-summer')).default

	return {
		...eslintConfigSummer,
		languageOptions: {
			...eslintConfigSummer.languageOptions,
			parserOptions: {
				...eslintConfigSummer.languageOptions.parserOptions,
				sourceType: 'script',
			},
		},
	}
})()
