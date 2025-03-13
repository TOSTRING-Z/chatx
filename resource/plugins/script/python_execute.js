const { exec } = require('child_process');
const { tmpdir } = require('os');
const { writeFileSync, unlinkSync } = require('fs');
const path = require('path');

function main(parmas) {
    return async ({ input }) => {
        // 创建临时文件
        const tempFile = path.join(tmpdir(), `temp_${Date.now()}.py`)
        writeFileSync(tempFile, input)
        console.log(tempFile)

        return new Promise((resolve, reject) => {
            const command = `${parmas.python_bin} ${tempFile}`

            const child = exec(command, (error, stdout, stderr) => {
                // 清理临时文件
                unlinkSync(tempFile)

                if (error) {
                    resolve(JSON.stringify({
                        success: false,
                        output: stdout?.toString()?.trim(),
                        error: error?.message || stderr?.toString()?.trim()
                    }))
                } else {
                    resolve(JSON.stringify({
                        success: true,
                        output: stdout?.toString()?.trim(),
                        result: stdout?.toString()?.trim()
                    }))
                }
            })
        })
    }
}

module.exports = {
    main,
};
