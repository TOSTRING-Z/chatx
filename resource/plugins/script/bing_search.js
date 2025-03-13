const puppeteer = require('puppeteer');

async function main(input) {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3');
    await page.goto(`https://www.bing.com/search?q=${encodeURIComponent(input)}`);
    const content = await page.content();
    await browser.close();
    return content;
}

// 从命令行参数获取输入
const input = process.argv[2];
if (input) {
    main(input).then(console.log).catch(console.error);
} else {
    console.error('No input provided');
}