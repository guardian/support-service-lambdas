---
inject: true
to: buildcheck/data/build.ts
before: "// MARKER new-lambda: buildcheck-reference"
skip_if: "\\s+<%= h.changeCase.camel(lambdaName) %>,"
---
	<%= h.changeCase.camel(lambdaName) %>,