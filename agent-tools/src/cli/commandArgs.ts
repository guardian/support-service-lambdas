import { listPackages } from '../tools/packageRegistry.js';
import { validatePackageAgainstKnown } from '../tools/packageValidation.js';
import type { CommandResult } from '../tools/runScript.js';
import { toCommandResult } from '../tools/runScript.js';

type PackageValidationError = {
	pkg: string;
	reason: string;
};

type ParsedPackageArgs = {
	changed: boolean;
	packages: string[];
	unsupportedOptions: string[];
};

function validatePackageArgs(
	packages: string[],
	knownPackages: ReadonlySet<string>,
): PackageValidationError[] {
	return packages.flatMap((pkg) => {
		const reason = validatePackageAgainstKnown(pkg, knownPackages);
		return reason === null ? [] : [{ pkg, reason }];
	});
}

function parsePackageArgs(args: string[]): ParsedPackageArgs {
	const packages: string[] = [];
	const unsupportedOptions: string[] = [];
	let changed = false;

	for (const arg of args) {
		if (arg === '--changed') {
			changed = true;
			continue;
		}
		if (arg.startsWith('--')) {
			unsupportedOptions.push(arg);
			continue;
		}
		packages.push(arg);
	}

	return { changed, packages, unsupportedOptions };
}

export function fail(message: string): CommandResult {
	return toCommandResult([`FAIL ${message}`], 1);
}

function requirePackages(
	args: string[],
	command: string,
): CommandResult | { packages: string[] } {
	if (args.length === 0) {
		return fail(`${command} requires at least one package`);
	}
	const invalid = validatePackageArgs(args, new Set(listPackages()));
	if (invalid.length > 0) {
		return toCommandResult(
			invalid.map((result) => `FAIL ${result.pkg}: ${result.reason}`),
			1,
		);
	}
	return { packages: args };
}

export function requireSinglePackage(
	args: string[],
	command: string,
): CommandResult | { pkg: string } {
	if (args.length !== 1) {
		return fail(`${command} requires exactly one package`);
	}
	const result = requirePackages(args, command);
	if ('exitCode' in result) {
		return result;
	}
	return { pkg: result.packages[0]! };
}

export function parseRequiredPackages(
	args: string[],
	command: string,
): CommandResult | { changed: boolean; packages: string[] } {
	const parsed = parsePackageArgs(args);
	if (parsed.unsupportedOptions.length > 0) {
		return fail(
			`${command} does not support option ${parsed.unsupportedOptions[0]}`,
		);
	}
	if (parsed.changed) {
		if (parsed.packages.length > 0) {
			return fail(`${command} does not accept packages when --changed is set`);
		}
		return { changed: true, packages: [] };
	}
	const required = requirePackages(parsed.packages, command);
	if ('exitCode' in required) {
		return required;
	}
	return { changed: false, packages: required.packages };
}

export async function runNoArgCommand(
	args: string[],
	command: string,
	run: () => Promise<CommandResult> | CommandResult,
): Promise<CommandResult> {
	if (args.length > 0) {
		return fail(`${command} does not accept any arguments`);
	}
	return await run();
}

export async function runSinglePackageCommand(
	args: string[],
	command: string,
	run: (pkg: string) => Promise<CommandResult> | CommandResult,
): Promise<CommandResult> {
	const result = requireSinglePackage(args, command);
	if ('exitCode' in result) {
		return result;
	}
	return await run(result.pkg);
}
