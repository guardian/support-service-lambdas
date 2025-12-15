// see types of prompts:
// https://github.com/enquirer/enquirer/tree/master/examples
//
module.exports = [
	{
		type: 'input',
		name: 'lambdaName',
		message: 'Enter new lambda name e.g. widgets-query-sync',
	},
	{
		type: 'input',
		name: 'includeApiKey',
		message: 'Should I generate an API key for this lambda? (Y/n)',
		default: 'Y',
	},
];
