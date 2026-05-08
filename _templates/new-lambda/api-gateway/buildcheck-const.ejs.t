---
inject: true
to: buildcheck/data/build.ts
before: "// MARKER new-lambda: buildcheck-const"
skip_if: "const <%= h.changeCase.camel(lambdaName) %>: HandlerDefinition"
---
const <%= h.changeCase.camel(lambdaName) %>: HandlerDefinition = {
	name: '<%= h.changeCase.param(lambdaName) %>',
	dependencies: {
		...dep.zod,
	},
	devDependencies: {
		...devDeps['@types/aws-lambda'],
	},
};
