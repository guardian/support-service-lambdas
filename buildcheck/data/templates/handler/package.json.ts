import type { HandlerDefinition } from '../../build';
import { buildPackageJson } from '../../snippets/buildPackageJson';

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
