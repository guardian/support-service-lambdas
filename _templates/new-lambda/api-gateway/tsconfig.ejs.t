---
# This template creates a tsconfig.json for the new lambda

to: handlers/<%=lambdaName%>/tsconfig.json
---
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "rootDir": "./src"
  }
}