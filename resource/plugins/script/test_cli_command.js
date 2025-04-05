/**
 * test_cli_command.js
 * This file is used to test the functionality of the openConsole function in cli_command.js.
 * It executes the openConsole function and prints the output, then exits the process after 2 seconds.
 */

import { openConsole } from './cli_command.js';

// Test the execution of the initial command
let output = await openConsole();
console.log(output);

// Set a timer to exit the process after 2 seconds
setTimeout(() => {
  process.exit(0);
}, 2000);