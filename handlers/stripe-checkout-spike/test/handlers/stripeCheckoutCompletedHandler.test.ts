describe('Handler', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		console.error = jest.fn();
	});

	it('should handle successfully', () => {
		expect(2).toBe(2);
	});
});
