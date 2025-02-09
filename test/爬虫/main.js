const { app, BrowserWindow, ipcMain } = require('electron');
const puppeteer = require('puppeteer');

let mainWindow;

async function createWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false, // 关闭上下文隔离以便使用ipcRenderer
        },
    });

    // 加载 HTML 文件
    await mainWindow.loadFile('index.html');

    // 打开开发者工具（可选）
    mainWindow.webContents.openDevTools();

    // 监听窗口关闭事件
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// 启动爬虫逻辑
async function startCrawler() {
    const maxRetries = 3;
    let retryCount = 0;

    while (retryCount < maxRetries) {
        try {
            // 启动浏览器
            const browser = await puppeteer.launch({
                headless: true, // 无头模式
            });

            // 创建新页面
            const page = await browser.newPage();

            // 设置请求头
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

            // 访问百度搜索页面
            const searchUrl = 'https://www.baidu.com/s?wd=今天天气';
            await page.goto(searchUrl, {
                waitUntil: 'networkidle2', // 等待网络空闲
            });

            // 等待搜索结果加载
            await page.waitForSelector('.result.c-container');

            // 获取所有搜索结果
            const results = await page.$$eval('.result.c-container', (elements) => {
                return elements.map(element => {
                    return {
                        title: element.querySelector('h3')?.textContent || '',
                        content: element.querySelector('.c-abstract')?.textContent || '',
                        url: element.querySelector('a')?.href || '',
                    };
                });
            });

            // 提取最相关的3个结果
            const relevantResults = results.slice(0, 3);

            // 将结果发送到渲染进程
            mainWindow.webContents.send('crawler-results', relevantResults);

            // 关闭浏览器
            await browser.close();

            // 如果成功，跳出重试循环
            break;
        } catch (error) {
            retryCount++;
            console.error(`Attempt ${retryCount} failed:`, err);
            if (retryCount >= maxRetries) {
                throw new Error('Max retries exceeded: ' + err.message);
            }
        }
    }
}

// IPC 通信：接收渲染进程的开始爬虫信号
ipcMain.on('start-crawler', () => {
    startCrawler();
});

// Electron 初始化完成后创建窗口
app.whenReady().then(createWindow);

// 所有窗口关闭后退出应用
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});