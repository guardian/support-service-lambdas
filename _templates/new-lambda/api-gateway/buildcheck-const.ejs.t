---
inject: true
to: buildcheck/data/build.ts
before: "export const build: HandlerDefinition\\[\\] = \\["
skip_if: "const <%= h.changeCase.camel(lambdaName) %>: HandlerDefinition"
---
// TODO: Move this const definition to maintain alphabetical order
const <%= h.changeCase.camel(lambdaName) %>: HandlerDefinition = {
	name: '<%= h.changeCase.param(lambdaName) %>',
	dependencies: {
		...dep.zod,
	},
	devDependencies: {
		...devDeps['@types/aws-lambda'],
	},
};
