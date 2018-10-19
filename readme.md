# bibliotik
CLI or http interface for bibliotik / tranmission. Logs into bibliotik, scrapes their search page, shows you a list of search output, adds the chosen torrent to transmission via RPC, then downloads the file to a folder of your choosing (i use dropbox). hilariously insecure.

# install
```
npm install -g bibliotik
... follow setup instructions ...
```

## usage:
```
bibsearch {searchstring, quoted or escaped}
```

## climode setup
When you first try to run bibliotik you will be prompted to edit `~/.bib_config.js.` These are settings for usernames, etc. Passwords will be cached in your OS keychain (windows or mac, not sure about linux, give it a shot though). the only way to fix an incorrect password for now is to erase the bbtk_* entries from your systems keychain.


## server mode setup:
- process env needs variables RPC_PASS and BIB_PASS so we can skip interactive setup phase from the CLI.
- make sure .bib_config.js exists in your home dir.
- `npm run`

### containerization
- clone this repo and cd
- `docker build --tag biblio .`
- put a .bib_config file in your home directory or somewhere that looks like this:

```
'use strict';
module.exports = {
  localSettings: {
    tempName: 'temp.torrent', // filename for temporary torrent
    dest: '/media',
    absDest: '/media'
  },
  remoteSettings: {
    isRemote: false,
    sshName: '', //notneeded for server mode
    sshPath: '/media', // match dest/absDest
    rpcUrl: 'http://transmission:9091/transmission', // url to use for transmission rpc. Usually http[s]://{seedboxurl}.{tld}/transmission
    userName: <username> // transmission RPC username
  },
  bibSettings:{
    userName: <username> // username for bibliotik. Your password is stored/cached in your OS keychain.
  }
};
```

- either use `docker run` or docker-compose with these options: 
```  bibliotik:
    image: biblio
    restart: unless-stopped
    ports:
      - <desired external port>:8080
    volumes:
      - <bib_config path>:/root/.bib_config.js
      - <mediapath>:/media
    environment:
      - BIB_PASS=<bibliotik password>
      - RPC_PASS=<rpc password>
```
- use nginx or apache reverse proxy to terminate tls in front of the container

## todo:
- [ ] support local transmission (lol).
- [ ] fallback to local torrent client. 
- [ ] add seeding support / daemon behavior for people who don't wanna fuck up their ratio?
- [ ] refactor / reorganize
- [ ] better search output (filesize).
- [ ] add commander for utility / cleanup tasks.
- [ ] get rid of state variables, pure functional.
