const axios = require('axios');
const axiosCookieJarSupport = require('axios-cookiejar-support').wrapper;
const { CookieJar } = require('tough-cookie');
const he = require('he');

const TRANSLATION_API_URL = 'https://www.google.com/async/translate?cs=0'

// 判断翻译方式
function getMode(text) {
    return text.match('[\u4e00-\u9fa5]') ? ['zh-CN', 'en'] : ['en', 'zh-CN']
}
// 结果解析
function format(result) {
    try {
        text = String.toString(result);
        return he.encode(text)
    } catch (error) {
        return error
    }
}
async function translation(queryText) {
    try {
        queryText = queryText.replaceAll('-\n','').replaceAll('\n',' ');
        let query = encodeURI(queryText).replaceAll('%20','+');
        let mode = getMode(queryText)
        axiosCookieJarSupport(axios);
        let cookieJar = new CookieJar();
        cookieJar.setCookie('ACE=AZ6Zc-U0gWiCxHict_A1Op05e56jyqusf4C3WPG_Q9Zj0KPQ9cVbJu6l0jM; NID=521=Plu82nV2OTHPkK4632Vdzzq8o9QqtKCdICWriNMDYGofoLIoHVHGGJTUwht7pSgcI_0w8aPmscnAgqmZp38oEi3mEPaUvmK7L8rCVRLd0A5DcF2NuXkhcxJtTDJrQyhRceK69_xBJnOYKSqv7-etjxIlW5cxsvEr3fw4iWzNcPhgnsPavAdaBA0nggKe88Sh6V5Uz6PvYGCIzT3AfhcNERVd-bWb3RKckxwzy_lqPIxLVFxuY2cgZcY8S_9U60X5XO_XsfM; OTZ=7921605_24_24__24_', 'https://google.com/')
        let get = `${TRANSLATION_API_URL}`;
        let response = await axios.post(get, "async=translate,sl:en,tl:zh-CN,st:world,id:1737606230795,qc:true,ac:true,_id:tw-async-translate,_pms:s,_fmt:pc,_basejs:%2Fxjs%2F_%2Fjs%2Fk%3Dxjs.s.zh.FV6j4ih4Xpw.2018.O%2Fam%3DAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAJQEIAAAAAAAAAKAAAAAAAAAAAASAAAAAAAAAQEgAAgAQAAAgAAAACACQAAgMACEDAAAAAAAAAAQAAAAAAQiADs9x8HAAAAAAAAAAAAIABEAAAAAABwAQAQfLIHCAAAAAAgAAAAAAIAAAABAAAAAAAKAAAAIAAAAAAgAAAAAAAAACAAAAAAAQD6AAAAAAAAAAAAAAAAAQAAACAAMIACAAL4AQAAAAAAgAMAAACAAAEAAI6BAQgAAAAAAADAHgAeDwiHFBYAAAAAAAAAAAAAAAAggAmCOZD-gAAEAAAAAAAAAAAAAAAAAABIETRxOQEAAQ%2Fdg%3D0%2Fbr%3D1%2Frs%3DACT90oH7sqGr7-Pe-sWDimRZ22G5v-tkgw,_basecss:%2Fxjs%2F_%2Fss%2Fk%3Dxjs.s.zTJALKkSZVM.L.F4.O%2Fam%3DAOAQIAQAAIAAAABCAKgAIAAAAAAAAAAAAAAAAAAAAAAAAAAAQAIAAAAEAAAACAQAAAIAAAARAAAACAAAQHACAAB2AAAAAOADCMSpAAQAAAAAgAAgAQAAAAEEAAIAGSAAAIAAAAAACAIAAAgAcAAAgAAAgAAAACAGBgAwAAAAgAAAISAAAAFYAOAAAZAAAAIHQPwAQAEAABAAAAKAACgBD8AwAIIKkAEuAAQAQAAAAAAAAAAAQACAEAAAA1AAABgAANADQAD4ADg1QQQAGDIAIIBCABAAAAAAAAAAACAAAgEAACAKAI6BAQgAAAAAAAAAEgAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAAACAAAAAAAAAAAAAAAAAAAAAAAAAAQ%2Fbr%3D1%2Frs%3DACT90oF-1r51pIgYaJx2AFR_CpjJNkukow,_basecomb:%2Fxjs%2F_%2Fjs%2Fk%3Dxjs.s.zh.FV6j4ih4Xpw.2018.O%2Fck%3Dxjs.s.zTJALKkSZVM.L.F4.O%2Fam%3DAOAQIAQAAIAAAABCAKgAIAAAAAAAAAAAAAAAAAAAAAAAAAAAQAIAAAAEAAAACAQAAAIAAAJREIAACAAAQHAKAAB2AAAAAOADSMSpAAQAAAQEgAAgAQAAAgEEAAKAGSAAgMACEDAACAIAAAgAcAAAgAAQiADs9z8HBgAwAAAAgAAAISBEAAFYAOBwAZAQfLIHSPwAQAEgABAAAAKAACgBD8AwAIIKkAEuIAQAQAAgAAAAAAAAQCCAEAAAA1D6ABgAANADQAD4ADg1QQQAGDIAMIBCABL4AQAAAAAAgCMAAgGAACEKAI6BAQgAAAAAAADAHgAeDwiHFBYAAAAAAAAAAAAAAAAggAmCOZD-gAAEAAAAAAAAAAAAAAAAAABIETRxOQEAAQ%2Fd%3D1%2Fed%3D1%2Fdg%3D0%2Fbr%3D1%2Fujg%3D1%2Frs%3DACT90oE9CCrqRN3K8gYMgt_gzoMbe5wWbQ", {
            jar: cookieJar,
            withCredentials: true,
            headers: {
                "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:135.0) Gecko/20100101 Firefox/135.0",
                "Accept": "*/*",
                "Accept-Language": "zh-CN,zh;q=0.8,zh-TW;q=0.7,zh-HK;q=0.5,en-US;q=0.3,en;q=0.2",
                "Sec-Fetch-Dest": "empty",
                "Sec-Fetch-Mode": "no-cors",
                "Sec-Fetch-Site": "same-origin",
                "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
                "X-DoS-Behavior": "Embed",
                "Pragma": "no-cache",
                "Cache-Control": "no-cache",
                "Priority": "u=4"
            },
        });
        
        return format(response.data)
    } catch (error) {
        return error
    }

}

module.exports = {
    translation,
};
