/**
 * This is an integration test, the `@group integration` tag ensures that it will only be run by the `pnpm it-test`
 * command and will not be run during continuous integration.
 * This makes it useful for testing things that require credentials which are available locally but not on the CI server.
 *
 * @group integration
 *
 * This specific test is a placeholder and will be updated at a later date when the project has matured such that there is something to test.
 * The test is retained here simply to prevent the build from failing
 */
test('my app', () => {
	expect(1 + 1).toEqual(2);
});
