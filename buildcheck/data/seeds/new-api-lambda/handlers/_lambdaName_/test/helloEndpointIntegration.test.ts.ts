export default (): string =>
	`/**
 * This is an integration test, the \`@group integration\` tag ensures that it
 * will only be run by the \`pnpm it-test\` command and will not be run during
 * continuous integration.
 *
 * @group integration
 */
import { helloRequestEndpoint } from '../src/helloEndpoint';

test('helloEndpoint', async () => {
	const result = helloRequestEndpoint({ name: 'Alice' });

	await expect(result).resolves.toEqual({
		statusCode: 200,
		body: JSON.stringify({
			message: 'Hello Alice!',
		}),
	});
});
`;
