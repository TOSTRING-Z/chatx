// const fetch = require('node-fetch');

deepseek = async () => {
    // 初始化 cookies 和配置
    let cookies = {
        "__cf_bm": "RRufem7pd_1SyeAW3QkcoNDESAYXCjmk1v2P52fIceE-1737796254-1.0.1.1-xx0GRIME3OdKJewU72a4yrQDJF_pQJxSDOcR1VSzilHhBQC_GB87_f4siH1wCQ7KteugzYzZmpkSlC5weq9hiQ",
        ".thumbcache_6b2e5483f9d858d7c661c5e276b6a6ae": "Ox5DP6fmwTwcHHLTTTfBk614fcV1jeX2ayJvH82R8Bx7eQGObm1QSavont0octqPkSS4Pn6gwOApUjUyJVFQxQ==",
        "cf_clearance": "CuK1q9wu_w8K8aJxh_IYnEdHfoM3rCC7eJIn8KONlYU-1737796444-1.2.1.1-zy4Pz2mUEBSS0XNLJjztyEgewWF74oC1IuKStj5G_NXOVZ.7bdIxNBmAEmzciUOCaeizVzuuqEal2ngjUj.ubc_RgJiwYNSJvzUnzaIr0wr1mqPKJcizaIH6pPWYkfLZl04S3eg7Jys5G697Pj0rKy36uGisOH4y_4nMCWz9kmQ4Oso8bGhTc84XJXcxMmckHEDn7gl_Aq71qfYrg9umCa06jmGJACxb28EUK95TaAFsKHRdSygKjxrh1iY0YUVT9zC11Zb4eweEeKLb86HWKz1l7bEDvS.peyTQ43bCyKPdtiDVGfXH416VtgRpHSYbqs.yrcQzGOHbBhzwMOcKmw",
        "ds_session_id": "964e96e83aef48498ec996664305d3c5",
        "Hm_lpvt_1fff341d7a963a4043e858ef0e19a17c": "1737796718",
        "Hm_lvt_1fff341d7a963a4043e858ef0e19a17c": "1736740375",
        "HMACCOUNT": "98CD581C3D39923B",
        "HWWAFSESID": "64f2d4b7abcd5666907",
        "HWWAFSESTIME": "1737717721493",
        "intercom-device-id-guh50jw4": "1f5818bf-06b2-4514-95db-6da33e986fb6",
        "intercom-session-guh50jw4": "TUdOS3lBNWkvbUFRNkdEYmE5NldOVE9QUGRINlNManBGQ1R6OW5SUGRGRFQ2eXlYTFNheVVUZjhmcnlGU1dURHFiRTNxdVllWDlWbWpNOGlXNllGRVNvdnJlKzBBYVpCc3p5c2RPVWNSQ1k9LS1QYTNoR0RQRXowVm1WZlZjMHRBMFJnPT0=--36e54684357733a160b905e5ed668ffb8dec31fc"
    }
    // 辅助函数：生成 PoW 响应
    const get_pow = (e) => {
        e =  {
                        "algorithm": "DeepSeekHashV1",
                        "challenge": "7afc97880a17590ac3c8937786b476e9d207084ba6ae1fb9974456d76e0f246a",
                        "salt": "702459896bf0cb9432cb",
                        "signature": "628f9fc62eb261a88a014a1e9a498bb64d6d7cdc247ffd36d11eb9ff3aeb7c7a",
                        "difficulty": 144000,
                        "expire_at": 1737797665953,
                        "expire_after": 300000,
                        "target_path": "/api/v0/file/upload_file"
                    }
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

    const uid = "383ace33-3df0-47de-8530-70d9bea3e0a8";
    const bearer = "JPFvX2yZI+kvJIYm3lQXh/6OqxTP1Hnd1hB8Y05rxwLVm7zJvn/NPuVci/oWMHNE";

    // 创建 PoW 挑战
    const create_pow_challenge = async () => {
        try {
            let response = await fetch("https://chat.deepseek.com/api/v0/chat/create_pow_challenge", {
                "credentials": "include",
                "headers": {
                    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:135.0) Gecko/20100101 Firefox/135.0",
                    "Accept": "*/*",
                    "Accept-Language": "zh-CN,zh;q=0.8,zh-TW;q=0.7,zh-HK;q=0.5,en-US;q=0.3,en;q=0.2",
                    "x-client-platform": "web",
                    "x-client-version": "1.0.0-always",
                    "x-client-locale": "zh_CN",
                    "x-app-version": "20241129.1",
                    "authorization": "Bearer " + bearer,
                    "content-type": "application/json",
                    "Sec-Fetch-Dest": "empty",
                    "Sec-Fetch-Mode": "cors",
                    "Sec-Fetch-Site": "same-origin"
                },
                "referrer": "https://chat.deepseek.com/a/chat/s/" + uid,
                "body": "{\"target_path\":\"/api/v0/chat/completion\"}",
                "method": "POST",
                "mode": "cors"
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            // 正确获取 Set-Cookie 头（使用 headers.raw()）
            const setCookieHeaders = response.headers.getSetCookie();
            if (setCookieHeaders) {
                setCookieHeaders.forEach(cookie => {
                    const [nameValue] = cookie.split(';');
                    const [name, value] = nameValue.split('=');
                    cookies[name] = value;
                });
                // 更新 cookieString（避免重新声明 const）
                cookieString = Object.entries(cookies)
                    .map(([k, v]) => `${k}=${v}`)
                    .join('; ');

                response = await fetch("https://chat.deepseek.com/api/v0/chat/create_pow_challenge", {
                    "credentials": "include",
                    "headers": {
                        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:135.0) Gecko/20100101 Firefox/135.0",
                        "Accept": "*/*",
                        "Accept-Language": "zh-CN,zh;q=0.8,zh-TW;q=0.7,zh-HK;q=0.5,en-US;q=0.3,en;q=0.2",
                        "x-client-platform": "web",
                        "x-client-version": "1.0.0-always",
                        "x-client-locale": "zh_CN",
                        "x-app-version": "20241129.1",
                        "authorization": "Bearer " + bearer,
                        "content-type": "application/json",
                        "Sec-Fetch-Dest": "empty",
                        "Sec-Fetch-Mode": "cors",
                        "Sec-Fetch-Site": "same-origin",
                        "Cookie": cookieString
                    },
                    "referrer": "https://chat.deepseek.com/a/chat/s/" + uid,
                    "body": "{\"target_path\":\"/api/v0/chat/completion\"}",
                    "method": "POST",
                    "mode": "cors"
                });

                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

                const data = await response.json();
                return get_pow(data.data.biz_data.challenge);
            }
        } catch (error) {
            console.error('Error in create_pow_challenge:', error);
            throw error;
        }
    };

    // 执行 PoW 挑战并发送请求
    try {
        const pow = await create_pow_challenge();
        console.log(pow);
        return;
        const response = await fetch("https://chat.deepseek.com/api/v0/chat/completion", {
            "credentials": "include",
            "headers": {
                "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:135.0) Gecko/20100101 Firefox/135.0",
                "Accept": "*/*",
                "Accept-Language": "zh-CN,zh;q=0.8,zh-TW;q=0.7,zh-HK;q=0.5,en-US;q=0.3,en;q=0.2",
                "x-ds-pow-response": pow,
                "x-client-platform": "web",
                "x-client-version": "1.0.0-always",
                "x-client-locale": "zh_CN",
                "x-app-version": "20241129.1",
                "authorization": "Bearer " + bearer,
                "content-type": "application/json",
                "Sec-Fetch-Dest": "empty",
                "Sec-Fetch-Mode": "cors",
                "Sec-Fetch-Site": "same-origin",
                "Priority": "u=0",
                "Cookie": cookieString
            },
            "referrer": "https://chat.deepseek.com/a/chat/s/" + uid,
            "body": JSON.stringify({
                "chat_session_id": uid,
                "parent_message_id": 2,
                "prompt": "enen",
                "ref_file_ids": [],
                "thinking_enabled": false,
                "search_enabled": false
            }),
            "method": "POST",
            "mode": "cors"
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
