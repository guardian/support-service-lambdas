import { main } from './functions';

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
