import { notice, relativePath } from './notices';
import { GeneratedFile } from '../../src/steps/generatedFile';

export const warningFileName = 'BUILDCHECK.md';

export function generateWarningFile(
	generatedFileNames: string[],
	pathToRoot: string,
): GeneratedFile {
	const fileList = [...generatedFileNames, warningFileName];

	const content = `${notice(__filename)}
# Buildcheck managed file list
	
The files listed below are managed by buildcheck and their content is checked by the build.

## HOWTO edit managed files
1. edit the build definition in buildcheck/data/
2. run \`pnpm snapshot:update\` at the root

For further details, see [buildcheck/README.md](${pathToRoot}/buildcheck/README.md)

## Generated file list:
${fileList.map((name) => '- [' + name + '](' + name + ')').join('\n')}
`;

	return {
		relativePath: warningFileName,
		content,
		templatePath: relativePath(__filename),
	} as GeneratedFile;
}

export function extractGeneratedFilenames(fileLines: string[]): string[] {
	return fileLines
		.filter((line) => line.startsWith('- ['))
		.map((line) => {
			const getTheContentsOfRoundBrackets = /\(([^)]+)\)/;
			const match = line.match(getTheContentsOfRoundBrackets);
			return match ? match[1] : '';
		})
		.filter((filepath) => filepath !== '');
}
