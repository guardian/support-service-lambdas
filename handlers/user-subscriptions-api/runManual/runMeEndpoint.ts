#!/usr/bin/env -S pnpm exec tsx
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import { MeEndpoint } from '../src/meEndpoint';

/*
This script runs the "me" endpoint locally with a given identity id against CODE/sandbox.
Run it in intellij using the green triangle on line 1, or run from the command line.
 */

const testIdentityId = '200372455';

ZuoraClient.create('CODE')
	.then(async (zuoraClient) => {
		await new MeEndpoint(zuoraClient).handle(testIdentityId);
	})
	.then(console.log)
	.catch(console.error);
