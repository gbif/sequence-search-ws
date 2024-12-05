const BLAST_SEQ_PATH = '/Users/vgs417/blast/seq/';
const BLAST_DATABASE_PATH = '/Users/vgs417/blast/db/';
const MATCH_THRESHOLD = 99;
const MATCH_CLOSE_THRESHOLD = 90;
const CACHE_CONCURRENCY  = 50;

const env = process.env.NODE_ENV || 'local';
console.log('ENV: ' + env);


const HBASE = {
  hosts: ['uc6n10.gbif.org', 'uc6n11.gbif.org', 'uc6n12.gbif.org' ], //["c4master1-vh.gbif.org", "c4master2-vh.gbif.org", "c3master3-vh.gbif.org"],
  port: 31995,
  tableName: 'blast_cache'
  
}; 



const config = {
  local: {
    BLAST_SEQ_PATH,
    BLAST_DATABASE_PATH,
    EXPRESS_PORT: 9002,
    MATCH_THRESHOLD,
    MATCH_CLOSE_THRESHOLD,
    HBASE,
    CACHE_CONCURRENCY,
    VSEARCH: "/Users/vgs417/vsearch-2.22.1-macos-aarch64/bin/vsearch",
    NUM_THREADS: 8,
    MAX_QUEUED_JOBS: 10
  },
  production: {
    BLAST_SEQ_PATH: '/home/tsjeppesen/seq/',
    BLAST_DATABASE_PATH: '/home/tsjeppesen/',
    EXPRESS_PORT: 80,
    MATCH_THRESHOLD,
    MATCH_CLOSE_THRESHOLD,
    HBASE,
    CACHE_CONCURRENCY,
    VSEARCH: "/Users/vgs417/vsearch-2.22.1-macos-aarch64/bin/vsearch",
    NUM_THREADS: 8,
    MAX_QUEUED_JOBS: 10
  }
};

export default config[env];
