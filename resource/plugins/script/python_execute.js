const { exec } = require('child_process');
const { tmpdir } = require('os');
const { writeFileSync, unlinkSync } = require('fs');
const path = require('path');

// 配置参数
const CONDA_ENV_PATH = '/data/zgr/miniconda3/envs/open_manus/' // 修改为你的conda环境路径
const PYTHON_BIN = path.join(CONDA_ENV_PATH, 'bin/python')

async function main({ input }) {

    // 创建临时文件
    const tempFile = path.join(tmpdir(), `temp_${Date.now()}.py`)
    writeFileSync(tempFile, input)

    return new Promise((resolve, reject) => {
        const command = `${PYTHON_BIN} ${tempFile}`

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

module.exports = {
    main,
};
