import { Logger } from '@modules/routing/logger';

function logCaller(logger: Logger) {
	return logger.getMessage('msg', logger.getCallerInfo(-1));
}

const expectedCallerInfo = '[logger.test.ts:4::logCaller]';

test('it should be a no-op if theres no context', () => {
	const logger = new Logger();
	expect(logCaller(logger)).toEqual(expectedCallerInfo + ' msg');
});

test('it should add space separated context when you add a single item', () => {
	const logger = new Logger();
	logger.mutableAddContext('A-S123');
	expect(logCaller(logger)).toEqual('A-S123 ' + expectedCallerInfo + ' msg');
});

test('it should add space separated context when you add multiple items', () => {
	const logger = new Logger();
	logger.mutableAddContext('A-S123');
	logger.mutableAddContext('Contribution');
	expect(logCaller(logger)).toEqual(
		'A-S123 Contribution ' + expectedCallerInfo + ' msg',
	);
});
