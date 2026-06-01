---
# This template adds add a redocly configuration file - we switch off the license rule as it is not relevant for our internal APIs

to: <% if (includeOpenApiDoc == 'Y') { %>handlers/<%=lambdaName%>/redocly.yaml<% } %>
sh: <% if (includeOpenApiDoc == 'Y') { %>git add handlers/<%=lambdaName%>/redocly.yaml<% } %>
---
extends:
  - recommended

rules:
  info-license: off

