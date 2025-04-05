const { exec } = require('child_process');
const { tmpdir } = require('os');
const { writeFileSync, unlinkSync } = require('fs');
const path = require('path');

function main(params) {
    return async ({ code }) => {
        // 创建临时文件
        const tempFile = path.join(tmpdir(), `temp_${Date.now()}.py`)
        writeFileSync(tempFile, code)
        console.log(tempFile)

        return new Promise((resolve, reject) => {
            const command = `${params.python_bin} ${tempFile}`

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
                    const output = stdout?.toString()?.trim();
                    resolve(JSON.stringify({
                        success: true,
                        output: output.length > params.threshold ? '返回内容过多,请尝试其它方案!' : output,
                        error: null
                    }))
                }
            })
        })
    }
}

function getPrompt() {
    const prompt = `## python_execute
描述: 本地执行python代码,例如实现文件读取,数据分析,和代码执行等
参数:
- code: (需要)可执行的python代码片段(python代码输出要求保留"\n"和空格,请严格要求代码格式,不正确的缩进和换行会导致代码执行失败)
使用:
{
  "thinking": "[思考过程]",
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
