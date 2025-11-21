---
# This template adds the new lambda into the root cdk.ts file
inject: true
to: cdk/bin/cdk.ts
after: "const stacks"
append: true
skip_if: ^<%= h.changeCase.pascal(lambdaName) %>
---
<% PascalCase = h.changeCase.pascal(lambdaName) %>
	<%= PascalCase %>,