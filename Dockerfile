FROM quay.io/ivanvanderbyl/docker-nightmare:latest
MAINTAINER jordan byrd
ADD server /scripts/server
ADD utils.js /scripts
ADD package.json /scripts
ADD start.sh /scripts
RUN chmod +x /scripts/start.sh
WORKDIR /scripts
RUN npm install
ENTRYPOINT ["/scripts/start.sh"]
