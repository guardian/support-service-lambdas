---
# This template adds the new lambda into the github build workflow

inject: true
to: .github/workflows/ci-typescript.yml
after: subproject
skip_if: <%= lambdaName %>
---
          - <%= lambdaName %>