async function main({ input }) {
    const rule = /^<think>([\s\S]*?)<\/think>/;
    const match = rule.exec(input);

    if (match) {
        return match[1]
    }
    return null;
}

module.exports = {
    main
};