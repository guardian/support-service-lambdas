---
# This template creates a tsconfig.json for the new lambda

to: handlers/<%=lambdaName%>/tsconfig.json
sh: git add handlers/<%=lambdaName%>/tsconfig.json
---
{
  "extends": "../../tsconfig.json",
}