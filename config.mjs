import { getYargs } from "./util.mjs";
import fs from 'fs';
const BLAST_SEQ_PATH = '/Users/vgs417/blast/seq/';
const BLAST_DATABASE_PATH = '/Users/vgs417/blast/db/';
const MATCH_THRESHOLD = 99;
const MATCH_CLOSE_THRESHOLD = 90;
const CACHE_CONCURRENCY  = 50;

const env = process.env.NODE_ENV || 'local';
console.log('ENV: ' + env);


let configFromFile = {}
try {
  const yargs = getYargs()
  if(yargs.config){
    console.log("Config file: "+yargs.config)
  }
  const creds = fs.readFileSync(`${yargs?.config || '../somefakepathfortesting/config.json'}`,
  { encoding: 'utf8', flag: 'r' });
  configFromFile = JSON.parse(creds) 
   if(!!yargs?.port){
    configFromFile.EXPRESS_PORT = yargs?.port
   }

} catch (error) {
  console.log("No config file given")
}



const config = {
  local: {
    BLAST_SEQ_PATH,
    BLAST_DATABASE_PATH,
    EXPRESS_PORT: 9002,
    MATCH_THRESHOLD,
    MATCH_CLOSE_THRESHOLD,
    CACHE_CONCURRENCY,
    VSEARCH: "/Users/vgs417/vsearch-2.22.1-macos-aarch64/bin/vsearch",
    NUM_THREADS: 8,
    MAX_QUEUED_JOBS: 10,
    service: {
      zkHost: '',
      zkPath: '',
    }
  },
  docker: {
    BLAST_SEQ_PATH: '/srv/fastas/',
    BLAST_DATABASE_PATH: '/srv/udb/',
    EXPRESS_PORT: 8080,
    MATCH_THRESHOLD,
    MATCH_CLOSE_THRESHOLD,
    CACHE_CONCURRENCY,
    VSEARCH: "/usr/bin/vsearch",
    NUM_THREADS: 8,
    MAX_QUEUED_JOBS: 10,
    service: {
      zkHost: '',
      zkPath: '',
    }
  }
};

export default {...config[env], ...configFromFile};
