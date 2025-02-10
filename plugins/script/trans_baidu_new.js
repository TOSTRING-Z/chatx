const axios = require("axios");
const axiosCookieJarSupport = require("axios-cookiejar-support").wrapper;
const { CookieJar } = require("tough-cookie");
const he = require("he");

const TRANSLATION_API_URL = "https://fanyi.baidu.com/transapi";

// 判断翻译方式
function mode(text) {
  return text.match("[\u4e00-\u9fa5]") ? ["zh", "en"] : ["en", "zh"];
}

// 结果解析
function format(result) {
  try {
    let text;
    if ("result" in result) {
      result = JSON.parse(result.result)
      
      let word = result.content[0].mean.map(x => {
        let t = Object.keys(x.cont).join(";")
        return ("pre" in x)?`${x.pre} ${t}`:t;
      }).join("\n");
      if ("voice" in result) {
        if (result["voice"].length == 1) {
          let phonic = result["voice"][0]["phonic"];
          text = `发音[${phonic}]\n${word}`;
        }
        else if(result["voice"].length == 2){
          let en_phonic = result["voice"][0]["en_phonic"];
          let am_phonic = result["voice"][1]["us_phonic"];
          text = `英[${en_phonic}]\n美[${am_phonic}]\n${word}`;
        } else {
          text = word;
        }
      }
      else {
        text = word;
      }
    } else {
      text = result.data[0]["dst"];
    }
    return he.encode(text);
  } catch (error) {
    console.log(error);
    return null;
  }
}

async function main(queryText) {
  try {
    axiosCookieJarSupport(axios);
    let cookieJar = new CookieJar();
    cookieJar.setCookie(
      "BAIDUID=093F392382B6341736FC82C7763C5058:FG=1",
      "https://fanyi.baidu.com"
    );
    let response = await axios.post(
        TRANSLATION_API_URL,
      {
        from: mode(queryText)[0],
        to: mode(queryText)[1],
        source: "txt",
        query: queryText
      },
      {
        jar: cookieJar,
        withCredentials: true,
        headers: {
          Accept: "*/*",
          "Accept-Encoding": "gzip, deflate, br",
          "Accept-Language":
            "zh-CN,zh;q=0.8,zh-TW;q=0.7,zh-HK;q=0.5,en-US;q=0.3,en;q=0.2",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          "Content-Type": "application/x-www-form-urlencoded",
          Cookie: "BAIDUID=093F392382B6341736FC82C7763C5058:FG=1",
          Host: "fanyi.baidu.com",
          Origin: "https://fanyi.baidu.com",
          Pragma: "no-cache",
          Referer:
            "https://fanyi.baidu.com/mtpe-individual/multimodal?ext_channel=Aldtype",
          "Sec-Fetch-Dest": "empty",
          "Sec-Fetch-Mode": "cors",
          "Sec-Fetch-Site": "same-origin",
          "User-Agent":
            "Mozilla/5.0 (X11; Linux x86_64; rv:125.0) Gecko/20100101 Firefox/125.0",
        },
        // 禁止自动编码，手动序列化数据
        transformRequest: [(data, headers) => {
          // 将 data 对象转换为 application/x-www-form-urlencoded 格式的查询字符串
          let queryString = Object.keys(data).map(key => {
              return encodeURIComponent(key) + '=' + encodeURIComponent(data[key]);
          }).join('&');
          return queryString;
      }]
      }
    );

    return format(response.data);
  } catch (error) {
    return error;
  }
}

module.exports = {
  main,
};
