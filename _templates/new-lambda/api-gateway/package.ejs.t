---
# This template creates a package.json for the new lambda

to: handlers/<%=lambdaName%>/package.json
sh: git add handlers/<%=lambdaName%>/package.json
---
{
  "name": "<%=lambdaName%>",
  "scripts": {
    "test": "jest --group=-integration",
    "it-test": "jest --group=integration",
    "type-check": "tsc --noEmit",
    "build": "esbuild --bundle --platform=node --target=node18 --outfile=target/index.js src/index.ts",
    "lint": "eslint src/**/*.ts",
    "package": "pnpm type-check && pnpm lint && pnpm test && pnpm build && cd target; zip -qr <%=lambdaName%>.zip ./*.js",
    "check-formatting": "prettier --check **/*.ts"
  },
  "devDependencies": {
    "@types/aws-lambda": "^8.10.129"
  }
}