# bibliotik
CLI interface for bibliotik / tranmission. Logs into bibliotik, scrapes their search page, shows you a list of search output, adds the chosen torrent to transmission via RPC, then downloads the file to a folder of your choosing (i use dropbox).

# install
```
npm install -g biblio
... follow setup instructions ...
```

## usage:
```
bibsearch {searchstring, quoted or escaped}
```

## setup
When you first try to run bibliotik you will be prompted to edit `~/.bib_config.js.` These are settings for usernames, etc. Passwords will be cached in your OS keychain (windows or mac, not sure about linux, give it a shot though). the only way to fix an incorrect password for now is to erase the bbtk_* entries from your systems keychain.

## todo:
- [ ] support local transmission (lol).
- [ ] fallback to local torrent client. 
- [ ] add seeding support / daemon behavior for people who don't wanna fuck up their ratio?
- [ ] refactor / reorganize
- [ ] better search output (filesize).
- [ ] add commander for utility / cleanup tasks.
- [ ] get rid of state variables, pure functional.
- [x] .eslintrc
- [x] global install with config in ~/.bib_config
- [x] keytar.
- [x] fix null bug
- [x] interactive config / setup.

# NEW server mode:
process env needs variables RPC_PASS and BIB_PASS so we can skip interactive setup phase from the CLI. make sure .bib_config.js exists in your home dir
