import { ZuoraClient } from '@modules/zuora/zuoraClient';
import { deleteAccount } from '@modules/zuora/deleteAccount';

void (async () => {
	const accountNumber = process.argv[2];
	if (!accountNumber?.startsWith('A')) {
		console.log('Please provide a valid Zuora account number');
		return;
	}
	const zuoraClient = await ZuoraClient.create('CODE');
	const response = await deleteAccount(zuoraClient, accountNumber);
	console.log(response);
})();
