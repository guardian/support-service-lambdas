export const creditCardFixture = (overrides: Record<string, unknown> = {}) => ({
	id: 'pm-1',
	status: 'Active',
	...overrides,
});
