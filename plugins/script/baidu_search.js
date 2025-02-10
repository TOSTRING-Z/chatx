const axios = require('axios')
const cheerio = require('cheerio')

async function main(keyword) {
    const numResults = 10
    const searchResults = []
    let page = 1
    let nextUrl = `https://www.baidu.com/s?ie=utf-8&tn=baidu&wd=${encodeURIComponent(keyword)}`

    while (searchResults.length < numResults) {
        const { results, nextPageUrl } = await parseBaiduPage(nextUrl, searchResults.length)
        searchResults.push(...results)
        if (!nextPageUrl) break
        nextUrl = nextPageUrl
        page++
    }

    if (searchResults.length > 0)
        return JSON.stringify(searchResults.slice(0, numResults))
    else
        return null;
}

async function parseBaiduPage(url, rankStart) {

    try {
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept-Language': 'zh-CN,zh;q=0.9'
            }
        })

        const $ = cheerio.load(response.data)
        const results = []

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
                results.push({
                    rank: rankStart + i + 1,
                    title,
                    url,
                    abstract: abstract.slice(0, 300)
                })
            }
        })

        const nextPageUrl = $('a.n').eq(-1).attr('href')
        return {
            results,
            nextPageUrl: nextPageUrl ? new URL(nextPageUrl, 'https://www.baidu.com').href : null
        }
    } catch (error) {
        console.error('Parse error!')
        return { results: [], nextPageUrl: null }
    }
}

module.exports = {
    main
};