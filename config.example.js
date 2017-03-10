'use strict';

module.exports = {
  localSettings: {
    tempName: 'temp.torrent', // filename for temporary torrent
    dest: '~/Dropbox' // path for final file download. I use dropbox so i can get them easily on my phone.
  },
  remoteSettings: {
    sshName: 'golem', // ssh alias to use for your seedbox for copying files
    sshPath: '/home/core/media', // remote path where transmission puts files
    rpcUrl: 'https://jordanbyrd.com/transmission', // url to use for transmission rpc. Usually http[s]://{seedboxurl}.{tld}/transmission
    userName: 'jordan' // transmission RPC username 
  },
  bibSettings:{
    userName: 'jabyrd3' // username for bibliotik. Your password is stored/cached in your OS keychain.
  }
}