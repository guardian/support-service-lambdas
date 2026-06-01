---
# This template adds the new lambda into the root cdk.ts file
inject: true
to: cdk/bin/cdk.ts
before: "// MARKER new-lambda: cdk-bin"
append: true
skip_if: ^<%= h.changeCase.pascal(lambdaName) %>
---
	<%= h.changeCase.pascal(lambdaName) %>,