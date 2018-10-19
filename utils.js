#! /usr/bin/env node
'use strict';
/* globals document */
const os = require('os');
const fs = require('fs');
const https = require('https');
const Nightmare = require('nightmare');
const inquirer = require('inquirer');
const cheerio = require('cheerio');
const spawn = require('child_process').spawn;
const exec = require('child_process').exec;
const parseTorrent = require('parse-torrent');
const _ = require('lodash');
const cp = require('cp');
var keytar;
try{
  keytar = require('keytar');
}catch(e){
  console.warn('no keytar, this needs to run in server mode');
}
// console.log('jab', os.homedir());
let config;

try {
    config = require(`${os.homedir()}/.bib_config.js`);
} catch (e) {
    const temp = fs.readFileSync(`${__dirname}/config.example.js`);
    fs.writeFileSync(`${os.homedir()}/.bib_config.js`, temp,
        'utf8');
    console.log('edit .bib_config.js in your home directory.');
    process.exit(0);
}

let cookies, rpcPass, bibPass;
bibPass = process.env.BIB_PASS;
rpcPass = process.env.RPC_PASS;

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
        message: `What's your transmission rpc pass (account: ${config.remoteSettings.userName}`
    }, {
        un: config.bibSettings.userName,
        pw: bibPass,
        name: 'bbpw',
        message: `What's your biblitotik password (account: ${config.bibSettings.userName})`
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
            res.rpcpw && keytar.addPassword('biblio',
                `bbtk_${config.remoteSettings.userName}`,
                res.rpcpw);
            res.bbpw && keytar.addPassword('biblio',
                `bbtk_${config.bibSettings.userName}`,
                 res.bbpw);
            query();
        }).catch(err => {
            console.log('err', err);
        });
    }else{
      query();
    }
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
    return new Promise((resolve, rej)=>{
      const payload = cookies.reduce((pv, cv, i, arr) => {
          return `${ cv.name }=${ cv.value };${ pv }`;
      }, '');
      const handle = fs
          .createWriteStream(`${os.homedir()}/${config.localSettings.tempName}`);
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
        if(config.remoteSettings.isRemote){
          spawn('scp', [
              `${os.homedir()}/${config.localSettings.tempName}`,
              `${config.remoteSettings.sshName}:${config.remoteSettings.sshPath}`
              ])
              .on('close', (err) => {
                console.log('Torrent copied to seedbox.', err,
                `${os.homedir()}/${config.localSettings.tempName}`,
                `${config.remoteSettings.sshName}:${config.remoteSettings.sshPath}`);
                  resolve(addTorrent);
                  process.argv[2] && addTorrent();
              });
        } else {
          console.log('moving file from homedir/temp to config.remoteSettings.sshPath');
          cp(`${os.homedir()}/${config.localSettings.tempName}` , `${config.remoteSettings.sshPath}/${config.localSettings.tempName}`, (err)=>{ 
            console.log('jab err rename', err);
            resolve(addTorrent)
          });
        }
      });
    });
};

const getTorrentId = () => {
    return parseTorrent(fs.readFileSync(os.homedir() + '/temp.torrent'));
};

const addTorrent = () => {
  console.log('addtorrent');
    // adds torrent to transmissin, intiating download
    return new Promise((res, rej)=>{
      var child = exec(`transmission-remote ${config.remoteSettings.rpcUrl} `+
          `--auth=${config.remoteSettings.userName}:${rpcPass} `+
          `-a ${os.homedir()}/${config.localSettings.tempName}`);
      child.stderr.on('data', console.log);
      child.stdout.on('data', console.log);
      return child.on('close', code => {
          process.argv[2] && pollTransmission(getTorrentId(), 3000);
          return res(pollTransmission)
      });
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
    if (torrentData){
      // todo: match
      //91   100%   459.6 kB  Done         0.0    16.0    0.0  Idle         Equoid_ A Laundry Novella - Charles Stross.epub
      //Download is 0% done.
        const digits = torrentData.match(/\d{2,}(?=\%)/);
        console.log(`Download is ${digits || 0}% done.`);
        if (digits !== null) {
            return digits[0] ? digits[0] === '100' : false;
        }
    }
    return 0;
};

const torrentDone = (meta) => {
  // scp from remote to local destination
  return new Promise((res, rej)=>{
    if(config.remoteSettings.isRemote){
      const child = exec(`scp ${config.remoteSettings.sshName}:`+
          `"'${config.remoteSettings.sshPath}/${meta.name}'" `+
          `${config.localSettings.dest}`);
      child.stderr.on('data', err => {
        console.log(err);
        rej(err);
      });
      child.on('close', code => {
          console.log(code === 0 ?
              'Check your destination directory.':
              'There was an error, check your config.');
          res(meta.name);
          process.argv[2] && process.exit();
      });
    }else{
      cp(`config.remoteSettings.sshPath/${meta.name}`, config.localSettings.dest, ()=>{
        res(meta.name); 
      });
    }
    });
};


const pollTransmission = (metadata, interval, resolver) => {
    // poll transmission for torrent copmletion every {interval} seconds,
    // recursive until met
    return new Promise((res) => {
      let list = exec(`transmission-remote ${config.remoteSettings.rpcUrl} ` +
          `--auth=${config.remoteSettings.userName}:${rpcPass} -l`);
      return list.stdout.on('data', data => {
          return isTorrentDone(metadata, data) ?
              process.argv[2] ?
                torrentDone(metadata) :
                console.log('resolve inside polltrans')||
                resolver ?
                  resolver([torrentDone, metadata]) :
                  res([torrentDone, metadata]) :
              setTimeout(pollTransmission.bind(this,
                  metadata, interval), interval, resolver||res);
      });
    });
};

const query = (qString) => {
  let nightmare = Nightmare({
    typeInterval: 1
  });
  return new Promise((res, rej)=>{
    return nightmare
            .goto('https://bibliotik.me')
            .wait('#username')
            .type('#username', config.bibSettings.userName)
            .type('#password', bibPass)
            .click('.submit')
            .wait('#search_header')
            .goto(`https://bibliotik.me/torrents/?search=${qString || process.argv[2]
                .replace(/"/g, '')}`)
            .evaluate(() => {
                const doc = document.querySelector('#torrents_table');
                return doc && doc.innerHTML;
            })
            .then(result => {
                // hacky way to get cookies for subsequent requests :|
                return new Promise((req, res)  =>{
                nightmare.cookies.get().then(ck => {
                    cookies = ck;
                    if (result){
                      // built in nightmare $ was broke af
                      let $ = cheerio.load(result);
                      let options = [];
                      // each row, prepare string / value pair for inquirer list
                      $('tbody tr').each(function(ind, item){
                          var target = $(item);
                          if(target.find('.torFormat').text().indexOf('EPUB') > -1){
                            options.push({
                                name: `${target.find('a').html()}`,
                                value: target.find('a').attr('href')
                            });
                          }
                      });
                      process.argv[2] && userPrompt(options);
                      return req([nightmare, options]);
                    } else {
                      return req([nightmare, []]);
                    }});
                });
            })
            // cleanup stupid browser tab.
            .then(nm => {
              nm[0].halt();
              res(nm[1]);
            })
            // shouldn't ever get here, but log if we do.
            .catch(err => {
              nightmare.halt();
              return console.log(err) || rej(err);
            });
          });
};
module.exports = {
  setup,
  userPrompt,
  downloadLink,
  getTorrentId,
  addTorrent,
  isTorrentDone,
  pollTransmission,
  query
};
