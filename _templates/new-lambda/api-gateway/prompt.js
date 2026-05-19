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
	{
		type: 'input',
		name: 'jsonApi',
		message:
			'Should I generate an example JSON schema and types for your API input/output? (Y/n)',
		default: 'Y',
	},
];
