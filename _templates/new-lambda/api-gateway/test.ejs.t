---
# This template creates a jest test for the new lambda

to: handlers/<%=lambdaName%>/test/firstTest.test.ts
sh: git add handlers/<%=lambdaName%>/test/firstTest.test.ts
---
test("my app", () => {
    expect(1 + 1).toEqual(2);
});