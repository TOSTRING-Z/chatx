deepseek = async () => {
    // 准备要发送的cookies
    const cookies = {
            "__cf_bm": "v1zLiIDYYFjbEfyF8nwRhdeijyVGrUkwouzpecNgnt0-1737733931-1.0.1.1-bj6__FT6PmBMgNn17RTn_qa.q58C_ig7i6.ZVMrEUtp7zcqidG_fw9qgprGDPPvFWBLf7TbJh5aOH6p2Bj8mYQ",
            ".thumbcache_6b2e5483f9d858d7c661c5e276b6a6ae": "JeJmdvVKjadf6GzodAgOLrEQiTAZbeL5/TOxm5erk4c81bodYKMoO2wb6xlqxD1vu03PXr+OFhV6fWMOQD8/zQ==",
            "ds_session_id": "743a84ab555e43219a4e69e6b3f3ee02",
            "Hm_lpvt_1fff341d7a963a4043e858ef0e19a17c": "1737733930",
            "Hm_lpvt_fb5acee01d9182aabb2b61eb816d24ff": "1737610490",
            "Hm_lvt_1fff341d7a963a4043e858ef0e19a17c": "1737610436",
            "Hm_lvt_fb5acee01d9182aabb2b61eb816d24ff": "1737610490",
            "HMACCOUNT": "3948F24EF13E279A",
            "HWWAFSESID": "eea5636da68d55dacdc",
            "HWWAFSESTIME": "1737610431802",
            "intercom-device-id-guh50jw4": "8a2c4776-8302-4930-a99d-b5e2c8fdbbf4",
            "intercom-session-guh50jw4": "bHNJajVkRUExblljRUFLTVphcWFMSkJtaVllN1VUOUNQbTJueGhHRDBIM2Y4NkluV1oxZStrNVh1YVVJUXF4dnhXZ0xIQkwvMFJVUzRITFl1Ymo3TjF0TUNjbC9RUDRUdk1GUlJ4aFo2cEE9LS1DYlQ3WTdYd1ZyYUw5YUx4TzdUck5RPT0=--f064ffb2893b94591bb99edbc91217d27ab38b77",
            "smidV2": "20250123133355150f15eac0a53665a4037ff506797aba00f05e7ec0b3b71d0"
    };

    // 将cookies对象转换为字符串
    const cookieString = Object.entries(cookies)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join('; ');
    const get_pow = (e, target_path) => {
        return btoa(
            JSON.stringify({
                algorithm: e.algorithm,
                challenge: e.challenge,
                salt: e.salt,
                answer: e.answer,
                signature: e.signature,
                target_path: target_path
            })
        );
    };

    const uid = "5dc1621e-4ebd-4cb5-a440-a6c9e1eebc40";
    const bearer = "2XhN/OLs8YvfhP1LDHjZc3oV8DAw1hHK7qiah2bU7rQ0/3N7n4ibxfwS3VPOT6ri";

    const create_pow_challenge = async () => {
        try {
            const response = await fetch("https://chat.deepseek.com/api/v0/chat/create_pow_challenge", {
                "credentials": "include",
                "headers": {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:135.0) Gecko/20100101 Firefox/135.0",
                    "Accept": "*/*",
                    "Accept-Language": "zh-CN,zh;q=0.8,zh-TW;q=0.7,zh-HK;q=0.5,en-US;q=0.3,en;q=0.2",
                    "x-client-platform": "web",
                    "x-client-version": "1.0.0-always",
                    "x-client-locale": "zh_CN",
                    "x-app-version": "20241129.1",
                    "authorization": `Bearer ${bearer}`,
                    "content-type": "application/json",
                    "Sec-Fetch-Dest": "empty",
                    "Sec-Fetch-Mode": "cors",
                    "Sec-Fetch-Site": "same-origin",
                    "Priority": "u=0",
                    "Cookie": cookieString
                },
                "referrer": `https://chat.deepseek.com/a/chat/s/${uid}`,
                "body": "{\"target_path\":\"/api/v0/chat/completion\"}",
                "method": "POST"
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log(data);
            return get_pow(data.data.biz_data.challenge, "/api/v0/chat/completion");
        } catch (error) {
            console.error('Error:', error);
        }
    };

    // 调用函数
    pow = await create_pow_challenge();

    // 发起一个 POST 请求到指定 API
    const response = await fetch('https://chat.deepseek.com/api/v0/chat/completion', {
        method: "POST",
        cache: "no-cache",
        keepalive: true,
        credentials: "include",
        referrer: `https://chat.deepseek.com/a/chat/s/${uid}`,
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:135.0) Gecko/20100101 Firefox/135.0",
            "Accept": "*/*",
            "Accept-Language": "zh-CN,zh;q=0.8,zh-TW;q=0.7,zh-HK;q=0.5,en-US;q=0.3,en;q=0.2",
            "x-ds-pow-response": pow,
            "x-client-platform": "web",
            "x-client-version": "1.0.0-always",
            "x-client-locale": "zh_CN",
            "x-app-version": "20241129.1",
            "authorization": `Bearer ${bearer}`,
            "content-type": "application/json",
            "Sec-Fetch-Dest": "empty",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Site": "same-origin",
            "Priority": "u=0",
            "Cookie": cookieString
        },
        body: JSON.stringify({
            "chat_session_id": uid,
            "parent_message_id": 14,
            "prompt": "翻译“flash”",
            "ref_file_ids": [],
            "thinking_enabled": false,
            "search_enabled": false
        }),
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
};

deepseek();
