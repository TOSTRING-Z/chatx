async function main({ query }) {
    const rule = /^<think>([\s\S]*?)<\/think>/;
    const match = rule.exec(query);

    if (match) {
        return match[1]
    }
    return null;
}

module.exports = {
    main
};