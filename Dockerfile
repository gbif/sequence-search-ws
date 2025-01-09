FROM node:20-bookworm
LABEL maintainers="Matthew Blissett <mblissett@gbif.org>"

ARG VSEARCH_VERSION=2.29.2
# GBIF build uses this private URL for the latest database.
# For local non-GBIF development, set to DATABASE_URL=file:///usr/local/gbif/sequence-search-ws/sh_general_release_04.04.2024.tgz
ARG DATABASE_URL=https://hosted-datasets.gbif.org/datasets/protected/unite/sh_general_release_04.04.2024.tgz

# Install vsearch
WORKDIR /usr
RUN curl -LSs https://github.com/torognes/vsearch/releases/download/v$VSEARCH_VERSION/vsearch-$VSEARCH_VERSION-linux-x86_64.tar.gz | tar -zxv --strip-components=1

# Compile sequence-search-ws
COPY . /usr/local/gbif/sequence-search-ws
WORKDIR /usr/local/gbif/sequence-search-ws
RUN npm install --registry https://repository.gbif.org/content/repositories/npmjs/ && mkdir fastas db seq

# Prepare database
RUN cd seq && \
    curl -Ss $DATABASE_URL | tar zx && \
    /usr/bin/vsearch --makeudb_usearch sh_general_release_dynamic_04.04.2024.fasta --output ../db/sh_general_release_dynamic_04.04.2024.udb

EXPOSE 8080
CMD ["/usr/local/bin/node", "app.mjs"]
