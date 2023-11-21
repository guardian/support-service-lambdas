---
# This template creates a riff-raff.yaml for the new lambda

to: handlers/<%=lambdaName%>/riff-raff.yaml
sh: git add handlers/<%=lambdaName%>/riff-raff.yaml
---
stacks:
- support
regions:
- eu-west-1
allowedStages:
  - CODE
  - PROD
deployments:
  <%=lambdaName%>-cloudformation:
    type: cloud-formation
    app: <%=lambdaName%>
    parameters:
      templateStagePaths:
        CODE: <%=lambdaName%>-CODE.template.json
        PROD: <%=lambdaName%>-PROD.template.json

  <%=lambdaName%>:
    type: aws-lambda
    parameters:
      fileName: <%=lambdaName%>.zip
      bucketSsmLookup: true
      prefixStack: false
      functionNames:
      - <%=lambdaName%>-
    dependencies: [<%=lambdaName%>-cloudformation]
