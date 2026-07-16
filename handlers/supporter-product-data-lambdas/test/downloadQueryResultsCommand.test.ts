import { resolveOutputFilePath } from '../src/downloadQueryResultsCommand';

const defaultFilename = 'select-active-rate-plans-PROD-123.csv';

test('appends the default filename when the path ends with a separator', () => {
	expect(resolveOutputFilePath('./', defaultFilename)).toBe(
		`select-active-rate-plans-PROD-123.csv`,
	);
	expect(resolveOutputFilePath('some/dir/', defaultFilename)).toBe(
		'some/dir/select-active-rate-plans-PROD-123.csv',
	);
});

test('appends the default filename when the path is an existing directory', () => {
	expect(resolveOutputFilePath('.', defaultFilename)).toBe(defaultFilename);
});

test('uses the path as-is when it is a file path', () => {
	expect(resolveOutputFilePath('output.csv', defaultFilename)).toBe(
		'output.csv',
	);
	expect(resolveOutputFilePath('some/dir/output.csv', defaultFilename)).toBe(
		'some/dir/output.csv',
	);
});
