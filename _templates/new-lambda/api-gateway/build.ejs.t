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

---
inject: true
to: buildcheck/data/build.ts
after: "export const build: HandlerDefinition\\[\\] = \\["
skip_if: "\\s+<%= h.changeCase.camel(lambdaName) %>,"
---
	<%= h.changeCase.camel(lambdaName) %>, // TODO: Move this entry to maintain alphabetical order
