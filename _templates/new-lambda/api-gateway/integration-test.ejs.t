---
# This template creates a jest integration test for the new lambda

to: handlers/<%=lambdaName%>/test/contributionToSupporterPlusIntegration.test.ts
sh: git add handlers/<%=lambdaName%>/test/contributionToSupporterPlusIntegration.test.ts
---
/**
* This is an integration test, the `@group integration` tag ensures that it will only be run by the `pnpm it-test`
* command and will not be run during continuous integration.
* This makes it useful for testing things that require credentials which are available locally but not on the CI server.
*
* @group integration
*/
test("my app", () => {
    expect(1 + 1).toEqual(2);
});