import Mock = jest.Mock;

test('If the SQS event has a valid signature, hasMatchingSignature() will return true', () => {
	const signatureCheckResult = hasMatchingSignature(validSQSRecord, mockKey);
	expect(signatureCheckResult).toBe(true);
});
