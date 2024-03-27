---
# This template creates a jest test for the new lambda

to: handlers/<%=lambdaName%>/test/contributionToSupporterPlus.test.ts
sh: git add handlers/<%=lambdaName%>/test/contributionToSupporterPlus.test.ts
---
/**
* This is a unit test, it can be run by the `pnpm test` command, and will be run by the CI/CD pipeline
*
*/
test("my app", () => {
    expect(1 + 1).toEqual(2);
});