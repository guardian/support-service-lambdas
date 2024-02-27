import { deleteAccount } from '@modules/zuora/deleteAccount';
import { ZuoraClient } from '@modules/zuora/zuoraClient';

void (async () => {
	const accountNumber = process.argv[2];
	if (!accountNumber?.startsWith('A') || accountNumber.length != 9) {
		console.log('Please provide a valid Zuora account number');
		return;
	}
	const zuoraClient = await ZuoraClient.create('CODE');
	const response = await deleteAccount(zuoraClient, accountNumber);
	console.log(response);
})();
