const { JSDOM } = require('jsdom')
const { default: axios } = require('axios');
const ytdl = require('ytdl-core');
const { humanFileSize } = require('../utils/function');
const ytIdRegex = /(?:youtube\.com\/\S*(?:(?:\/e(?:mbed))?\/|watch\?(?:\S*?&?v\=))|youtu\.be\/)([a-zA-Z0-9_-]{6,11})/

function post(url, formdata) {
    //console.log(Object.keys(formdata).map(key => `${key}=${encodeURIComponent(formdata[key])}`).join('&'))
    return axios(url, {
        method: 'POST',
        headers: {
            accept: "/",
            'accept-language': "en-US,en;q=0.9",
            'content-type': "application/x-www-form-urlencoded; charset=UTF-8"
        },
        data: Object.keys(formdata).map(key => `${key}=${encodeURIComponent(formdata[key])}`).join('&')
    })
}

const mp3 = async (url) => new Promise(async (resolve, reject) => {
    if (ytIdRegex.test(url)) {
        let ytId = ytIdRegex.exec(url)
        url = 'https://youtu.be/' + ytId[1]
        post(`https://www.y2mate.com/mates/downloader/ajax`, {
            url,
            q_auto: 0,
            ajax: 1
        })
            .then(res => {
                let document = (new JSDOM(res.data.result)).window.document
                let tables = document.querySelectorAll('table')
                let filesize = tables[1].querySelector('td > a[href="#"]').parentElement.nextSibling.nextSibling.innerHTML
                let duration = document.querySelector('div[class="caption text-left"] > p').innerHTML.split(' ')[1]
                let id = /var k__id = "(.*?)"/.exec(document.body.innerHTML) || ['', '']
                let thumb = document.querySelector('img').src
                let title = document.querySelector('b').innerHTML

                post('https://www.y2mate.com/mates/id4/convert', {
                    type: 'youtube',
                    _id: id[1],
                    v_id: ytId[1],
                    ajax: '1',
                    token: '',
                    ftype: 'mp3',
                    fquality: 128
                })
                    .then(res => {
                        let KB = parseFloat(filesize) * (1000 * /MB$/.test(filesize))
                        resolve({
                            dl_link: /<a.+?href="(.+?)"/.exec(res.data.result)[1],
                            thumb,
                            title,
                            duration,
                            filesizeF: filesize,
                            filesize: KB,
                            bitrate: "128"
                        })
                    })
            })
            .catch(err => {
                console.log(err);
                reject({ error: true, result: 'Can\'t fetch metadata' })
            })
    } else reject({ error: true, result: 'INVALID URL' })
})

async function mp4(url) {
    if (ytIdRegex.test(url)) {
        let ytId = ytIdRegex.exec(url)
        url = 'https://www.youtube.com/watch?v=' + ytId[1]
        try {
            let info = await ytdl.getInfo(url);
            return {
                title: info.videoDetails.title,
                thumb: info.videoDetails.thumbnails[info.videoDetails.thumbnails.length - 1].url,
                date: info.videoDetails.publishDate,
                duration: info.videoDetails.lengthSeconds,
                channel: info.videoDetails.ownerChannelName,
                dl_link: {
                    '360p': ytdl.chooseFormat(info.formats, { format: '134', filter: 'videoandaudio' }),
                    '480p': ytdl.chooseFormat(info.formats, { format: '135', filter: 'videoandaudio' }),
                    '720p': ytdl.chooseFormat(info.formats, { format: '136', filter: 'videoandaudio' }),
                    '1080p': ytdl.chooseFormat(info.formats, { format: '137', filter: 'videoandaudio' }),
                    'mp3': ytdl.chooseFormat(info.formats, { format: '140', filter: 'audioonly' }),
                }
            }
        } catch (e) {
            console.log(e);
            return {
                status: false,
                creator: '@gimenz.id',
                code: 404,
                result: 'Can\'t fetch metadata!'
            };
        }
    } else {
        return {
            status: false,
            creator: '@gimenz.id',
            code: 404,
            result: 'INVALID URL'
        }
    };
}


module.exports = { mp3, mp4, ytIdRegex }