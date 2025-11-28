import { zipRouteWithEventPath } from '../src/router';

describe('zipRouteWithEventPath', () => {
	test('matches route and event parts of equal length', () => {
		const routeParts = ['benefits', '{benefitId}', 'users'];
		const eventParts = ['benefits', '123', 'users'];
		expect(zipRouteWithEventPath(routeParts, eventParts)).toEqual([
			['benefits', 'benefits'],
			['{benefitId}', '123'],
			['users', 'users'],
		]);
	});

	test('handles greedy route param at the end', () => {
		const routeParts = ['files', '{path+}'];
		const eventParts = ['files', 'a', 'b', 'c.txt'];
		expect(zipRouteWithEventPath(routeParts, eventParts)).toEqual([
			['files', 'files'],
			['{path}', 'a/b/c.txt'],
		]);
	});

	test('returns undefined for mismatched lengths (non-greedy)', () => {
		const routeParts = ['benefits', '{benefitId}', 'users'];
		const eventParts = ['benefits', '123'];
		expect(zipRouteWithEventPath(routeParts, eventParts)).toBeUndefined();
	});

	test('matches when both are empty', () => {
		expect(zipRouteWithEventPath([], [])).toEqual([]);
	});
});
