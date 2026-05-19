export const srcOnly = {
	lint: "eslint --cache --cache-location /tmp/eslintcache/ 'src/**/*.ts'",
	test: 'jest --group=-integration --passWithNoTests',
};

export const openApiScripts = {
	'openapi:lint': 'redocly lint openapi.yaml',
	'openapi:preview':
		'redocly build-docs openapi.yaml --output target/docs/index.html && open target/docs/index.html',
};
