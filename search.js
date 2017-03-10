'use strict';
/* globals document */
const os = require('os');
const fs = require('fs');
const https = require('https');
const Nightmare = require('nightmare');
const nightmare = Nightmare({show: false, typeInterval: 1});
const inquirer = require('inquirer');
const cheerio = require('cheerio');
const spawn = require('child_process').spawn;
const exec = require('child_process').exec;
const parseTorrent = require('parse-torrent');
const _ = require('lodash');
const keytar = require('keytar');
let config;
try {
    config = require(`${os.homedir()}/.bib_config.js`);
} catch (e) {
    const temp = fs.readFileSync('./config.example.js');
    fs.writeFileSync(`${os.homedir()}/.bib_config.js`, temp,
        'utf8');
    console.log('edit .bib_config.js in your home directory.');
    process.exit(0);
}

let cookies, rpcPass, bibPass;

const setup = () => {
    let queue = [];
    rpcPass = keytar.getPassword('biblio',
        `bbtk_${config.remoteSettings.userName}`);
    bibPass = keytar.getPassword('biblio',
        `bbtk_${config.bibSettings.userName}`);
    [{
        un: config.remoteSettings.userName,
        pw: rpcPass,
        name: 'rpcpw',
        message: `What's your transmission rpc pass (account: 
            ${config.remoteSettings.userName}`
    }, {
        un: config.bibSettings.userName,
        pw: bibPass,
        name: 'bbpw',
        message: `What's your biblitotik password (account: 
            ${config.bibSettings.userName})`
    }]
    .forEach(item => {
        if (item.pw === null) {
            queue.push(item);
        }
    });
    if (queue.length > 0) {
        inquirer.prompt(queue.map(item => {
            return {
                type: 'password',
                name: item.name,
                message: item.message
            };
        })).then(res => {
            // downloadLink(res.link);
            keytar.addPassword('biblio',
                `bbtk_${config.remoteSettings.userName}`,
                res.rpcpw);
            keytar.addPassword('biblio',
                `bbtk_${config.bibSettings.userName}`,
                 res.bbpw);
        }).catch(err => {
            console.log('err', err);
        });
    }
    query();
};
const userPrompt = (options) => {
    inquirer.prompt([{
        type: 'list',
        name: 'link',
        message: 'What do you want to download?',
        choices: options
    }]).then(res => {
        downloadLink(res.link);
    });
};

const downloadLink = (link) => {
    // download torrent from scraper entry.value
    const payload = cookies.reduce((pv, cv, i, arr) => {
        return `${ cv.name }=${ cv.value };${ pv }`;
    }, '');
    const handle = fs.createWriteStream(config.localSettings.tempName);
    // download torrent from bibliotik
    https.get({
        protocol: 'https:',
        hostname: 'bibliotik.me',
        path: `${link}/download`,
        headers: {
            cookie: payload
        }
    }, (res) => {
        res.pipe(handle);
        spawn('scp', [
            config.localSettings.tempName,
            `${config.remoteSettings.sshName}:${config.remoteSettings.sshPath}`
            ])
            .on('close', () => {
                console.log('Torrent copied to seedbox.');
                addTorrent();
            });
    });
};

const getTorrentId = () => {
    return parseTorrent(fs.readFileSync(__dirname + '/temp.torrent'));
};

const addTorrent = () => {
    // adds torrent to transmissin, intiating download
    var child = exec(`transmission-remote ${config.remoteSettings.rpcUrl} `+
        `--auth=${config.remoteSettings.userName}:${rpcPass} `+
        `-a ${__dirname}/${config.localSettings.tempName}`);
    child.on('close', code => {
        pollTransmission(getTorrentId(), 1000);
    });
};

const isTorrentDone = (meta, data) => {
    // find the status line for our torrent
    const torrentData = _.chain(data.split('\n'))
        .tail()
        .filter(str => {
            return _.includes(str, meta.name);
        })
        .head()
        .value();
    // regex for 100% from t-r list output.
    // returns true if torrents metadata line contains 100%
    // otherwise, returns false.
    fs.writeFileSync('./scratch', data, 'utf8')
    fs.writeFileSync('./metascratch', JSON.stringify(meta), 'utf8')
    if (torrentData){
        const digits = torrentData.match(/\d\d\d(?=\%)/g);
        console.log(`Download is ${digits}% done.`);
        if (digits !== null) {
            return digits[0] ? digits[0] === '100' : false;
        }
    }
    return 0;
};

const torrentDone = (meta) => {
    // checks if torrent is done with transmission-remote
    const child = exec(`scp ${config.remoteSettings.sshName}:`+
        `"'${config.remoteSettings.sshPath}/${meta.name}'" `+
        `${config.localSettings.dest}`);
    child.on('error', err => {
        console.log(err);
    });
    child.on('close', code => {
        console.log(code === 0 ?
            'Check your destination directory.':
            'There was an error, check your config.');
        process.exit();
    });
};

const pollTransmission = (metadata, interval) => {
    // poll transmission for torrent copmletion every {interval} seconds,
    // recursive until met
    let list = exec(`transmission-remote ${config.remoteSettings.rpcUrl} ` +
        `--auth=${config.remoteSettings.userName}:${rpcPass} -l`);
    list.stdout.on('data', data => {
        return isTorrentDone(metadata, data) ?
            torrentDone(metadata) :
            setTimeout(pollTransmission.bind(this,
                metadata, interval), interval);
    });
};

const query = () => {
    nightmare
        .goto('https://bibliotik.me')
        .type('#username', config.bibSettings.userName)
        .type('#password', bibPass)
        .click('.submit')
        .wait('#search_header')
        .goto(`https://bibliotik.me/torrents/?search=${process.argv[2]
            .replace(/"/g, '')}`)
        .wait('#torrents_table')
        .evaluate(() => {
            return document.querySelector('#torrents_table').innerHTML;
        })
        .then(result => {
            // hacky way to get cookies for subsequent requests :|
            nightmare.cookies.get().then(ck => {
                cookies = ck;
            });
            // built in nightmare $ was broke af
            let $ = cheerio.load(result);
            let options = [];
            // each row, prepare string / value pair for inquirer list
            $('tbody tr').each((ind, item) => {
                var target = $(item);
                options.push({
                    name: `${target.find('a').html()} ${target
                        .find('.torFormat')
                        .text()}`,
                    value: target.find('a').attr('href')
                });
            });
            // pass array to userprompt func
            userPrompt(options);
            return nightmare.end;
        })
        // cleanup stupid browser tab.
        .then(nm => {
            nm.halt();
        })
        // shouldn't ever get here, but log if we do.
        .catch(err => console.log);
};
// query();
// addTorrent();
setup();
