import type { MessageAttributes } from '../../src/types/deletionMessage';
import {
	parseMessageAttributes,
	toSQSMessageAttributes,
} from '../../src/types/deletionMessage';

describe('deletionMessage', () => {
	describe('parseMessageAttributes', () => {
		it('should parse SQS message attributes to MessageAttributes', () => {
			const sqsAttributes = {
				mParticleDeleted: {
					dataType: 'String',
					stringValue: 'true',
				},
				brazeDeleted: {
					dataType: 'String',
					stringValue: 'false',
				},
				attemptCount: {
					dataType: 'String',
					stringValue: '1',
				},
			};

			const result = parseMessageAttributes(sqsAttributes);

			expect(result.mParticleDeleted).toBe(true);
			expect(result.brazeDeleted).toBe(false);
			expect(result.attemptCount).toBe(1);
		});

		it('should default to false when attributes are missing', () => {
			const result = parseMessageAttributes(undefined);

			expect(result.mParticleDeleted).toBe(false);
			expect(result.brazeDeleted).toBe(false);
			expect(result.attemptCount).toBe(0);
		});

		it('should handle partial attributes', () => {
			const sqsAttributes = {
				mParticleDeleted: {
					dataType: 'String',
					stringValue: 'true',
				},
				attemptCount: {
					dataType: 'String',
					stringValue: '5',
				},
			};

			const result = parseMessageAttributes(sqsAttributes);

			expect(result.mParticleDeleted).toBe(true);
			expect(result.brazeDeleted).toBe(false);
			expect(result.attemptCount).toBe(5);
		});

		it('should handle string "false" correctly', () => {
			const sqsAttributes = {
				mParticleDeleted: {
					dataType: 'String',
					stringValue: 'false',
				},
				brazeDeleted: {
					dataType: 'String',
					stringValue: 'false',
				},
				attemptCount: {
					dataType: 'String',
					stringValue: '0',
				},
			};

			const result = parseMessageAttributes(sqsAttributes);

			expect(result.mParticleDeleted).toBe(false);
			expect(result.brazeDeleted).toBe(false);
			expect(result.attemptCount).toBe(0);
		});
	});

	describe('toSQSMessageAttributes', () => {
		it('should convert MessageAttributes to SQS format', () => {
			const attributes: MessageAttributes = {
				mParticleDeleted: true,
				brazeDeleted: false,
				attemptCount: 3,
			};

			const result = toSQSMessageAttributes(attributes);

			expect(result.mParticleDeleted).toEqual({
				dataType: 'String',
				stringValue: 'true',
			});
			expect(result.brazeDeleted).toEqual({
				dataType: 'String',
				stringValue: 'false',
			});
			expect(result.attemptCount).toEqual({
				dataType: 'String',
				stringValue: '3',
			});
		});

		it('should handle all false values', () => {
			const attributes: MessageAttributes = {
				mParticleDeleted: false,
				brazeDeleted: false,
				attemptCount: 0,
			};

			const result = toSQSMessageAttributes(attributes);

			expect(result.mParticleDeleted?.stringValue).toBe('false');
			expect(result.brazeDeleted?.stringValue).toBe('false');
			expect(result.attemptCount?.stringValue).toBe('0');
		});

		it('should handle all true values', () => {
			const attributes: MessageAttributes = {
				mParticleDeleted: true,
				brazeDeleted: true,
				attemptCount: 10,
			};

			const result = toSQSMessageAttributes(attributes);

			expect(result.mParticleDeleted?.stringValue).toBe('true');
			expect(result.brazeDeleted?.stringValue).toBe('true');
			expect(result.attemptCount?.stringValue).toBe('10');
		});
	});

	describe('round-trip conversion', () => {
		it('should preserve data through conversion cycle', () => {
			const original: MessageAttributes = {
				mParticleDeleted: true,
				brazeDeleted: false,
				attemptCount: 7,
			};

			const sqsFormat = toSQSMessageAttributes(original);
			const converted = parseMessageAttributes(sqsFormat);

			expect(converted).toEqual(original);
		});
	});
});
