---
inject: true
to: cdk/bin/cdk.ts
append: true
skip_if: <%= lambdaName %>
---
<% PascalCase = h.changeCase.pascal(lambdaName) %>
import { <%= PascalCase %> } from '../lib/<%= lambdaName %>';
new <%= PascalCase %>(app, '<%= lambdaName %>-CODE', {
    stack: 'support',
    stage: 'CODE',
    domainName: `<%= lambdaName %>-code.${supportApisDomain}`,
    hostedZoneId: supportHostedZoneId,
    certificateId: supportCertificateId,
});
new <%= PascalCase %>(app, '<%= lambdaName %>-PROD', {
    stack: 'support',
    stage: 'PROD',
    domainName: `<%= lambdaName %>.${supportApisDomain}`,
    hostedZoneId: supportHostedZoneId,
    certificateId: supportCertificateId,
});
