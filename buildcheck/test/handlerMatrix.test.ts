import type { BuildDefinition } from '../data/build';
import handlerMatrix from '../data/templates/root/.github/workflows/handlerNames.managed.json';

test('CI matrix identifies projects with TypeScript source', () => {
	const build: BuildDefinition = {
		handlers: [
			{ name: 'z-handler', moduleDependencies: [] },
			{ name: 'a-handler', moduleDependencies: [] },
		],
		modules: [],
	};

	expect(handlerMatrix(build).include).toEqual([
		{ subproject: 'a-handler', hasTsSource: true },
		{ subproject: 'cancellations-bus', hasTsSource: false },
		{ subproject: 'iam-policies', hasTsSource: false },
		{ subproject: 'salesforce-event-bus', hasTsSource: false },
		{ subproject: 'z-handler', hasTsSource: true },
	]);
});
