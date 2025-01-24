deepseek = async () => {
    // 准备要发送的cookies
    const cookies = {
        "__cf_bm": "ZXv96ZESRXwzZ7yJI21zPyOg2exw.MBcLMAWOxOwbAA-1737717726-1.0.1.1-EnYxaPVSJlDV5_rwqe4FkmeYP6i.pEV75PctKXHrc.dy9x38SbyCnAqM0LGFexsBcg3FRw44gqNICZFGivB.zw",
        "ds_session_id": "5b45ca921aec4bc581cd03d917134665",
        "Hm_lpvt_1fff341d7a963a4043e858ef0e19a17c": "1737689060",
        "Hm_lvt_1fff341d7a963a4043e858ef0e19a17c": "1736740375",
        "HWWAFSESID": "64f2d4b7abcd5666907",
        "HWWAFSESTIME": "1737717721493"
    };

    // 将cookies对象转换为字符串
    const cookieString = Object.entries(cookies)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join('; ');

    await fetch("https://chat.deepseek.com/api/v0/chat/create_pow_challenge", {
        "credentials": "include",
        "headers": {
            "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:135.0) Gecko/20100101 Firefox/135.0",
            "Accept": "*/*",
            "Accept-Language": "zh-CN,zh;q=0.8,zh-TW;q=0.7,zh-HK;q=0.5,en-US;q=0.3,en;q=0.2",
            "x-client-platform": "web",
            "x-client-version": "1.0.0-always",
            "x-client-locale": "zh_CN",
            "x-app-version": "20241129.1",
            "authorization": "Bearer RNdjb4FxYSjCayYNI38osA/stxUE8teIy6piYfOAagEcZ8L31QuGREO7xXiQRyaP",
            "content-type": "application/json",
            "Sec-Fetch-Dest": "empty",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Site": "same-origin",
            "Cookie": cookieString
        },
        "referrer": "https://chat.deepseek.com/a/chat/s/f05e338e-fed6-46a3-aec6-f38bdb0f3fb2",
        "body": "{\"target_path\":\"/api/v0/chat/completion\"}",
        "method": "POST"
    });
    // 发起一个 POST 请求到指定 API
    const response = await fetch('https://chat.deepseek.com/api/v0/chat/completion', {
        method: "POST",
        cache: "no-cache",
        keepalive: true,
        credentials: "include",
        referrer: "https://chat.deepseek.com/a/chat/s/f05e338e-fed6-46a3-aec6-f38bdb0f3fb2",
        headers: {
            "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:135.0) Gecko/20100101 Firefox/135.0",
            "Accept": "*/*",
            "Accept-Language": "zh-CN,zh;q=0.8,zh-TW;q=0.7,zh-HK;q=0.5,en-US;q=0.3,en;q=0.2",
            "x-ds-pow-response": "eyJhbGdvcml0aG0iOiJEZWVwU2Vla0hhc2hWMSIsImNoYWxsZW5nZSI6IjRhZDk3ZjY2ZmMzYjZiODNkMzc1NDYwM2RlMjc2YjIxYTc0OGI4YjczN2M3Y2NlMDBmZWQwZGJkZjU2YTQwZTEiLCJzYWx0IjoiZGIzZGM1NjRmYzUwZTdiM2M5NjkiLCJhbnN3ZXIiOjEwNDc4MSwic2lnbmF0dXJlIjoiYjg1MDYxYjBkMzlhZTkzNmQ2MWM0MDc2NGU1YTkwODFlY2RlYWZlMDM0NzYyMWUzNzQ1NzdjZDYzZmQ4NGQ2ZCIsInRhcmdldF9wYXRoIjoiL2FwaS92MC9jaGF0L2NvbXBsZXRpb24ifQ==",
            "x-client-platform": "web",
            "x-client-version": "1.0.0-always",
            "x-client-locale": "zh_CN",
            "x-app-version": "20241129.1",
            "authorization": "Bearer RNdjb4FxYSjCayYNI38osA/stxUE8teIy6piYfOAagEcZ8L31QuGREO7xXiQRyaP",
            "content-type": "application/json",
            "Sec-Fetch-Dest": "empty",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Site": "same-origin",
            "Priority": "u=0",
            "x-app-version": "20241129.1",
            "x-client-locale": "zh_CN",
            "x-client-platform": "web",
            "x-client-version": "1.0.0-always",
            "x-ds-pow-response": "eyJhbGdvcml0aG0iOiJEZWVwU2Vla0hhc2hWMSIsImNoYWxsZW5nZSI6IjRiNjIzYThkMWYzZDFjY2Q0ZDk2YTYzZjMxNDZhNWY2NTAzYTRhZGVkNmM5NzllYzg2YzAzMzY5YTdjMDM5ZTUiLCJzYWx0IjoiZTE3YzU1MThmMTk1NWFjZjRmMjMiLCJhbnN3ZXIiOjEwNzc2NSwic2lnbmF0dXJlIjoiNzI4MWYyODAxYTU1ZmY4NGE3OTkyN2UwOThhMGRjMmI1ZDU4ZDQ3MGYyODM1MGEzMzJhY2ZlNjFiMTdjYjQxNSIsInRhcmdldF9wYXRoIjoiL2FwaS92MC9jaGF0L2NvbXBsZXRpb24ifQ==",
            "Cookie": cookieString
        },
        body: JSON.stringify({
            "chat_session_id": "f05e338e-fed6-46a3-aec6-f38bdb0f3fb2",
            "parent_message_id": 26,
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
