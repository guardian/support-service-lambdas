# Testing best practice
## is testing important?
The purpose of unit/component testing is for two main reasons
1. to prevent us breaking things
1. to support modification of the code
1. to give developers confidence to ship the code

It's important that the tests are maintainable, therefore we should avoid extra boiler plate.
This means we should understand the essential parts of a test and try to stick to them.

TODO how do integration/recorded/effects tests fit in with this?

## the components of an ideal functional test are

- name/description - so you understand why it exists
- input data
- the operation
- expected output data
- comparison/reporting logic - so you can identify significant parts of the output and report clearly the problem

## Components not needed (but often present)
- passing in data that's irrelevant to the test case
- mocking traits with functions that aren't called (passing in junk values because we don't care)

## Testing at the right level
The input and expected data should be as close as possible to relevant to the thing we're really trying to test.
If we have to create shared helper functions (e.g. json serialisation or mocks) to generate some complex input,
then that's a bad sign in general and should be minimised.
If this happens, we just need to refactor the code to remove the dependencies, then test the new simplified code.

# examples
TODO
