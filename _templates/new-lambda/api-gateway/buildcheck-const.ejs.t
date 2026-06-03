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
	<% if (includeOpenApiDoc === 'Y'){ %>
		...devDeps['@redocly/cli'],
    },
    moduleDependencies: [moduleLogger, moduleRouting],
    extraScripts: {
        ...openApiScripts,
        package: `pnpm type-check && pnpm lint && pnpm openapi:lint && pnpm check-formatting && pnpm test && pnpm build && cd target && zip -qr <%= lambdaName %>.zip ./*.js.map ./*.js`,
    <% } %>
    },
	moduleDependencies: [],
};
