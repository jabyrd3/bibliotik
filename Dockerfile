FROM jabyrd3/nightmare:latest
MAINTAINER jordan byrd
RUN rm /etc/apt/sources.list

RUN echo "deb http://archive.debian.org/debian-security jessie/updates main" >> /etc/apt/sources.list.d/jessie.list

RUN echo "deb http://archive.debian.org/debian jessie main" >> /etc/apt/sources.list.d/jessie.list

RUN apt-get update
RUN apt-get install -y --force-yes transmission-cli
ADD server /scripts/server
ADD utils.js /scripts
ADD package.json /scripts
ADD package-lock.json /scripts
ADD start.sh /scripts
RUN chmod +x /scripts/start.sh
WORKDIR /scripts
RUN npm install
ENTRYPOINT ["/scripts/start.sh"]
