import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { KnipConfig } from 'knip';
import { z } from 'zod';

const packageJsonSchema = z.object({ name: z.string().optional() });

/**
 * Names of every internal workspace package (handlers/*, modules/*, cdk,
 * buildcheck). Handlers and modules import shared code through the `@modules/*`
 * TypeScript path alias (see each package's tsconfig.json / jest.config.js)
 * rather than by package name, so knip resolves those imports to files and
 * never credits the `workspace:*` dependency. These dependencies are also
 * required by buildcheck so that `pnpm --filter <project>...` includes the
 * transitive modules. Ignoring them here avoids ~170 false "unused dependency"
 * reports while still checking external (third party) dependencies.
 */
function internalPackageNames(): string[] {
	const names = new Set<string>();
	for (const workspaceRoot of ['handlers', 'modules']) {
		for (const entry of readdirSync(workspaceRoot, { withFileTypes: true })) {
			if (!entry.isDirectory()) {
				continue;
			}
			const packageJsonPath = join(workspaceRoot, entry.name, 'package.json');
			try {
				const { name } = packageJsonSchema.parse(
					JSON.parse(readFileSync(packageJsonPath, 'utf8')),
				);
				if (name) {
					names.add(name);
				}
			} catch {
				// Not every directory is a TypeScript workspace (e.g. Scala
				// lambdas have no package.json) - skip those.
			}
		}
	}
	return [...names];
}

const config: KnipConfig = {
	workspaces: {
		'handlers/*': {
			// Lambdas are bundled from src/index.ts (api-gateway) or, for step
			// function handlers, from each src/handlers/*.ts file. runManual/*
			// scripts are invoked manually during development.
			entry: ['src/index.ts', 'src/handlers/*.ts', 'runManual/**/*.ts'],
			project: ['src/**/*.ts'],
		},
		'modules/*': {
			// Modules are libraries consumed by the handlers via the `@modules/*`
			// alias, so their entry points are those cross-workspace imports.
			// runManual/* scripts are invoked manually during development.
			entry: ['runManual/**/*.ts'],
			project: ['src/**/*.ts'],
		},
		'modules/internationalisation': {
			// These files are consumed externally by the support-frontend repo,
			// which imports this repo as a git dependency, so they are entry
			// points even though nothing in this repo imports them.
			entry: [
				'src/gwDeliverableCountries.ts',
				'src/restrictedCountries.ts',
			],
			project: ['src/**/*.ts'],
		},
		'modules/email': {
			// These files are consumed externally by the support-frontend repo,
			// which imports this repo as a git dependency, so they are entry
			// points even though nothing in this repo imports them.
			entry: [
				'src/dataFields/dayZero/guardianWeeklyPlusEmailFields.ts',
			],
			project: ['src/**/*.ts'],
		},
		cdk: {
			entry: ['bin/cdk.ts', 'lib/**/*.test.ts'],
			project: ['{bin,lib}/**/*.ts'],
		},
		buildcheck: {
			// The build definitions under data/ are loaded dynamically by the
			// generator, so treat them all as entry points.
			entry: ['src/cli.ts', 'data/**/*.ts', 'test/**/*.test.ts'],
			project: ['{src,data}/**/*.ts'],
		},
	},
	ignore: [
		// Hygen scaffolding templates, loaded dynamically by `pnpm new-api-lambda`.
		'_templates/**',
		// Jest config for the loose test files under modules/ (modules/ itself is
		// not a workspace, so no workspace owns this config).
		'modules/jest.config.js',
	],
	ignoreDependencies: [
		...internalPackageNames(),
		// Loose shared utilities (modules/*.ts) imported via the `@modules/*`
		// alias from files that live outside any workspace (e.g. modules/test).
		'@modules/.+',
		// Referenced only as `runner: 'groups'` in every jest.config.js, which
		// knip cannot statically link back to the package.
		'jest-runner-groups',
	],
	ignoreUnresolved: [
		// jest-runner-groups, referenced as `runner: 'groups'` in jest configs.
		'groups',
		// esbuild glob entry point for step function handlers, expanded at build
		// time but not resolvable by knip as a single module.
		/^src\/handlers\/\*\.ts$/,
	],
};

export default config;
