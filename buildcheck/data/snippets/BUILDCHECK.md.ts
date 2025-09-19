import { notice, relativePath } from './notices';
import path from 'path';
import { GeneratedFile } from '../../src/steps/generatedFile';

// the generated file is named after this file.
// if you rename it, clean the snapshot first, then generate afterwards
const basename = path.basename(__filename);
if (!basename.endsWith('.ts')) {
	throw new Error(
		`Expected warning file name to end with .ts, got: ${basename}`,
	);
}
export const warningFileName = basename.slice(0, -3);

export function generateWarningFile(
	generatedFiles: string[],
	pathToRoot: string,
): GeneratedFile {
	const buildGenHeader = `${notice(__filename)}
# Buildcheck managed file list
	
The files listed below are managed by buildcheck and their content is checked by the build.

## HOWTO edit managed files
1. edit the build definition in buildcheck/data/
2. run \`pnpm update-build\` at the root

For further details, see [buildcheck/README.md](${pathToRoot}/buildcheck/README.md)

## Generated file list:
`;

	return {
		relativePath: warningFileName,
		content:
			buildGenHeader +
			[...generatedFiles, warningFileName]
				.map((name) => '- [' + name + '](' + name + ')\n')
				.join(''),
		templatePath: relativePath(__filename),
	};
}

export function parseGeneratedFilenames(fileLines: string[]): string[] {
	// lines to look for are like this: "- [filename](filepath)"
	return fileLines
		.filter((line) => line.startsWith('- ['))
		.map((line) => {
			const getTheContentsOfRoundBrackets = /\(([^)]+)\)/;
			const match = line.match(getTheContentsOfRoundBrackets);
			return match ? match[1] : '';
		})
		.filter((filepath) => filepath !== '');
}
