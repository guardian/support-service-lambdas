---
# This template adds the new lambda into the github build workflow

inject: true
to: .github/workflows/ci-typescript.yml
before: "# MARKER new-lambda: github-action"
skip_if: <%= lambdaName %>
---
          - <%= lambdaName %>