const { exec } = require('child_process');
const { tmpdir } = require('os');
const { writeFileSync, unlinkSync } = require('fs');
const path = require('path');

function main(params) {
    return async ({ code }) => {
        // Create temporary file
        const tempFile = path.join(tmpdir(), `temp_${Date.now()}.py`)
        writeFileSync(tempFile, code)
        console.log(tempFile)

        return new Promise((resolve, reject) => {
            const command = `${params.python_bin} ${tempFile}`

            const child = exec(command, (error, stdout, stderr) => {
                // Clean up temporary file
                unlinkSync(tempFile)

                if (error) {
                    resolve(JSON.stringify({
                        success: false,
                        output: stdout?.toString()?.trim(),
                        error: error?.message || stderr?.toString()?.trim()
                    }))
                } else {
                    const output = stdout?.toString()?.trim();
                    resolve(JSON.stringify({
                        success: true,
                        output: output.length > params.threshold ? 'The returned content is too much, please try another solution!' : output,
                        error: null
                    }))
                }
            })
        })
    }
}

function getPrompt() {
    const prompt = `## python_execute
Description: Execute Python code locally, such as file reading, data analysis, and code execution.
Parameters:
- code: (Required) Executable Python code snippet (Python code output must retain "\n" and spaces, please strictly follow the code format, incorrect indentation and line breaks will cause code execution to fail)
Usage:
{
  "thinking": "[Thinking process]",
  "tool": "python_execute",
  "params": {
    "code": "[value]"
  }
}`
    return prompt
}

module.exports = {
    main, getPrompt
};
