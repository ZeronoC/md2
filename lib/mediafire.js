const { default: axios } = require('axios');
const { JSDOM } = require('jsdom');

const MediafireDL = (url) => {
    return new Promise(async (resolve, reject) => {
        try {
            const { data } = await axios.get(url);
            let dom = new JSDOM(data).window.document
            resolve({
                title: dom.querySelector('body > div.mf-dlr.page.ads-alternate > div.content > div.center > div > div.dl-btn-cont > div.dl-btn-labelWrap > div.promoDownloadName.notranslate > div').textContent.trim(),
                filesize: dom.querySelector('body > div.mf-dlr.page.ads-alternate > div.content > div.center > div > div.dl-info > ul > li:nth-child(1) > span').textContent,
                filename: dom.querySelector('body > div.mf-dlr.page.ads-alternate > div.content > div.center > div > div.dl-btn-cont > div.dl-btn-labelWrap > div.promoDownloadName.notranslate > div').getAttribute('title'),
                upload_date: dom.querySelector('body > div.mf-dlr.page.ads-alternate > div.content > div.center > div > div.dl-info > ul > li:nth-child(2) > span').textContent,
                download_url: dom.querySelector('#downloadButton').getAttribute('href')
            })
        } catch (error) {
            reject(new Error(error.message))
        }
    })
}

module.exports = MediafireDL

// console.log(/mediafire/.test('https://www.mediafire.com/file/206sv1v6yv5p60y/GTA+SA+Definitive+Edition+(PowerVR).7z/file'));

// MediafireDL('https://www.mediafire.com/file/vkbeey4k2ezo6oi/GTA_SA_Lite_%2528ORI%2529_GPU_Adreno.7z/file').then(res => {
//     console.log(res);
// })