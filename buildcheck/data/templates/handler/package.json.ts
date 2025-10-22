import { HandlerDefinition } from '../../build';
import { notice } from '../../snippets/notices';

export default (pkg: HandlerDefinition) => {
	const entryPoints = pkg.entryPoints
		? pkg.entryPoints?.join(' ')
		: 'src/index.ts';
	return {
		name: `${pkg.name}`,
		scripts: {
			'cdk:test': 'pnpm --filter cdk test ' + pkg.name,
			'cdk:test-update': 'pnpm --filter cdk test-update ' + pkg.name,
			test: 'jest --group=-integration',
			'it-test': 'jest --group=integration',
			'type-check': 'tsc --noEmit',
			build:
				'esbuild --bundle --platform=node --target=node20 --outdir=target/ ' +
				entryPoints +
				' --sourcemap',
			lint: 'eslint --cache --cache-location /tmp/eslintcache/ src/**/*.ts test/**/*.ts',
			package: `pnpm type-check && pnpm lint && pnpm check-formatting && pnpm test && pnpm build && cd target && zip -qr ${pkg.name}.zip ./*.js.map ./*.js`,
			'check-formatting': 'prettier --check \"**/*.ts\"',
			'fix-formatting': 'prettier --write \"**/*.ts\"',
			'update-lambda': `../../update-lambda.sh "${pkg.name}"`,
			'update-stack': `../../update-stack.sh "${pkg.name}"`,
			...pkg.extraScripts,
		},
		NOTICE1: notice(__filename),
		NOTICE2: 'all dependencies are defined in buildcheck/data/build.ts',
		dependencies: pkg.dependencies,
		devDependencies: pkg.devDependencies,
	};
};
