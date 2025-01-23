// 判断翻译方式
function getMode(text) {
    return text.match('[\u4e00-\u9fa5]') ? ['zh-CN', 'en'] : ['en', 'zh']
}

async function translation(queryText) {
    return new Promise((resolve, reject) => {
        let query = encodeURI(queryText).replaceAll('%20','+');
        let mode = getMode(queryText);
        fetch("https://translate.google.com/_/TranslateWebserverUi/data/batchexecute?rpcids=rPsWke&source-path=%2F&f.sid=-5593520454011789333&bl=boq_translate-webserver_20250120.08_p0&hl=zh-CN&soc-app=1&soc-platform=1&soc-device=1&_reqid=1531486&rt=c", {
            "credentials": "include",
            "headers": {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:135.0) Gecko/20100101 Firefox/135.0",
                "Accept": "*/*",
                "Accept-Language": "zh-CN,zh;q=0.8,zh-TW;q=0.7,zh-HK;q=0.5,en-US;q=0.3,en;q=0.2",
                "X-Same-Domain": "1",
                "X-Goog-BatchExecute-Bgr": "[\";p7m4ueHQAAbtVs4VzVZfjtOEjhajtB4mADQBEArZ1G0NfrweOhc3AyUoxkII3K_U1Chd17Fvf99rFwLHlQuioHlDvb6u4M1fyxcaaH_gHwAAAFBPAAAAAXUBB2MAP1JlHHKqq3J_6lj8Oc6ifE7zq8zU8eiRKixHvMipNDUyr4vuLBsOipanABi-sPlC1IIjqOr_QEsR4LkSRvoLp4QDKD7IAUwIVtZScSFIqi7uh0jwsfrH7mTAtCP-vtLGaxpbsHahjxvYVGTzkCNrOIq8kzFPzyWUYZOebaUD_QwhHl3LZortWmTejsCF6-uZ7V17B4cLHNj1E37dH5rhVvt1-T4lz9r7g2N9wcHsSzyI9kH-YqPxRnNQYs-sT4ajdOD3QZ9ApfbIaAK1RVcgG1LD6B0VCOM59JSnisjctyI3LPap2wojImzyirnAH-Z8i1lhesLMz3c8MrM_XhYpz7ilIfvic6wnHQ0vrskMAn0jtau_XlrNy9tJGDQnGsuMBoew5GBsIOMJy9Y3ZwH__ZvomdwVdS619jEHqKIE9tvB1LAnySh3GDLWsfsbsN4GBxFqspBG3VwKHtgd35KAYs5j10_EDxTIM4nK9jwavS9jMxk2m217tYXGRblrlBj4OWZoC-v4dJe0HLJiwZGgu4P6_DgbllPulhUBV7WR7CEgqyyYC1h3n7BWXrDGOjD-PkYfavciaAo6W9qpn1goeWc8ZALnLzf2EEOtAr95viH1COluBKlCoyaLMVE5Pof4KoW_6pHlsaUXATpvIdfHPYvz-c-DOwGEW-qH1znNn_eyBR5W9sla-6m5FCrK-bmiIXmC-QWUCWe9zDktYnRwWZa6ssV7s-B5pBREIPeLjWeKi7Ltrv8t1xPTB9x9bQMRjGU2cz-0ym0jty3FpNr2AAhXdPpD-tC4RXpl0YDyAjny3vgW02Xwl5CIgEzx5_jTezg9ClrPEV26Nz9w3qo5xE-n2ZcT-QtkyqW8S-qgRMGNeRD3jVnUxc5uflt4Rhin4pIBcTs8AA7Vndjl8i2u_gJC57lyUk9gYPQYWEWDpGbK_FSMj3fuCRmTKiPXfsgWKhRge7SPeeQCdR-koodw4_vmk8KzVmr74WR7MiC7XrTqNmU7NdKPDrBD2AXMcjoSgEil8LF0WXBqxtKJolfokqDZXJEdqDtcMwJcgS7YaQDwvnzQgG2UStdA_xtfovW49TCfDk7O1x0LcBovH2-4ArXCDwzo8dR_BhKaFlpPfPVBQMajV93LRGQQ266T61MZ6_xwNtgNTy-tTsM\",null,null,12,null,null,null,0,\"2\"]",
                "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
                "Sec-Fetch-Dest": "empty",
                "Sec-Fetch-Mode": "cors",
                "Sec-Fetch-Site": "same-origin",
                "Pragma": "no-cache",
                "Cache-Control": "no-cache"
            },
            "referrer": "https://translate.google.com/",
            "body": `f.req=%5B%5B%5B%22rPsWke%22%2C%22%5B%5B%5C%22${query}%5C%22%2C%5C%22${mode[0]}%5C%22%2C%5C%22${mode[1]}%5C%22%5D%2C2%5D%22%2Cnull%2C%22generic%22%5D%5D%5D&at=ALV69NDd45b2bPVnIaJ4a3bPRdXl%3A1737593085954&`,
            "method": "POST",
            "mode": "cors"
        }).then(response => {
            console.log(response);
            return response.text();
        })
            .then(text => {
                resolve(text);
            })
            .catch(error => reject(error));
    });
}

module.exports = {
    translation,
};
