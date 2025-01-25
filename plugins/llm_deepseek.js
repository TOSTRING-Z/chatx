// const fetch = require('node-fetch');

deepseek = async () => {
    // 初始化 cookies 和配置
    let cookies = {
        "": "1737610436",
        "__cf_bm": "Lqsv041mEfay7hWAFTWABk7eKNWfjteexsnrp5CdACA-1737760332-1.0.1.1-TwSeBWDh51nS9DPyWG10ato38R7120kLS2THgE0HB64wUEx6ZAxe.fIKCH43BMN7IwLsj8zn3Ka004RRli8leA",
        "ds_session_id": "fe0e34e3890c459d8db81deb9b84339d",
        "Hm_lpvt_1fff341d7a963a4043e858ef0e19a17c": "1737760344",
        "Hm_lvt_1fff341d7a963a4043e858ef0e19a17c": "1737610436",
        "HMACCOUNT": "EDF0DC1730E803B0",
        "HWWAFSESID": "4e1762bcfa484efe993",
        "HWWAFSESTIME": "1737765434131",
        "intercom-device-id-guh50jw4": "ae9ee996-fb40-402e-9885-e0d643df33a3",
        "intercom-session-guh50jw4": "ellDQUZnYXNjaW1MTC9MdFR1TEwydjFMQTBhMjdHeDhXZEd0ckVQMHAyQmZkbHJEeG1EZy9ZTmk3ckthSG41bjczK3VtVWJkU1NJblIvcDJ5L3phNVNDc3UyTkdtNDVxS1A4TDlFd2pQbWc9LS0rMHFMV0F6RTQ1VURCdmVCVnBQbmhBPT0=--4159152d15dc0e79f29e2139780009e525241585"
    };
    // 辅助函数：生成 PoW 响应
    const get_pow = (e) => {
        return btoa(
            JSON.stringify({
                algorithm: e.algorithm,
                challenge: e.challenge,
                salt: e.salt,
                answer: e.answer,
                signature: e.signature,
                target_path: e.target_path
            })
        );
    };

    const uid = "fd4cb4d4-f1a2-468b-97a1-9ebf21aa3603";
    const bearer = "P6n/Ogz2GNgq24o4FjwHhi7wpNq/OfjY32DHEhRIME6lZ1/D6xVgJQlExJ3jaLK/";

    // 创建 PoW 挑战
    const create_pow_challenge = async () => {
        try {
            let response = await fetch("https://chat.deepseek.com/api/v0/chat/create_pow_challenge", {
                "credentials": "include",
                "headers": {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:135.0) Gecko/20100101 Firefox/135.0",
                    "Accept": "*/*",
                    "Accept-Language": "zh-CN,zh;q=0.8,zh-TW;q=0.7,zh-HK;q=0.5,en-US;q=0.3,en;q=0.2",
                    "Sec-Fetch-Dest": "empty",
                    "Sec-Fetch-Mode": "no-cors",
                    "Sec-Fetch-Site": "same-origin",
                    "x-client-platform": "web",
                    "x-client-version": "1.0.0-always",
                    "x-client-locale": "zh_CN",
                    "x-app-version": "20241129.1",
                    "authorization": "Bearer " + bearer,
                    "content-type": "application/json",
                    "Priority": "u=4",
                    "Pragma": "no-cache",
                    "Cache-Control": "no-cache"
                },
                "referrer": "https://chat.deepseek.com/a/chat/s/" + uid,
                "body": "{\"target_path\":\"/api/v0/chat/completion\"}",
                "method": "POST",
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            // // 正确获取 Set-Cookie 头（使用 headers.raw()）
            // const setCookieHeaders = response.headers.raw()['set-cookie'];
            // if (setCookieHeaders) {
            //     setCookieHeaders.forEach(cookie => {
            //         const [nameValue] = cookie.split(';');
            //         const [name, value] = nameValue.split('=');
            //         cookies[name] = value;
            //     });
            // 更新 cookieString（避免重新声明 const）
            cookieString = Object.entries(cookies)
                .map(([k, v]) => `${k}=${v}`)
                .join('; ');

            response = await fetch("https://chat.deepseek.com/api/v0/chat/create_pow_challenge", {
                "credentials": "include",
                "headers": {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:135.0) Gecko/20100101 Firefox/135.0",
                    "Accept": "*/*",
                    "Accept-Language": "zh-CN,zh;q=0.8,zh-TW;q=0.7,zh-HK;q=0.5,en-US;q=0.3,en;q=0.2",
                    "Sec-Fetch-Dest": "empty",
                    "Sec-Fetch-Mode": "no-cors",
                    "Sec-Fetch-Site": "same-origin",
                    "x-client-platform": "web",
                    "x-client-version": "1.0.0-always",
                    "x-client-locale": "zh_CN",
                    "x-app-version": "20241129.1",
                    "authorization": "Bearer " + bearer,
                    "content-type": "application/json",
                    "Priority": "u=4",
                    "Pragma": "no-cache",
                    "Cache-Control": "no-cache",
                    "Cookie": cookieString
                },
                "referrer": "https://chat.deepseek.com/a/chat/s/" + uid,
                "body": "{\"target_path\":\"/api/v0/chat/completion\"}",
                "method": "POST",
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const data = await response.json();
            return get_pow(data.data.biz_data.challenge);
        } catch (error) {
            console.error('Error in create_pow_challenge:', error);
            throw error;
        }
    };

    // 执行 PoW 挑战并发送请求
    try {
        const pow = await create_pow_challenge();
        console.log(pow);
        const response = await fetch('https://chat.deepseek.com/api/v0/chat/completion', {
            "credentials": "include",
            "headers": {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:135.0) Gecko/20100101 Firefox/135.0",
                "Accept": "*/*",
                "Accept-Language": "zh-CN,zh;q=0.8,zh-TW;q=0.7,zh-HK;q=0.5,en-US;q=0.3,en;q=0.2",
                "Sec-Fetch-Dest": "empty",
                "Sec-Fetch-Mode": "no-cors",
                "Sec-Fetch-Site": "same-origin",
                "x-ds-pow-response": pow,
                "x-client-platform": "web",
                "x-client-version": "1.0.0-always",
                "x-client-locale": "zh_CN",
                "x-app-version": "20241129.1",
                "authorization": "Bearer " + bearer,
                "content-type": "application/json",
                "Priority": "u=4",
                "Pragma": "no-cache",
                "Cache-Control": "no-cache",
                "Cookie": cookieString
            },
            "referrer": "https://chat.deepseek.com/a/chat/s/" + uid,
            "method": "POST",
            "body": JSON.stringify({
                "chat_session_id": uid,
                "parent_message_id": 8,
                "prompt": "细节呢",
                "ref_file_ids": [],
                "thinking_enabled": false,
                "search_enabled": false
            })
        });

        // 获取响应体的可读流
        const reader = response.body.getReader();
        let new_ob = {};
        let buffer = '';

        // 循环读取流中的数据
        while (true) {
            // 读取数据块
            const { value, done } = await reader.read();
            // 如果读取完成，则退出循环
            if (done) break;

            // 将读取的数据块解码为字符串，并追加到缓冲区
            buffer += new TextDecoder().decode(value);

            // 处理缓冲区中的所有行
            const lines = buffer.split('\n');

            // 遍历每一行并解析 SSE 数据
            lines.forEach(line => {
                const fields = line.split(':');
                if (fields.length > 1) {
                    // 提取键和值
                    const key = fields[0].trim();
                    const value = fields.slice(1).join(':').trim();
                    // 根据键存储值
                    new_ob[key] = value;
                }
            });

            // 如果有新数据，则尝试解析为 JSON 对象
            if (new_ob['data']) {
                try {
                    new_ob['data'] = JSON.parse(new_ob['data']);
                } catch (error) {
                    console.error('Error parsing JSON:', error);
                }
            }

            // 处理业务逻辑，例如打印或进一步处理 new_ob
            console.log('Received SSE data:', new_ob);
        }
    } catch (error) {
        console.error('Error in main request:', error);
    }
};

deepseek();
