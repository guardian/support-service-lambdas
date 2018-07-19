# Testing best practice

the components of an ideal functional test are

- name/description - so you understand why it exists
- input data
- the operation
- expected output data
- comparison/reporting logic - so you can identify significant parts of the output and report clearly the problem

It's important that the tests are maintainable, so it helps to avoid extra boiler plate.
This means keeping as close as possible to to above ideal in each test is important.
If we have to create shared helper functions (e.g. json serialisation or mocks) to generate some complex input,
then that's a bad sign in general and should be minimised.
