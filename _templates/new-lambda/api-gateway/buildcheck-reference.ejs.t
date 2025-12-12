---
inject: true
to: buildcheck/data/build.ts
after: "export const build: HandlerDefinition\\[\\] = \\["
skip_if: "\\s+<%= h.changeCase.camel(lambdaName) %>,"
---
	<%= h.changeCase.camel(lambdaName) %>,