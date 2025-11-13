import { logger } from '@modules/routing/logger';
import { docsHandler } from '../src/docsHandler';

// run this locally to see the docs

docsHandler('CODE').then((result) => {
	logger.log('result', result);
	logger.log('body', result.body);
});
