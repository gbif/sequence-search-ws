import PQueue from "p-queue";
import pLimit from "p-limit";
import config from "./config.mjs";
// import cache from "./caches/hbase.js"; // Could be null if no cache is needed
import { vsearchResultToJsonWithAligment, vsearchResultToJson, getMatch} from "./util.mjs"
import {runVsearch} from "./vsearch.mjs"
import _ from "lodash"
const queue = new PQueue({ concurrency: 1 });
const limit = pLimit(config.CACHE_CONCURRENCY);

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
    let {sequence, database, verbose} = req?.body;
    const {outformat} = req.query
    if(!_.isArray(sequence)){
      sequence = [sequence]
    }
    let resultArray = Array(sequence.length);

    if(cache){
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
    const vsearchCliOutput = await queue.add(() => runVsearch({sequence, database, reqId: req.id, resultArray, outformat}))
    const vsearchJson = outformat === 'blast6out' ? vsearchResultToJson(vsearchCliOutput) : vsearchResultToJsonWithAligment(vsearchCliOutput) ;
   
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
    console.log(error)
    res.sendStatus(500)
  }
};

export default (app) => {
  app.post("/search", search);
  app.post("/search/batch", search);
};
