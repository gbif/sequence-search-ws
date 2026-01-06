import PQueue from "p-queue";
import pLimit from "p-limit";
import config from "./config.mjs";
// import cache from "./caches/hbase.js"; // Could be null if no cache is needed
import { vsearchResultToJsonWithAligment, vsearchResultToJson, getMatch, sanitizeSequence} from "./util.mjs"
import {runVsearch} from "./vsearch.mjs"
import _ from "lodash"
const queue = new PQueue({ concurrency: 1 });
const limit = pLimit(config.CACHE_CONCURRENCY);
const vsearchServerLimit = pLimit(1);
const cache = null;
 

const getCachedResults = async ({sequence, resultArray, database}) => {
    try {

    const input = sequence.map((e, idx) =>  limit(
       () =>  cache.get(sequence[idx], database )
        .then(
            (result)=> {
               // console.log("Cache hit")
               resultArray[idx] = result
            })
        .catch(() => {
            // console.log("Not cached")
        })
     ) )
    
    await Promise.allSettled(input)
    return resultArray;
    } catch (error) {
        console.log(error)
    }
    
}
const search = async (req, res) => {
  try {
    const controller = new AbortController();
    const signal = controller.signal; 

    res.on('close', () => {
        //console.log(`Request aborted by the client: ${req.id}`);
        controller.abort();
    });
    let {sequence, database, outformat, identity, verbose} = req?.body;
    //const {outformat, identity, verbose} = req.query
    if(!_.isArray(sequence)){
      sequence = [sequence]
    }
    let resultArray = Array(sequence.length);

    if(cache && !identity){
        try {
            resultArray =  await getCachedResults({sequence, resultArray, database })
        } catch (error) {
            console.log(error)
        }
        
    }

    const unCached = sequence.map((e, i) => {
        return !!resultArray[i] ?  -1: i
    }).filter(e => e > -1)

    if(cache && unCached.length === 0){
      res.json(resultArray)
    } else if( queue.size > config.MAX_QUEUED_JOBS){
      res.sendStatus(503)
    } else {
    const sanitizedSequences = sequence.map(s => sanitizeSequence(s))
    const vsearchCliOutput = await queue.add(() => runVsearch({sequence: sanitizedSequences, database, reqId: req.id, resultArray, outformat, identity, signal}))
    const vsearchJson = outformat === 'blast6out' ? vsearchResultToJson(vsearchCliOutput, sanitizedSequences) : vsearchResultToJsonWithAligment(vsearchCliOutput, sanitizedSequences) ;

    const grouped = _.groupBy(vsearchJson, "query id")

    
    unCached.forEach(idx => {
      const match = !!grouped[idx] ? getMatch(grouped[idx], verbose) : {matchType: 'BLAST_NO_MATCH'}
      resultArray[idx] = match
  })

  
   if(cache && unCached.length > 0){
      const promises = unCached.map((i) => limit(() => cache.set(sequence[i], database , resultArray[i])
        /* .then(()=> {
          console.log(`Inserted ${options.seq[i]} to cache successfully` )
      })  */
      .catch((err) => {
          console.log("Caching err :")
          console.log(err)
      })))

   } 
    res.json(!_.isArray(req?.body?.sequence) ? resultArray[0] : resultArray)
    }
    
  } catch (error) {
    if (error.message.includes('Aborted by client')) {
       res.sendStatus(400)
    } else {
      console.log(error.message)
      res.sendStatus(500)
    }

  }
};

const vsearchServer = async (req, res) => {
  const {sequence, outformat} = req.query;
  if(!config.VSEARCH_SERVER){
    res.sendStatus(501)
    return
  }
  if(!sequence){
    res.sendStatus(400)
    return
  }
  const sanitizedSequence = sanitizeSequence(sequence);
  // use limit to always only have 1 request to the vsearch server
  vsearchServerLimit(
    () => fetch(`${config.VSEARCH_SERVER}?sequence=${sanitizedSequence}&outfmt=${outformat}`)
    .then(response => response.text())
    .then(data => {
      const vsearchJson = outformat === 'blast6out' ? vsearchResultToJson(data, {search: sanitizedSequence}) : vsearchResultToJsonWithAligment(data, {search: sanitizedSequence}) ;
      res.json(vsearchJson);
    })
    .catch(error => {
      console.log(error);
      res.sendStatus(500);
    })
  )

}

export default (app) => {
  app.post("/search", search);
  app.post("/search/batch", search);
  app.get("/vsearch-server", vsearchServer);
};
