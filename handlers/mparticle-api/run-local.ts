
import * as fs from 'fs';
import run from './src/utils/run';

// At the very top of your main file
require('dotenv').config();

/**
 * npm run run-local -- --file=runs/post-event.json
 */
function main() {
    const fileToRun = process.argv.find(arg => arg.startsWith('--file='))?.split('=')[1];
    if (!fileToRun) {
        console.error("Not file to run was defined");
    }

    let fileContents;
    try {
        fileContents = fs.readFileSync(fileToRun ?? '', 'utf-8');
    } catch (error) {
        console.error(`It was not possible to open the file "${fileToRun}"`, error);
        return;
    }

    const requestConfiguration = JSON.parse(fileContents);
    requestConfiguration.body = requestConfiguration.body ? JSON.stringify(requestConfiguration.body) : undefined;
    run(requestConfiguration)
        .then((response) => console.log(response))
        .catch((err) => console.error(err));
}
main();