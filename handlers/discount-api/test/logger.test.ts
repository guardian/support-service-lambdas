import { Logger } from '../src/logger';

test('it should be a no-op if theres no context', () => {
	const logger = new Logger();
	expect(logger.getMessage('msg')).toEqual('msg');
});

test('it should add space separated context when you add a single item', () => {
	const logger = new Logger();
	logger.mutableAddContext('sub', 'A-S123');
	expect(logger.getMessage('msg')).toEqual('(sub: A-S123) msg');
});

test('it should add space separated context when you add multiple items', () => {
	const logger = new Logger();
	logger.mutableAddContext('sub', 'A-S123');
	logger.mutableAddContext('product', 'Contribution');
	expect(logger.getMessage('msg')).toEqual(
		'(sub: A-S123) (product: Contribution) msg',
	);
});
