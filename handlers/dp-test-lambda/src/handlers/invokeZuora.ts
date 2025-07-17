import { stageFromEnvironment } from '@modules/stage';
import { applyCreditToAccountBalance } from '@modules/zuora/applyCreditToAccountBalance';
import { ZuoraClient } from '@modules/zuora/zuoraClient';

export const handler = async () => {
	try {
		const zuoraClient = await ZuoraClient.create(stageFromEnvironment());
		const body = JSON.stringify({
			Amount: 1,
			SourceTransactionNumber: 'INVXXX',
			Type: 'Increase',
		});
		const applyCreditToAccountBalanceAttempt =
			await applyCreditToAccountBalance(zuoraClient, body);
		console.log(
			'applyCreditToAccountBalanceAttempt',
			JSON.stringify(applyCreditToAccountBalanceAttempt, null, 2),
		);
		return true;
	} catch (error) {
		console.error('Error applying credit to account balance:', error);
		return false;
	}
};
