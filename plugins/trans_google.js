const axios = require('axios');
const axiosCookieJarSupport = require('axios-cookiejar-support').wrapper;
const { CookieJar } = require('tough-cookie');
const he = require('he');
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
        let query = queryText.replaceAll('-\n','').replaceAll('\n',' ');
        let mode = getMode(queryText)
        axiosCookieJarSupport(axios);
        let cookieJar = new CookieJar();
        cookieJar.setCookie('NID=521=zQHCPNMFL4AnF4Ln47PuyYnAKnHjsX-8S1B6EZL5MJNj3SkzvGNsoFEcfQIrKVkyU33vrRxIFRPMNPd2d3bmAx9ED0y2ea4STbo5vRwU9grKB_Ld4XSBQJB3_KKmb4vuBVtwlxqRlJ9uX7kmC_RITrZEGLNfrUejyWeMetU5CxmElB4So41iYg_OCGddmvhCCdXBgEu-', 'https://www.google.com/')
        let get = `${TRANSLATION_API_URL}`;
        let response = await axios.post(get, {
            "async": `translate,sl:${mode[0]},tl:${mode[1]},st:${query},id:1737609313491,qc:true,ac:true,_id:tw-async-translate,_pms:s,_fmt:pc,_basejs:/xjs/_/js/k=xjs.s.zh.WXA9ziPDIsA.2018.O/am=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAJQEIAAAAAAAAAKAAEAAAAAAAAASAAAAAAAAAkEgAAgAQAAAgAAAACACQAAgMACEDAAAAAAAAAAQAAAAAAQiADs9x8HAAAAAAAAAAAAIABEAAAAAABwAQAQfLIHCAAAAAAgAAAAAAIAAAABAAEAAAAKAAAAIAAAAAAgAAAAAAAAACAAAAAAAQD6AAAAAAAAAAAAAAAAAQAAAAAANIACAAL4AQAAAAAAgAMAAACAAAEAAI6BAQgAAAAAAADAHgAeDwiHFBYAAAAAAAAAAAAAAAAggAmCOZD-gAAEAAAAAAAAAAAAAAAAAABIETRxOQFAAQ/dg=0/br=1/rs=ACT90oG5pG6jx8vmp67qAw8x2VtA0docTQ,_basecss:/xjs/_/ss/k=xjs.s.zTJALKkSZVM.L.F4.O/am=AOAQIAQAAIAAAABiAKgAIAAAQQAAAAAAAAAAAAAAAAAAAAAAQAIAAAAEAAAACAQAAAIAAAARAAAACAAAQHACAAF2AAAAAOADCMSpAAQAAAgAgAAgAQAAAAEEAAIAGSAAAIAAAAAACAIAAAgAcAAAgAAAgAAAACAGBgAwAAAAgAAAISAAAAFYAOAAAZAAAAIHQPwAQAEAABAAAAKAACgBD8EwAIIKkAEuAAQAAAAAAAAAAAAAQACAEAAAA1AAABgAANADQAD4AAAkQQQAGAIAIIBCABAAAAAAAAAAACAAAgEAACAKAI6BAQgAAAAAAAAAEgAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAAACAAAAAAAAAAAAAAAAAAAAAAAAAAQ/br=1/rs=ACT90oHVtQN5AkizmOhikpzCXG06rnFknQ,_basecomb:/xjs/_/js/k=xjs.s.zh.WXA9ziPDIsA.2018.O/ck=xjs.s.zTJALKkSZVM.L.F4.O/am=AOAQIAQAAIAAAABiAKgAIAAAQQAAAAAAAAAAAAAAAAAAAAAAQAIAAAAEAAAACAQAAAIAAAJREIAACAAAQHAKAAF2AAAAAOADSMSpAAQAAAkEgAAgAQAAAgEEAAKAGSAAgMACEDAACAIAAAgAcAAAgAAQiADs9z8HBgAwAAAAgAAAISBEAAFYAOBwAZAQfLIHSPwAQAEgABAAAAKAACgBD8EwAIIKkAEuIAQAAAAgAAAAAAAAQCCAEAAAA1D6ABgAANADQAD4AAAkQQQAGAIANIBCABL4AQAAAAAAgCMAAgGAACEKAI6BAQgAAAAAAADAHgAeDwiHFBYAAAAAAAAAAAAAAAAggAmCOZD-gAAEAAAAAAAAAAAAAAAAAABIETRxOQFAAQ/d=1/ed=1/dg=0/br=1/ujg=1/rs=ACT90oFBpbVoZh4MtvufnJZUXrOIWpjhvA`
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
