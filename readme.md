# bibliotik
CLI interface for bibliotik / tranmission. Logs into bibliotik, scrapes their search page, adds the torrent to transmission via RPC, then downloads the file to a folder of your choosing (i use dropbox).

# warning
don't use this yet. I'm waiting on an update to `parse-torrent` to remove a deprecation message that kinda messes with the output. It definitely feels broken. I alse need to get some utility commands in here, which would necesitate either argv hacks or commander, and I don't have time for that right now. Once I've gotten those 2 chores done, this will be a lot more usable. My end goal is:

```
npm install -g biblio
biblio search {searchstring}
```
Not quite there yet. Few days hopefully.

## usage:
biblio {searchstring}

## setup
copy config.js.sample to config.js. Edit that file according to the comments. Your first time logging in, biblio will ask you for a few passwords. They will be cached in your OS keychain (windows or mac, not sure about linux, give it a shot though). the only way to fix an incorrect password for now is to erase the bbtk_* entries from your systems keychain.

## todo:
- [ ] support local transmission (lol).
- [x] keytar.
- [ ] refactor.
- [ ] better search output (filesize).
- [x] interactive config / setup.
- [ ] add commander for utility / cleanup tasks.
- [ ] get rid of state. pure functional.
