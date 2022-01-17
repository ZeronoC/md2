const {
    default: makeWASocket,
    generateThumbnail,
    getDevice,
    DisconnectReason,
    downloadContentFromMessage,
    delay,
    useSingleFileAuthState,
    generateWAMessage,
    prepareWAMessageMedia,
    generateWAMessageFromContent,
    proto,
    generateWAMessageContent,
    WAProto,
} = require('@adiwajshing/baileys-md');
const pino = require('pino');
const CFonts = require('cfonts');
const gradient = require('gradient-string');
let package = require('./package.json');
let session = `./session.json`;
const { state, saveState } = useSingleFileAuthState(session);
global.config = require('./src/config.json');
global.API = config.api;
global.owner = config.owner;
global.footer = config.footer;
global.quot = config.quot;
let { igApi, shortcodeFormatter, getSessionId } = require('insta-fetcher');
const { Sticker, StickerTypes, extractMetadata } = require('wa-sticker-formatter');
const yts = require('yt-search');
let ig = new igApi(config.session_id);

/** LOCAL MODULE */
const {
    color,
    bgColor,
    cut,
    isUrl,
    humanFileSize,
    shrt,
    fetchAPI,
    getBuffer,
} = require('./utils/function');
const { Serialize } = require('./lib/simple');
const { tiktokDL } = require('./lib/tiktok');
const { download, parseMention } = require('./lib/function');
const { mp3, mp4, ytIdRegex } = require('./lib/yt');
const MediafireDL = require('./lib/mediafire');

/** DATABASE */
let chatsJid = JSON.parse(fs.readFileSync('./db/chatsJid.json', 'utf-8'));

const start = async () => {
    CFonts.say(`${package.name}`, {
        font: 'shade',
        align: 'center',
        gradient: ['#12c2e9', '#c471ed'],
        transitionGradient: true,
        letterSpacing: 3,
    });
    CFonts.say(`'${package.name}' Coded By ${package.author}`, {
        font: 'console',
        align: 'center',
        gradient: ['#DCE35B', '#45B649'],
        transitionGradient: true,
    });

    const client = makeWASocket({
        printQRInTerminal: true,
        logger: pino({ level: 'silent' }),
        auth: state,
        browser: [package.name, 'Safari', '3.0'],
    });

    client.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection == 'connecting') {
            console.log(
                color('[SYS]', '#009FFF'),
                color(moment().format('DD/MM/YY HH:mm:ss'), '#A1FFCE'),
                color(`${package.name} is Authenticating...`, '#f64f59')
            );
        } else if (connection === 'close') {
            console.log('connection closed, try to restart');
            lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut
                ? start()
                : console.log(
                    color('[SYS]', '#009FFF'),
                    color(moment().format('DD/MM/YY HH:mm:ss'), '#A1FFCE'),
                    color(`WA Web Logged out`, '#f64f59')
                );;
        } else if (connection == 'open') {
            console.log(
                color('[SYS]', '#009FFF'),
                color(moment().format('DD/MM/YY HH:mm:ss'), '#A1FFCE'),
                color(`${package.name} is now Connected...`, '#38ef7d')
            );
        }
    });

    client.ev.on('chats.update', chats => {
        for (let i of chats) {
            if (!chatsJid.some((x => x == i.id))) {
                chatsJid.push(i.id);
                fs.writeFileSync('./db/chatsJid.json', JSON.stringify(chatsJid), 'utf-8');
            }
        }
    })

    client.ev.on('creds.update', () => saveState)
    client.ev.on('messages.upsert', async (msg) => {
        try {
            if (!msg.messages) return
            const m = msg.messages[0]
            if (m.key.fromMe) return
            const from = m.key.remoteJid;
            let type = Object.keys(m.message)[0];
            Serialize(client, m)
            const content = JSON.stringify(JSON.parse(JSON.stringify(msg)).messages[0].message)
            let t = m.messageTimestamp
            const body = (type === 'conversation') ? m.message.conversation : (type == 'imageMessage') ? m.message.imageMessage.caption : (type == 'videoMessage') ? m.message.videoMessage.caption : (type == 'extendedTextMessage') ? m.message.extendedTextMessage.text : (type == 'buttonsResponseMessage') ? m.message.buttonsResponseMessage.selectedButtonId : (type == 'listResponseMessage') ? m.message.listResponseMessage.singleSelectReply.selectedRowId : (type == 'templateButtonReplyMessage') ? m.message.templateButtonReplyMessage.selectedId : (type === 'messageContextInfo') ? (m.message.listResponseMessage.singleSelectReply.selectedRowId || m.message.buttonsResponseMessage.selectedButtonId || m.text) : ''

            const isGroupMsg = m.key.remoteJid.endsWith('@g.us')
            const isMedia = (type === 'imageMessage' || type === 'videoMessage')
            const isQuotedImage = type === 'extendedTextMessage' && content.includes('imageMessage')
            const isQuotedVideo = type === 'extendedTextMessage' && content.includes('videoMessage')
            const isQuotedAudio = type === 'extendedTextMessage' && content.includes('audioMessage')
            const isQuotedSticker = type === 'extendedTextMessage' && content.includes('stickerMessage')
            const sender = m.sender
            const isOwner = config.owner.includes(sender)
            let pushname = m.pushName
            const botNumber = client.user.id
            const groupId = isGroupMsg ? from : ''
            const groupMetadata = isGroupMsg ? await client.groupMetadata(groupId) : ''
            const groupMembers = isGroupMsg ? groupMetadata.participants : ''
            const groupAdmins = []
            for (let i of groupMembers) {
                i.isAdmin ? groupAdmins.push(i.jid) : ''
            }
            const formattedTitle = isGroupMsg ? groupMetadata.subject : ''
            global.prefix = /^[./~!#%^&+=\-,;:()]/.test(body) ? body.match(/^[./~!#%^&+=\-,;:()]/gi) : '#'

            const arg = body.substring(body.indexOf(' ') + 1)
            const args = body.trim().split(/ +/).slice(1);
            const isCmd = body.startsWith(global.prefix);
            const cmd = isCmd ? body.slice(1).trim().split(/ +/).shift().toLocaleLowerCase() : null
            let url = args.length !== 0 ? args[0] : ''

            const typing = async (jid) => await client.sendPresenceUpdate('composing', jid)
            const recording = async (jid) => await client.sendPresenceUpdate('recording', jid)
            const waiting = async (jid, m) => await client.sendMessage(jid, { text: 'proses...' }, { quoted: m })
            global.reply = async (text) => {
                await client.sendPresenceUpdate('composing', from)
                return client.sendMessage(from, { text }, { quoted: m })
            }
            const logEvent = (text) => {
                if (!isGroupMsg) {
                    console.log(bgColor(color('[EXEC]', 'black'), '#38ef7d'), color(moment(t * 1000).format('DD/MM/YY HH:mm:ss'), '#A1FFCE'), gradient.summer(`[${text}]`), bgColor(color(type, 'black'), 'cyan'), '~> from', gradient.cristal(pushname))
                }
                if (isGroupMsg) {
                    console.log(bgColor(color('[EXEC]', 'black'), '#38ef7d'), color(moment(t * 1000).format('DD/MM/YY HH:mm:ss'), '#A1FFCE'), gradient.summer(`[${text}]`), bgColor(color(type, 'black'), 'cyan'), '~> from', gradient.cristal(pushname), 'in', gradient.fruit(formattedTitle))
                }
            }

            if (!chatsJid.some((x => x == sender))) {
                chatsJid.push(sender);
                fs.writeFileSync('./db/chatsJid.json', JSON.stringify(chatsJid), 'utf-8');
            }

            let tipe = bgColor(color(type, 'black'), '#FAFFD1')
            if (!isCmd && !isGroupMsg) {
                console.log('[MSG]', color(moment(t * 1000).format('DD/MM/YY HH:mm:ss'), '#A1FFCE'), cut(m.text), `~> ${(tipe)} from`, color(pushname, '#38ef7d'))
            }
            if (!isCmd && isGroupMsg) {
                console.log('[MSG]', color(moment(t * 1000).format('DD/MM/YY HH:mm:ss'), '#A1FFCE'), cut(m.text), `~> ${tipe} from`, color(pushname, '#38ef7d'), 'in', gradient.morning(formattedTitle))
            }
            if (isCmd && !isGroupMsg) {
                console.log(color('[CMD]'), color(moment(t * 1000).format('DD/MM/YY HH:mm:ss'), '#A1FFCE'), color(`${cmd} [${args.length}]`), color(`${cut(body)}`, 'cyan'), '~> from', gradient.teen(pushname, 'magenta'))
            }
            if (isCmd && isGroupMsg) {
                console.log(color('[CMD]'), color(moment(t * 1000).format('DD/MM/YY HH:mm:ss'), '#A1FFCE'), color(`${cmd} [${args.length}]`), color(`${cut(body)}`, 'cyan'), '~> from', gradient.teen(pushname), 'in', gradient.fruit(formattedTitle))
            }

            if (config.autoReads) await client.sendReadReceipt(from, sender, [m.key.id])

            if (isOwner) {
                if (body.startsWith("> ")) {
                    await typing(from)
                    let syntaxerror = require('syntax-error');
                    let _return;
                    let _syntax = '';
                    let _text = body.slice(2);
                    try {
                        let i = 15
                        let exec = new (async () => { }).constructor('print', 'msg', 'require', 'client', 'm', 'axios', 'fs', 'exec', _text);
                        _return = await exec.call(client, (...args) => {
                            if (--i < 1) return
                            console.log(...args)
                            return reply(from, util.format(...args))
                        }, msg, require, client, m, axios, fs, exec);
                    } catch (e) {
                        let err = await syntaxerror(_text, 'Execution Function', {
                            allowReturnOutsideFunction: true,
                            allowAwaitOutsideFunction: true
                        })
                        if (err) _syntax = '```' + err + '```\n\n'
                        _return = e
                    } finally {
                        reply(_syntax + util.format(_return))
                    }
                } else if (body.startsWith("$ ")) {
                    await typing(from)
                    exec(body.slice(2), (err, stdout) => {
                        if (err) return reply(`${err}`)
                        if (stdout) reply(`${stdout}`)
                    })
                }
            }

            if (cmd == 'help' || cmd == 'menu') {
                await typing(from)
                const buttonsDefault = [
                    { urlButton: { displayText: `Chat Admin`, url: `https://wa.me/6289614412045?text=Halooo` } },
                    { quickReplyButton: { displayText: `☎ Owner`, id: `${prefix}owner` } },
                ]

                let text = `Hi *${pushname}* 🤗\n\n` +
                    `⌚️ : ${moment().format('HH:mm:ss')}\n\n` +
                    `${fs.readFileSync('./src/menu.txt', 'utf-8').replace(/prefix /gim, prefix)}`
                client.sendMessage(from, { text, footer, templateButtons: buttonsDefault, headerType: 3 }, { quoted: m })
            }

            if (/owner/.test(cmd)) {
                await typing(from)
                owner.map(async (v) => await sendContact(m.chat, v.split('@s.whatsapp.net')[0], package.author, m))
                await delay(2000)
                const buttonsDefault = [
                    { urlButton: { displayText: `🌐 Web`, url: `https://wa.me/6289614412045` } },
                    { urlButton: { displayText: `📸 Instagram`, url: `https://www.instagram.com/iy.yan_` } },
                    { urlButton: { displayText: `🐈 Github`, url: `https://github.com/ZeronoC` } },
                ]
                client.sendMessage(from, { text: `Social Media`, footer, templateButtons: buttonsDefault }, { quoted: m })
            }

            if (/https:\/\/.+\.tiktok.+/g.test(body) && !m.isBot) {
                try {
                    url = body.match(/https:\/\/.+\.tiktok.+/g)[0]
                    logEvent(url)
                    await typing(from)
                    const data = await tiktokDL(url)
                    let author = `Video from https://www.tiktok.com/@${data.authorMeta.username}` || ''
                    await waiting(from, m)
                    let caption = `*Success* - ${author} [${data.desc}]`
                    await sendFileFromUrl(from, data.videoUrlNoWatermark.url_list[1], caption, m, '', 'mp4', { height: data.videoUrlNoWatermark.height, width: data.videoUrlNoWatermark.width })
                } catch (error) {
                    console.log(error);
                    await reply('an error occurred')
                }
            }

            if (/https?:\/\/twitter.com\/[0-9-a-zA-Z_]{1,20}\/status\/[0-9]*/g.test(body) && !m.isBot) {
                try {
                    url = body.match(/https?:\/\/twitter.com\/[0-9-a-zA-Z_]{1,20}\/status\/[0-9]*/g)[0]
                    logEvent(url);
                    await typing(from)
                    let { result: data } = await fetchAPI('masgi', '/twitter/download.php?url=' + url)
                    await waiting(from, m)
                    await reply(`Media from *${data.name} [@${data.username}]* ${quot}${data.full_text}${quot}\n\nTotal ${data.media.mediaUrl.length} ${data.media.mediaType}` || '')
                    for (i of data.media.mediaUrl) {
                        await sendFileFromUrl(from, i, '', m)
                    }
                } catch (error) {
                    console.log(error);
                    await reply('an error occurred')
                }
            }

            if (/https?:\/\/(web\.|www\.|m\.)?(facebook|fb)\.(com|watch)\S+/g.test(m.text) && !m.isBot) {
                try {
                    url = body.match(/https?:\/\/(web\.|www\.|m\.)?(facebook|fb)\.(com|watch)\S+/g)[0]
                    logEvent(url);
                    await typing(from)
                    let data = await fetchAPI('masgi', '/facebook/?url=' + url)
                    await waiting(from, m)
                    await sendFileFromUrl(from, data.videoUrl, `*Success* - ${data.title}`, m, '', 'mp4')
                } catch (error) {
                    console.log(error);
                    await reply('an error occurred')
                }
            }

            if (/https?:\/\/?(www|pin|id)?\.(it|pinterest\.co(m|\.[a-z]{1,2}))\S+\//g.test(body) && !m.isBot) {
                try {
                    await typing(from)
                    url = /https?:\/\/?(www|pin|id)?\.(it|pinterest\.co(m|\.[a-z]{1,2}))\S+\//g.exec(body)[0]
                    logEvent(url);
                    await waiting(from, m)
                    let data = await fetchAPI('masgi', '/pinterest/download.php?url=' + url)
                    let media = data.is_video ? data.videos.video_list[Object.getOwnPropertyNames(data.videos.video_list)[0]] : data.images.orig
                    await sendFileFromUrl(from, media.url, `*${data.title || data.closeup_unified_title}* - Posted at ${moment(data.created_at).format('DD/MM/YY HH:mm:ss')}`, m)
                } catch (error) {
                    console.log(error);
                    await reply('an error occurred')
                }
            }

            if (/(?:https?:\/\/)?(?:www\.)?(?:instagram\.com(?:\/\w+)?\/(p|reel|tv)\/)([\w-]+)(?:\/)?(\?.*)?$/gim.test(body) && !m.isBot) {
                try {
                    let { type, shortcode } = shortcodeFormatter(body)
                    url = `https://www.instagram.com/${type}/${shortcode}`;
                    logEvent(url);
                    await waiting(from, m)
                    let result = await ig.fetchPost(url);
                    let arr = result.links;
                    let capt = '✅ *Sukses Download Post Instagram*\n';
                    capt += '• Name : ' + result.name + '\n';
                    capt += '• Username : ' + result.username + '\n';
                    capt += '• Likes : ' + result.likes + '\n';
                    capt += '• Media Count : ' + result.media_count;
                    reply(capt)
                    for (let i = 0; i < arr.length; i++) {
                        if (arr[i].type == "image") {
                            await sendFileFromUrl(from, arr[i].url, '', m, '', 'jpeg',
                                { height: arr[i].dimensions.height, width: arr[i].dimensions.width }
                            )
                        } else {
                            await sendFileFromUrl(from, arr[i].url, '', m, '', 'mp4',
                                { height: arr[i].dimensions.height, width: arr[i].dimensions.width }
                            )
                        }
                    }
                } catch (error) {
                    console.log(error);
                    reply('an error occurred')
                }
            }

            if (/https:\/\/(www\.)?instagram\.com\/stories\/.+/g.test(body) && !m.isBot) {
                try {
                    await typing(from)
                    await waiting(from, m)
                    let regex = new RegExp(/https:\/\/(www\.)?instagram\.com\/stories\/.+/g)
                    let u = body.match(regex)[0]
                    logEvent(u);
                    let s = u.indexOf('?') >= 0 ? u.split('?')[0] : (u.split('').pop() == '/' != true ? `${u}` : u);
                    let [username, storyId] = s.split('/stories/')[1].split('/')
                    const data = await ig.fetchStories(username);
                    let media = data.stories.filter(x => x.id.match(storyId))
                    if (media[0].type == "image") {
                        await sendFileFromUrl(
                            from, media[0].url, `_Stories from @${username}_\nTaken at : ${moment(media[0].taken_at * 1000).format('DD/MM/YY HH:mm:ss')}`, m, '', 'jpeg',
                            { height: media[0].original_height, width: media[0].original_width }
                        )
                    } else {
                        await sendFileFromUrl(
                            from, media[0].url, `_Stories from @${username}_\nTaken at : ${moment(media[0].taken_at * 1000).format('DD/MM/YY HH:mm:ss')}`, m, '', 'mp4',
                            { height: media[0].original_height, width: media[0].original_width }
                        )
                    }
                } catch (error) {
                    reply('an error occurred')
                    console.log(error);
                }
            }

            if (/https:\/\/www\.instagram\.com\/s\/.+story_media_id=([\w-]+)/g.test(body) && !m.isBot) {
                const link_highlight = /https:\/\/www\.instagram\.com\/s\/(.*?)\?story_media_id=([\w-]+)/g.exec(body)[0]
                try {
                    await typing(from)
                    logEvent(link_highlight);
                    const username = await axios.get(link_highlight).then(async res => {
                        const { data } = await axios.get(res.request.res.responseUrl + '?__a=1')
                        return data.user.username;
                    })
                    let [, highlightId, mediaId] = /https:\/\/www\.instagram\.com\/s\/(.*?)\?story_media_id=([\w-]+)/g.exec(link_highlight)
                    highlightId = Buffer.from(highlightId, 'base64').toString('binary').match(/\d+/g)[0]
                    let { data } = await ig.fetchHighlights(username)
                    const filterHighlight = data.filter(x => highlightId.match(x.highlights_id))[0]
                    const filterReels = filterHighlight.highlights.filter(x => mediaId.match(x.media_id.match(/(\d+)/)[0]))[0]
                    let id = shrt(filterHighlight.cover, { title: filterHighlight.title })
                    const btnCover = [
                        { quickReplyButton: { displayText: `Highlight Cover`, id: `${prefix}sendmedia ${id.id}` } },
                    ]
                    let buttonMessage = {
                        caption: `*${filterHighlight.title}* - _Highlights from https://www.instagram.com/${username}_\nTaken at : ${moment(filterReels.taken_at * 1000).format('DD/MM/YY HH:mm:ss')}`,
                        footer,
                        templateButtons: btnCover,
                        height: filterReels.dimensions.height,
                        width: filterReels.dimensions.width
                    }
                    filterReels.type == 'image'
                        ? buttonMessage['image'] = { url: filterReels.url }
                        : buttonMessage['video'] = { url: filterReels.url }
                    await client.sendMessage(from, buttonMessage, { quoted: m })
                    //await sendFileFromUrl(from, filterReels.url, `*${filterHighlight.title}* - _Highlights from https://www.instagram.com/${username}_\nTaken at : ${moment(filterReels.taken_at * 1000).format('DD/MM/YY HH:mm:ss')}`, m, '', '', { templateButtons: btnCover, footer })
                } catch (error) {
                    console.log(error);
                    reply('an error occurred')
                }
            }

            if (/sendmedia/i.test(cmd)) {
                try {
                    let id = db.filter(x => x.id == args[0])[0]
                    await sendFileFromUrl(from, id.url, `Highlight Cover [${id.title}]`, m)
                } catch (error) {
                    console.log(error);
                }
            }

            if (/mediafire/i.test(cmd)) {
                if (!isUrl(url)) return await reply('bukan link mediafire banh')
                if (!/mediafire/.test(url)) return await reply('bukan link mediafire banh')
                try {
                    const { title, filesize, filename, upload_date, download_url } = await MediafireDL(url);
                    let ext = filename.split('.').pop();
                    let caption = `🔥 *Mediafire Downloader* 🔗\n\n` +
                        `📄 : *${filename}*\n` +
                        `ℹ : *${Number(filesize.split(/MB|GB/)[0]) > 350 ? 'Ukuran File Terlalu besar untuk dikirim via WhatsApp' : filesize}*\n` +
                        `📅 : *${upload_date}*${Number(filesize.split(/MB|GB/)[0]) <= 350 ? '\n\nsedang mengirim file, lama atau tidaknya tergantung ukuran file' : ''}`
                    if (Number(filesize.split(/MB|GB/)[0]) > 350) {
                        const buttonsDefault = [
                            { urlButton: { displayText: `${filename}`, url: `${download_url}` } }
                        ]
                        await client.sendMessage(from, { caption: caption, footer, templateButtons: buttonsDefault, image: { url: 'https://masgimenz.my.id/upload/files/jambr.jpg' }, headerType: 4 }, { quoted: m })
                    } else {
                        await reply(caption);
                        await sendFileFromUrl(from, download_url, '', m, '', ext, { fileName: `${filename}.${ext}` })
                    }
                } catch (error) {
                    await reply(error.message)
                }
            }

            if (cmd == 'yts' || cmd == 'ytsearch') {
                if (args.length < 1) return await reply('mau cari apa?')
                try {
                    let arr = (await yts({ query: arg, hl: 'id' })).videos;
                    let list = new Array();
                    let desc = '*YouTube Search*\n'
                    for (let i = 0; i < 10; i++) {
                        desc += `\n*${i + 1}. ${arr[i].title}*\n🐓 *Channel :* ${arr[i].author.name}\n⌛ *Duration :* ${arr[i].timestamp}\n👀 *Views :* ${arr[i].views}\n📅 *Uploaded :* ${arr[i].ago}\n🔗 *Url :* ${arr[i].url}\n`
                        list.push({
                            title: `${i + 1}. ${arr[i].title}`,
                            description: `Channel : ${arr[i].author.name}\nDuration : ${arr[i].timestamp}\nViews : ${arr[i].views}\nUploaded : ${arr[i].ago}`,
                            rowId: `${prefix}yt ${arr[i].url}`
                        });
                    }
                    await sendListM(
                        from,
                        { buttonText: 'YouTube Search', description: desc, title: 'Pilih untuk mendownload' },
                        list, m
                    );
                } catch (error) {
                    console.log(error);
                }
            }

            if (cmd == 'play' || cmd == 'lagu' || cmd == 'ytmp3') {
                if (cmd == 'play' && args.length < 1) return await reply('mau cari lagu apa?')
                if (cmd == 'ytmp3' && !isUrl(url) && !ytIdRegex.test(url)) return await reply('link nya mana?')
                try {
                    let durasi = '';
                    if (!isUrl(url)) {
                        let arr = await yts({ query: arg, hl: 'id' });
                        let { videoId, duration } = arr.videos[0];
                        durasi += duration
                        url = `https://www.youtube.com/watch?v=${videoId}`
                    }
                    const { dl_link, filesizeF, thumb, title } = await mp3(url);
                    let capt = `✅ *Music Downloader*`;
                    capt += '\n• Judul : ' + title;
                    cmd == 'ytmp3' ? '' : capt += `\n• Durasi : ${durasi}`
                    capt += '\n• Size : ' + filesizeF;
                    await reply(capt);
                    await sendFileFromUrl(from, dl_link, '', m, 'from', 'mp3', { fileName: title + '.mp3' })
                } catch (error) {
                    reply('an error occurred')
                    console.log(error);
                }
            }

            if (cmd == 'yt' || cmd == 'ytmp4') {
                try {
                    if (args.length < 1 || !isUrl(url)) return await reply('link nya mana?')
                    if (cmd == 'yt' && !m.isBot) {
                        await waiting(from, m)
                        const data = await mp4(url)
                        let caption = `ℹ Judul : ${data.title}\n` +
                            `⌛ Durasi : ${moment.utc(data.duration * 1000).format('HH:mm:ss')}\n` +
                            `📅 Uploaded at : ${data.date}\n` +
                            `🐓 Channel : ${data.channel}`
                        const templateButtons = [
                            { quickReplyButton: { displayText: `360p [${humanFileSize(Number(data.dl_link['360p'].contentLength), true, 1)}]`, id: `${prefix}ytmp4 ${url} | 360p` } },
                            { quickReplyButton: { displayText: `480p [${humanFileSize(Number(data.dl_link['480p'].contentLength), true, 1)}]`, id: `${prefix}ytmp4 ${url} | 480p` } },
                            { quickReplyButton: { displayText: `mp3`, id: `${prefix}ytmp3 ${url}` } },
                        ]
                        let img = await getBuffer(data.thumb)
                        let op = {
                            image: { url: data.thumb },
                            caption: caption,
                            footer: 'Silahkan pilih format di bawah ini',
                            templateButtons,
                            jpegThumbnail: img.buffer
                        }
                        await client.sendMessage(from, op, { quoted: m })
                    } else {
                        await waiting(from, m)
                        let quality = arg.split('|')[1].trim() || '360p'
                        const data = await mp4(url)
                        let caption = `ℹ Judul : ${data.title}\n` +
                            `⌛ Durasi : ${moment.utc(data.duration * 1000).format('HH:mm:ss')}\n` +
                            `📅 Uploaded at : ${data.date}\n` +
                            `🐓 Channel : ${data.channel}\n` +
                            `🕶 Quality : ${data.dl_link[quality].qualityLabel}`
                        await reply(caption)
                        await sendFileFromUrl(from, data.dl_link[quality].url, '', m, '', 'mp4', { height: data.dl_link[quality].height, width: data.dl_link[quality].width })
                    }
                } catch (error) {
                    reply('an error occurred')
                    console.log(error);
                }
            }

            if (/^s(|ti(c|)ker)$/i.test(cmd)) {
                let packName = args.length >= 1 ? arg.split('|')[0] : `${package.name}`
                let stickerAuthor = args.length >= 1 ? arg.split('|')[1] : `${package.author}`
                let categories = config.stickerCategories[arg.split('|')[2]] || config.stickerCategories['love']
                try {
                    if (isMedia && !m.message.videoMessage || isQuotedImage) {
                        const message = isQuotedImage ? m.quoted : m.message.imageMessage
                        const buff = await client.downloadMediaMessage(message)
                        const data = new Sticker(buff, { pack: packName, author: stickerAuthor, categories, type: StickerTypes.FULL, quality: 50, id: footer })
                        await client.sendMessage(from, await data.toMessage(), { quoted: m })
                    } else if (m.message.videoMessage || isQuotedVideo) {
                        if (isQuotedVideo ? m.quoted.seconds > 15 : m.message.videoMessage.seconds > 15) return reply('too long duration, max 15 seconds')
                        const message = isQuotedVideo ? m.quoted : m.message.videoMessage
                        const buff = await client.downloadMediaMessage(message)
                        const data = new Sticker(buff, { pack: packName, author: stickerAuthor, categories, type: StickerTypes.FULL, quality: 50, id: footer })
                        await client.sendMessage(from, await data.toMessage(), { quoted: m })
                    } else {
                        reply('send/reply media. media is video or image')
                    }
                } catch (error) {
                    reply('an error occurred');
                    console.log(error);
                }
            }

            if (/toimg/i.test(cmd)) {
                if (isQuotedSticker) {
                    try {
                        await client.presenceSubscribe(from)
                        await client.sendPresenceUpdate('composing', from)
                        const media = await downloadMediaMessage(m.quoted)
                        await client.sendMessage(from, { image: media, jpegThumbnail: media }, { quoted: m })
                    } catch (error) {
                        console.log(error);
                        reply('an error occurred')
                    }
                } else {
                    await reply('reply a sticker')
                }
            }

        } catch (error) {
            console.log(color('[ERROR]', 'red'), color(moment().format('DD/MM/YY HH:mm:ss'), '#A1FFCE'), error);
        }
    })

    /**
     * Send files from url with automatic file type specifier 
     * @param {string} jid this message sent to? 
     * @param {string} url url which contains media
     * @param {string} caption media message with caption, default is blank
     * @param {string} quoted the message you want to quote
     * @param {string} mentionedJid mentionedJid
     * @param {string} extension custom file extensions
     * @param {boolean} asDocument if set to true, it will send media (audio) as document
     * @param  {...any} options 
     */
    async function sendFileFromUrl(jid, url, caption = '', quoted = '', mentionedJid, extension, options = {}, axiosOptions = {}) {
        try {
            const { filepath, mimetype } = await download(url, extension, axiosOptions);
            mentionedJid = mentionedJid ? parseMention(mentionedJid) : []
            let mime = mimetype.split('/')[0]
            let thumb = await generateThumbnail(filepath, mime)
            if (mime == 'gif') {
                await client.sendPresenceUpdate('composing', jid)
                const message = await prepareWAMessageMedia({ video: { url: filepath }, caption, gifPlayback: true, mentions: mentionedJid, jpegThumbnail: thumb, ...options }, { upload: client.waUploadToServer })
                let media = generateWAMessageFromContent(jid, { videoMessage: message.videoMessage }, { quoted })
                await client.relayMessage(jid, media.message, { messageId: media.key.id })
                //await client.sendMessage(jid, { video: buffer, caption, gifPlayback: true, mentions: mentionedJid, jpegThumbnail: thumb, ...options }, { quoted })
                fs.unlinkSync(filepath)
            } else if (mime == 'video') {
                await client.sendPresenceUpdate('composing', jid)
                client.refreshMediaConn(false)
                const message = await prepareWAMessageMedia({ video: { url: filepath }, caption, mentions: mentionedJid, jpegThumbnail: thumb, ...options }, { upload: client.waUploadToServer })
                let media = generateWAMessageFromContent(jid, { videoMessage: message.videoMessage }, { quoted })
                await client.relayMessage(jid, media.message, { messageId: media.key.id })
                fs.unlinkSync(filepath)
            } else if (mime == 'image') {
                await client.sendPresenceUpdate('composing', jid)
                const message = await prepareWAMessageMedia({ image: { url: filepath }, caption, mentions: mentionedJid, jpegThumbnail: thumb, ...options }, { upload: client.waUploadToServer })
                let media = generateWAMessageFromContent(jid, { imageMessage: message.imageMessage }, { quoted })
                await client.relayMessage(jid, media.message, { messageId: media.key.id })
                fs.unlinkSync(filepath)
            } else if (mime == 'audio') {
                await client.sendPresenceUpdate('recording', jid)
                const message = await prepareWAMessageMedia({ document: { url: filepath }, mimetype: mimetype, fileName: options.fileName }, { upload: client.waUploadToServer })
                let media = generateWAMessageFromContent(jid, { documentMessage: message.documentMessage }, { quoted })
                await client.relayMessage(jid, media.message, { messageId: media.key.id })
                fs.unlinkSync(filepath)
            } else {
                await client.sendPresenceUpdate('composing', jid)
                client.refreshMediaConn(false)
                const message = await prepareWAMessageMedia({ document: { url: filepath }, mimetype: mimetype, fileName: options.fileName }, { upload: client.waUploadToServer, })
                let media = generateWAMessageFromContent(jid, { documentMessage: message.documentMessage }, { quoted })
                await client.relayMessage(jid, media.message, { messageId: media.key.id })
                fs.unlinkSync(filepath)
            }
        } catch (error) {
            client.sendMessage(jid, { text: `error => ${util.format(error)} ` }, { quoted })
        }
    }
    global.sendFileFromUrl;

    /**
     * 
     * @param {String} jid 
     * @param {Object} button 
     * @param {Array|Object} rows 
     * @param {Object} quoted 
     * @param {Object} options 
     * @returns 
     */
    async function sendListM(jid, button, rows, quoted, options) {
        await client.sendPresenceUpdate('composing', jid)
        let messageList = WAProto.Message.fromObject({
            listMessage: WAProto.ListMessage.fromObject({
                buttonText: button.buttonText,
                description: button.description,
                listType: 1,
                sections: [
                    {
                        title: button.title,
                        rows: [...rows]
                    }
                ]
            })
        })
        let waMessageList = generateWAMessageFromContent(jid, messageList, { quoted, userJid: jid, contextInfo: { ...options } })
        return await client.relayMessage(jid, waMessageList.message, { messageId: waMessageList.key.id })
    }

    async function sendContact(jid, numbers, name, quoted, men) {
        let number = numbers.replace(/[^0-9]/g, '')
        const vcard = 'BEGIN:VCARD\n'
            + 'VERSION:3.0\n'
            + 'FN:' + name + '\n'
            + 'ORG:;\n'
            + 'TEL;type=CELL;type=VOICE;waid=' + number + ':+' + number + '\n'
            + 'END:VCARD'
        return client.sendMessage(jid, { contacts: { displayName: name, contacts: [{ vcard }] }, mentions: men ? men : [] }, { quoted: quoted })
    }
    client.downloadMediaMessage = downloadMediaMessage
    async function downloadMediaMessage(message) {
        let mimes = (message.msg || message).mimetype || ''
        let messageType = mimes.split('/')[0].replace('application', 'document') ? mimes.split('/')[0].replace('application', 'document') : mimes.split('/')[0]
        let extension = mimes.split('/')[1]
        const stream = await downloadContentFromMessage(message, messageType)
        let buffer = Buffer.from([])
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk])
        }
        return buffer
    }
};


try {
    start().catch(e => console.log(e));
} catch (error) {
    console.log(error);
}
