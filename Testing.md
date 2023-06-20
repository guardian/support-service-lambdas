# Testing best practice

See [README.md](README.md) for details on running the tests.

## Unit Testing
The purpose of unit/component testing is:
1. to prevent us breaking things
1. to support modification of the code
1. to give developers confidence to ship the code

It's important that the tests are maintainable, therefore we should avoid extra boilerplate.
This means we should understand the essential parts of a test and try to stick to them.

TODO how do integration/recorded/effects tests fit in with this?

## Essential Unit Test Components
- a good name/description - so you understand why it exists
- input data
- the operation
- expected output data
- comparison/reporting logic - so you can identify significant parts of the output and clearly report the problem

## Unnecessary Unit Test Components (which are often present)
- passing in data that's irrelevant to the test case
- mocking traits with functions that aren't called (passing in junk values because we don't care)

## Testing at the right level
The input and expected data should be as close as possible to relevant to the thing we're really trying to test.
If we have to create shared helper functions (e.g. json serialisation or mocks) to generate some complex input,
then that's a bad sign in general and should be minimised.
If this happens, we just need to refactor the code to remove the dependencies, then test the new simplified code.

# Examples
TODO

# runForLegacyTestsSeeTestingMd ??! Testing tech debt.
These tests are testing something with input streams and output streams.  This means we need a load of boilerplate just to call the test nicely - but we're just testing the ApiGatewayHandler in the process.  These tests should be changed to call the operationForEffects function that is supplied to the api gateway handler function, and just combine the above strangely named function with the top level handler.
