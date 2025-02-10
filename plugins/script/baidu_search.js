const axios = require('axios')
const cheerio = require('cheerio')

async function main({ query, params = null }) {
    let num_results = 2;
    let text_max_len = 500;
    if (params) {
        num_results = params.num_results;
        text_max_len = params.text_max_len;
    }

    const searchResults = []
    let page = 1
    let nextUrl = `https://www.baidu.com/s?ie=utf-8&tn=baidu&wd=${encodeURIComponent(query)}`

    while (searchResults.length < num_results) {
        const { results, nextPageUrl } = await parseBaiduPage(nextUrl, searchResults.length, num_results, text_max_len)
        searchResults.push(...results)
        if (!nextPageUrl) break
        nextUrl = nextPageUrl
        page++
    }

    if (searchResults.length > 0)
        return JSON.stringify(searchResults.slice(0, num_results))
    else
        return null;
}

async function parseBaiduPage(url, rankStart, num_results, text_max_len) {

    try {
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept-Language': 'zh-CN,zh;q=0.9'
            }
        })

        const $ = cheerio.load(response.data)
        const infos = []

        $('#content_left .c-container').each((i, el) => {
            const $el = $(el)
            const title = $el.find('h3').text().trim()
            const url = $el.find('a').attr('href')
            let abstract = $el.find('.c-abstract').text().trim()

            if (!abstract) {
                abstract = $el.text()
                    .replace(title, '')
                    .replace(/\s+/g, ' ')
                    .substring(0, 300)
            }

            if (title && url) {
                infos.push({
                    rank: rankStart + i + 1,
                    title,
                    url,
                    abstract: abstract.slice(0, 300)
                })
            }
        })

        const results = []
        for (const i in infos) {
            const info = infos[i];
            const dirtyText = await getText(info.url);
            var S = require('string');
            var cleanText = S(dirtyText).collapseWhitespace().s;

            if (cleanText) {
                results.push({
                    title: info.title,
                    text: cleanText.slice(text_max_len)
                })
                rankStart++;
            }
            if (rankStart >= num_results) {
                break;
            }
        }

        const nextPageUrl = $('a.n').eq(-1).attr('href')
        return {
            results,
            nextPageUrl: nextPageUrl ? new URL(nextPageUrl, 'https://www.baidu.com').href : null
        }
    } catch (error) {
        console.error('parseBaiduPage error!')
        return { results: [], nextPageUrl: null }
    }
}

async function getText(url) {
    try {
        const response = await axios.get(`https://r.jina.ai/${url}`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept-Language': 'zh-CN,zh;q=0.9'
            }
        })

        const $ = cheerio.load(response.data)
        const text = $('body').text();
        return text;
    } catch (error) {
        console.error('getUrl error!')
        return null;
    }

}

module.exports = {
    main
};