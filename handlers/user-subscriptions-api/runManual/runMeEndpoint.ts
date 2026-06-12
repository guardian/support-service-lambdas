#!/usr/bin/env -S pnpm exec tsx
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import { MeEndpoint } from '../src/meEndpoint';

ZuoraClient.create('CODE')
	.then(async (zuoraClient) => {
		await new MeEndpoint(zuoraClient).handle('200372455');
	})
	.then(console.log)
	.catch(console.error);
