import type { HandlerDefinition, ModuleDefinition } from '../../build';
import { buildPackageJson } from '../../snippets/buildPackageJson';

export const collectAllDeps = (
	pkg: ModuleDefinition,
	visited: Set<string> = new Set(),
): string[] =>
	pkg.moduleDeps.flatMap((dep) => {
		if (visited.has(dep.name)) {
			return [];
		}
		visited.add(dep.name);
		return [dep.name, ...collectAllDeps(dep, visited)];
	});

export default (pkg: HandlerDefinition) => {
	const entryPoints = pkg.entryPoints
		? pkg.entryPoints.join(' ')
		: 'src/index.ts';

	const orderedPackageNames = [...collectAllDeps(pkg), pkg.name];
	const runInOrder = (script: string) =>
		orderedPackageNames
			.map((name) => `pnpm --filter ${name} ${script}`)
			.join(' && ') + ` && pnpm ${script}`;

	const handlerScripts = {
		build:
			'esbuild --bundle --platform=node --target=node22 --outdir=target/ ' +
			entryPoints +
			` --sourcemap --source-root=/support-service-lambdas/handlers/${pkg.name}/target/`,
		package: [
			'pnpm build',
			`cd target && zip -qr ${pkg.name}.zip ./*.js.map ./*.js`,
		].join(' && '),
		'cdk:test': 'pnpm --filter cdk test ' + pkg.name,
		'cdk:test-update': 'pnpm --filter cdk test-update ' + pkg.name,
		'update-lambda': `../../update-lambda.sh "${pkg.name}"${pkg.functionNames ? ` ${pkg.functionNames.join(' ')}` : ''}`,
		'update-stack': `../../update-stack.sh "${pkg.name}"`,
	};
	return buildPackageJson(pkg, handlerScripts, __filename);
};
