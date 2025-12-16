import type { HandlerDefinition } from '../../build';
import { notice } from '../../snippets/notices';

export function buildPackageJson(
	pkg: HandlerDefinition,
	extraScripts: Record<string, string>,
	filename: string,
) {
	return {
		name: `${pkg.name}`,
		scripts: {
			test: 'jest --group=-integration',
			'it-test': 'jest --group=integration',
			'type-check': 'tsc --noEmit',
			lint: "eslint --cache --cache-location /tmp/eslintcache/ 'src/**/*.ts' 'test/**/*.ts'",
			'check-formatting': 'prettier --check "**/*.ts"',
			'fix-formatting': 'prettier --write "**/*.ts"',
			...extraScripts,
			...pkg.extraScripts,
		},
		NOTICE1: notice(filename),
		NOTICE2: 'all dependencies are defined in buildcheck/data/build.ts',
		dependencies: pkg.dependencies,
		devDependencies: pkg.devDependencies,
	};
}

export default (pkg: HandlerDefinition) => {
	const entryPoints = pkg.entryPoints
		? pkg.entryPoints.join(' ')
		: 'src/index.ts';
	const handlerScripts = {
		build:
			'esbuild --bundle --platform=node --target=node20 --outdir=target/ ' +
			entryPoints +
			' --sourcemap',
		package: `pnpm type-check && pnpm lint && pnpm check-formatting && pnpm test && pnpm build && cd target && zip -qr ${pkg.name}.zip ./*.js.map ./*.js`,
		'cdk:test': 'pnpm --filter cdk test ' + pkg.name,
		'cdk:test-update': 'pnpm --filter cdk test-update ' + pkg.name,
		'update-lambda': `../../update-lambda.sh "${pkg.name}"${pkg.functionNames ? ` ${pkg.functionNames.join(' ')}` : ''}`,
		'update-stack': `../../update-stack.sh "${pkg.name}"`,
	};
	return buildPackageJson(pkg, handlerScripts, __filename);
};
