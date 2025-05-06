import {deleteAccount} from '@modules/zuora/deleteAccount';
import {ZuoraClient} from '@modules/zuora/zuoraClient';
import {readFile} from 'node:fs/promises';

/**
 * A script to delete multiple Zuora accounts.
 * To use this script, put the account numbers in a file, one per line with no quotation marks or commas.
 *
 * @param filePath
 */

async function loadFile(filePath: string): Promise<string> {
	try {
		// Get the directory of the current script
		const fullFilePath = `${__dirname}/${filePath}`;
		console.log(fullFilePath);
		return await readFile(fullFilePath, 'utf-8');
	} catch (error) {
		console.error('Error reading file:', error);
		throw error;
	}
}

async function checkAccountAndDelete(
	zuoraClient: ZuoraClient,
	accountNumber?: string,
): Promise<void> {
	if (!accountNumber?.startsWith('A') || accountNumber.length != 9) {
		console.log(`Invalid account number: ${accountNumber}`);
		return;
	}

	const response = await deleteAccount(zuoraClient, accountNumber);
	console.log(`Deleted account ${accountNumber}:`, response);
}

void (async () => {
	const accountNumberFile = process.argv[2];
	if (!accountNumberFile) {
		console.log('Please provide a file with Zuora account numbers');
		return;
	}
	const zuoraClient = await ZuoraClient.create('CODE');
	// Read the file and parse the account numbers using node:fs
	const inputFile = await loadFile(accountNumberFile);
	const accountNumbers = inputFile.split('\n');
	for (let i = 0; i < accountNumbers.length; i++) {
		await checkAccountAndDelete(zuoraClient, accountNumbers[i]);
	}
})();
