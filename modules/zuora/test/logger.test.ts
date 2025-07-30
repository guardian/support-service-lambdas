import { Logger } from '@modules/logger';

test('it should be a no-op if theres no context', () => {
	const logger = new Logger();
	expect(logger.getMessage('msg')).toEqual('msg');
});

test('it should add space separated context when you add a single item', () => {
	const logger = new Logger();
	logger.mutableAddContext('A-S123');
	expect(logger.getMessage('msg')).toEqual('A-S123 msg');
});

test('it should add space separated context when you add multiple items', () => {
	const logger = new Logger();
	logger.mutableAddContext('A-S123');
	logger.mutableAddContext('Contribution');
	expect(logger.getMessage('msg')).toEqual('A-S123 Contribution msg');
});
