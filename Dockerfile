FROM node:20-bookworm
LABEL maintainers="Matthew Blissett <mblissett@gbif.org>"

ARG VSEARCH_VERSION=2.29.2
ENV NODE_ENV=docker

# Install vsearch
WORKDIR /usr
RUN curl -LSs https://github.com/torognes/vsearch/releases/download/v$VSEARCH_VERSION/vsearch-$VSEARCH_VERSION-linux-x86_64.tar.gz | tar -zxv --strip-components=1

# Compile sequence-search-ws
COPY . /usr/local/gbif/sequence-search-ws
WORKDIR /usr/local/gbif/sequence-search-ws
RUN npm install --registry https://repository.gbif.org/content/repositories/npmjs/

VOLUME /srv
VOLUME /usr/local/gbif/conf

EXPOSE 8080
CMD ["/usr/local/bin/node", "app.mjs", "--config", "/usr/local/gbif/conf/server.js"]
