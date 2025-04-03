console.log('请输入一些文本，然后按回车键：');

process.stdin.on('data', (data) => {
    console.log(`你输入的是：${data.toString().trim()}`);
    // process.exit(); // 退出程序
});