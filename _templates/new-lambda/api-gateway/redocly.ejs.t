---
# This template adds add a redocly configuration file - we switch off the license rule as it is not relevant for our internal APIs

to: handlers/<%=lambdaName%>/redocly.yaml
sh: git add handlers/<%=lambdaName%>/redocly.yaml
---
extends:
  - recommended

rules:
  info-license: off

