const axios = require('axios');
const axiosCookieJarSupport = require('axios-cookiejar-support').wrapper;
const { CookieJar } = require('tough-cookie');
const { JSDOM } = require('jsdom');  // 引入 jsdom

const TRANSLATION_API_URL = 'https://www.google.com/async/translate?vet=12ahUKEwjA7b3giYuLAxU3hlYBHZvEAhYQqDh6BAgcEDA..i&ei=886RZ4CoELeM2roPm4mLsAE&opi=89978449&client=firefox-b-d&yv=3&_fmt=pc&cs=0'

// 判断翻译方式
function getMode(text) {
    return text.match('[\u4e00-\u9fa5]') ? ['zh-CN', 'en'] : ['en', 'zh-CN']
}

// 结果解析
function format(result) {
    const startIndex = result.indexOf('<style>');
    const htmlContent = startIndex !== -1 ? result.slice(startIndex) : result;

    // 使用 jsdom 解析 HTML
    const dom = new JSDOM(htmlContent);
    const doc = dom.window.document;

    const getText = (id) => (doc.getElementById(id)?.textContent || '');

    // 提取数据（与之前逻辑一致）
    const data = {
        sourceText: getText('tw-answ-source-text'),
        targetText: getText('tw-answ-target-text'),
        sourceRomanization: getText('tw-answ-source-romanization'),
        targetRomanization: getText('tw-answ-romanization'),
        detectedSourceLanguage: getText('tw-answ-detected-sl'),
        detectedSourceLanguageName: getText('tw-answ-detected-sl-name'),
        pronunciationUrl: getText('tw-answ-source-pronun-url'),
        bilingualEntries: []
    };

    // 处理双语释义（逻辑不变）
    const bilContainer = doc.getElementById('tw-answ-bil-fd');
    if (bilContainer) {
        const partOfSpeech = bilContainer.querySelector('.tw-bilingual-pos')?.textContent || '';
        bilContainer.querySelectorAll('.tw-bilingual-entry').forEach(entry => {
            data.bilingualEntries.push({
                partOfSpeech,
                source: entry.querySelector('.SvKTZc span')?.textContent || '',
                target: entry.querySelector('.MaH2Hf')?.textContent || ''
            });
        });
    }

    let text;
    if (data.bilingualEntries.length > 0) {
        text = data.bilingualEntries.map(item => `[${item.partOfSpeech}] ${item.source} (同义词:  ${item.target})`).join("<br>")
    }
    else {
        text = data.targetText
    }
    return text
}

async function translation(queryText) {
    try {
        let query = encodeURIComponent(queryText);
        let mode = getMode(queryText)
        axiosCookieJarSupport(axios);
        let cookieJar = new CookieJar();
        cookieJar.setCookie('NID=521=0J6p2ro0DWAsD4w-Nd79sxGMWVKnRiAZm7Lwz2T8uphfjPuqSnchmKd4jM3paI3AisxeVqgWv3s-sqxX43Ui91R4YfmpvvfT9rRl8sIUCwBV-nHBRG6yEXK80TjHKBABqD_jp5HtsBKRFPQwk-1a4gmlNiO-XjskXh9cIAVMshn_pDuiP8an2kUJ_nPutK424SdckqXrdcG7rhsT', 'https://www.google.com/')
        let get = `${TRANSLATION_API_URL}`;
        let response = await axios.post(get, {
            "async": `translate,sl:${mode[0]},tl:${mode[1]},st:${query},id:1737614649619,qc:true,ac:true,_id:tw-async-translate,_pms:s,_fmt:pc,_basejs:%2Fxjs%2F_%2Fjs%2Fk%3Dxjs.s.zh.WXA9ziPDIsA.2018.O%2Fam%3DAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAJQEIAAAAAAAAAKAAEAAAAAAAAASAAAAAAAAAkEgAAgAQAAAgAAAACACQAAgMACEDAAAAAAAAAAQAAAAAAQiADs9x8HAAAAAAAAAAAAIABEAAAAAABwAQAQfLIHCAAAAAAgAAAAAAIAAAABAAEAAAAKAAAAIAAAAAAgAAAAAAAAACAAAAAAAQD6AAAAAAAAAAAAAAAAAQAAAAAANIACAAL4AQAAAAAAgAMAAACAAAEAAI6BAQgAAAAAAADAHgAeDwiHFBYAAAAAAAAAAAAAAAAggAmCOZD-gAAEAAAAAAAAAAAAAAAAAABIETRxOQFAAQ%2Fdg%3D0%2Fbr%3D1%2Frs%3DACT90oG5pG6jx8vmp67qAw8x2VtA0docTQ,_basecss:%2Fxjs%2F_%2Fss%2Fk%3Dxjs.s.zTJALKkSZVM.L.F4.O%2Fam%3DAOAQIAQAAIAAAABiAKgAIAAAQQAAAAAAAAAAAAAAAAAAAAAAQAIAAAAEAAAACAQAAAIAAAARAAAACAAAQHACAAF2AAAAAOADCMSpAAQAAAgAgAAgAQAAAAEEAAIAGSAAAIAAAAAACAIAAAgAcAAAgAAAgAAAACAGBgAwAAAAgAAAISAAAAFYAOAAAZAAAAIHQPwAQAEAABAAAAKAACgBD8EwAIIKkAEuAAQAAAAAAAAAAAAAQACAEAAAA1AAABgAANADQAD4AAAkQQQAGAIAIIBCABAAAAAAAAAAACAAAgEAACAKAI6BAQgAAAAAAAAAEgAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAAACAAAAAAAAAAAAAAAAAAAAAAAAAAQ%2Fbr%3D1%2Frs%3DACT90oHVtQN5AkizmOhikpzCXG06rnFknQ,_basecomb:%2Fxjs%2F_%2Fjs%2Fk%3Dxjs.s.zh.WXA9ziPDIsA.2018.O%2Fck%3Dxjs.s.zTJALKkSZVM.L.F4.O%2Fam%3DAOAQIAQAAIAAAABiAKgAIAAAQQAAAAAAAAAAAAAAAAAAAAAAQAIAAAAEAAAACAQAAAIAAAJREIAACAAAQHAKAAF2AAAAAOADSMSpAAQAAAkEgAAgAQAAAgEEAAKAGSAAgMACEDAACAIAAAgAcAAAgAAQiADs9z8HBgAwAAAAgAAAISBEAAFYAOBwAZAQfLIHSPwAQAEgABAAAAKAACgBD8EwAIIKkAEuIAQAAAAgAAAAAAAAQCCAEAAAA1D6ABgAANADQAD4AAAkQQQAGAIANIBCABL4AQAAAAAAgCMAAgGAACEKAI6BAQgAAAAAAADAHgAeDwiHFBYAAAAAAAAAAAAAAAAggAmCOZD-gAAEAAAAAAAAAAAAAAAAAABIETRxOQFAAQ%2Fd%3D1%2Fed%3D1%2Fdg%3D0%2Fbr%3D1%2Fujg%3D1%2Frs%3DACT90oFBpbVoZh4MtvufnJZUXrOIWpjhvA`
        }, {
            jar: cookieJar,
            withCredentials: true,
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:135.0) Gecko/20100101 Firefox/135.0",
                "Accept": "*/*",
                "Accept-Language": "zh-CN,zh;q=0.8,zh-TW;q=0.7,zh-HK;q=0.5,en-US;q=0.3,en;q=0.2",
                "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
                "X-DoS-Behavior": "Embed",
                "Sec-Fetch-Dest": "empty",
                "Sec-Fetch-Mode": "cors",
                "Sec-Fetch-Site": "same-origin",
                "Priority": "u=0"
            },
            transformRequest: [(data, headers) => {
                let queryString = Object.keys(data).map(key => {
                    return encodeURIComponent(key) + '=' + encodeURIComponent(data[key]);
                }).join('&');
                return queryString;
            }]
        });

        return format(response.data)
    } catch (error) {
        console.log(error);
        return "翻译出错，请检查网络或者代码！";
    }

}

module.exports = {
    translation,
};
