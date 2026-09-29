import { z } from 'zod';
import { eventBridgeEnvelopeSchema } from '../src/eventBridgeEnvelope';

describe('eventBridgeEnvelopeSchema', () => {
	const detailSchema = z.object({ foo: z.string() });
	const schema = eventBridgeEnvelopeSchema('MyEvent', detailSchema);

	const validEnvelope = {
		version: '0',
		id: '9773f4b3-ff25-5ef2-b41b-791f868d424e',
		'detail-type': 'MyEvent',
		source: 'lambda:my-lambda-CODE',
		account: '123456789',
		time: '2026-09-07T14:41:33Z',
		region: 'eu-west-1',
		resources: [],
		detail: { foo: 'bar' },
	};

	it('parses a valid envelope', () => {
		expect(schema.parse(validEnvelope)).toEqual(validEnvelope);
	});

	it('strips unknown fields from the envelope', () => {
		const result = schema.parse({ ...validEnvelope, extra: 'field' });
		expect(result).not.toHaveProperty('extra');
	});

	it('strips unknown fields from detail', () => {
		const result = schema.parse({
			...validEnvelope,
			detail: { foo: 'bar', extra: 'field' },
		});
		expect(result.detail).toEqual({ foo: 'bar' });
	});

	it('rejects a mismatching detail-type', () => {
		expect(() =>
			schema.parse({ ...validEnvelope, 'detail-type': 'OtherEvent' }),
		).toThrow();
	});

	it('rejects an invalid detail', () => {
		expect(() =>
			schema.parse({ ...validEnvelope, detail: { foo: 123 } }),
		).toThrow();
	});
});
