const axios = require('axios');

async function jours_if({query}) {
    const regex = /(.*?)\n/g;
    try {
        const processedContent = `${query.replace(/\./g, '')}\n`;
        const pubmidJudge = [...processedContent.matchAll(regex)].map(match => match[1]);

        if (!pubmidJudge.length) return "";

        const params = pubmidJudge.map(pmjab => ({ pmjab: pmjab }));
        const response = await axios.post(
            'https://api.pubmedplus.com/v1/pmjournal/impactfactor',
            params
        );

        return response.data
            .map(item => `期刊:${item.pmjab}, IF:${item.jour_if}`)
            .join('\n');

    } catch (error) {
        throw new Error(`处理失败: ${error.message}`);
    }
}

async function pmids_if(pmids) {
    let url = `https://eutils.pubmedplus.com/entrez/eutils/esummary.fcgi?db=pubmed&retmode=json&retmax=100&retstart=0&id=${pmids}`
    const response = await axios.post(url);
    const result = response.data.result;
    const content = result.uids.map(uid => {
        return result[uid].source
    }).join("\n");
    return jours_if(content)
}

function main(query) {
    if (query.trim().match(/^[\d,]+$/)) {
        return pmids_if(query);
    } else {
        return jours_if(query);
    }
}

module.exports = {
    main
};