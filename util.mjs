import config from './config.mjs';
import _ from 'lodash';
const vsearchColumns = ['query id', 'target header', 'identity', 'alignmentLength', 'mismatches', 'opens', 'qstart',  'qend', 'sstart', 'send', 'evalue', 'bit score'];

export const sanitizeSequence = (sequence) => {
    const sanitized = sequence.replace(/[^ACGTURYSWKMBDHVNacgturyswkmbdhvn]/g, '');
    return sanitized
}

export const getMatchType = (match) => {
    if (!match) {
        return 'BLAST_NO_MATCH';
    } else if (Number(match['identity']) >= config.MATCH_THRESHOLD /* && Number(match['% query cover']) >= config.MINIMUM_QUERY_COVER */) {
        return 'BLAST_EXACT_MATCH';
    } else if (Number(match['identity']) >= config.MATCH_CLOSE_THRESHOLD /* && Number(match['% query cover']) >= config.MINIMUM_QUERY_COVER */) {
        return 'BLAST_CLOSE_MATCH';
    } else {
        return 'BLAST_WEAK_MATCH';
    }
}

const simplyfyMatch = (match, bestIdentity) => {
  // let splitted = match['subject id'].split('|');
  //  let accesion = splitted[1];
    const simpleMatch = {
/*         'queryId': match['query id'],
 */     'name': match['scientificName'].replace(/_/g, ' '), // white space is not allowed in fasta headers and usually replaced with _
        'identity': Number(match['identity']),
        'appliedScientificName': match['appliedScientificName'],
        'alignmentLength' :  Number(match?.alignmentLength || 0),// Number(match['alignment length']),
        'misMatches':  Number(match['mismatches']),
        'gapOpenings':  Number(match['opens']),
        'matchType': getMatchType(match),
        'bitScore': Number(match['bit score']),
        'expectValue': Number(match['evalue']),
       /*  'querySequence': match['query sequence'],
        'subjectSequence': match['subject sequence'], */
        'qstart': Number(match['qstart']),
        'qend': Number(match['qend']),
        'sstart': Number(match['sstart']),
        'send': Number(match['send']),
        'qcovs': match?.['qcovs'] || -1,
        'distanceToBestMatch': bestIdentity - Number(match['identity']),
        'accession': match.accession || ''
    };
    if(match?.alignment){
        simpleMatch.alignment = match?.alignment
    }
    return simpleMatch
}

export const getMatch = (matches, verbose) => {
    try {
        let best = _.maxBy(matches, function(o) {
           return Number(o['identity']);
        });
        let otherMatches = matches.reduce((alternatives, match) => {
            if (match !== best && match['query id']) {
                alternatives.push(simplyfyMatch(match, best['identity']));
            }
            return alternatives;
        }, []) 
      
        let mapped = simplyfyMatch(best, best['identity']);
        if (verbose) {
            mapped.alternatives = otherMatches;
           } else {
            const alternatives = otherMatches.filter((a) => a.name !== mapped.name && a.matchType === 'BLAST_EXACT_MATCH' && a.distanceToBestMatch < (100 - config.MATCH_THRESHOLD));
            if (alternatives.length > 0) {
                mapped.alternatives = alternatives;
                if (mapped.matchType === 'BLAST_EXACT_MATCH') {
                    // ambiguous
                    mapped.matchType = 'BLAST_AMBIGUOUS_MATCH';
                }
            }
           }
        return mapped;
    } catch (err) {
        console.log(err);
        // in this case matches is matchType NONE
        return matches;
    }
}

export const vsearchResultToJson = (data, sequence) => {
    if (data) {
        let matches = data.split('\n').filter(m => !!m);
        let json = matches.map(function(m) {
            let splitted = m.split('\t');
            let res = {};
            for (let i = 0; i < splitted.length; i++) {
                res[vsearchColumns[i]] = splitted[i];
                if(i === 1){
                    const parts = splitted[i].split('|')
                    res.accession = parts?.[1] || "";
                    res.scientificName = parts?.[2] || "";
                    res.appliedScientificName = parts?.[0] || "";
                }
            }
            try {
                const queryId = Number(splitted[0]);
                const queryLength = sequence[queryId].length;
                res['qcovs'] = Math.round(((Number(res['alignmentLength']) / queryLength) * 100) * 10) / 10 ;
                
            } catch (error) {
                  console.log(error)
            }           
            return res;
        });
       // console.log(json);

        return json;
    } else {
        return {matchType: 'BLAST_NO_MATCH'};
    }

}

export const vsearchResultToJsonWithAligment = (data, sequence) => {
    if (data) {
       // console.log(data)
        const blocks = data.split("Query >")
        let result = []
        blocks.filter(b => !!b).forEach(b => {
            const subBlocks = b.split("Query");
            const matchesOverview = subBlocks[0];
            const matchesOverviewLines = matchesOverview.split('\n')
           
            const alignments = subBlocks.slice(1).reduce((acc, cur) => {
                const lines = cur.split("\n");
                const dataLine = lines.toReversed().find(l => !!(l.trim()))
                
                const dataCols = dataLine.split(", ")
                const identity = dataCols[1].split("(")?.[1]?.split("%)")?.[0];
                const alignmentLength = dataCols[0]?.split(" ")?.[0]
                const id = lines[1].split(">")[1]
                const numExactBaseMatches = lines.slice(2).join("").split("|").length-1
               // console.log(`Al lenghth ${alignmentLength} - exact matches: ${numExactBaseMatches}`)
                acc[id] = { alignment :" Query"+ cur, identity, alignmentLength, numExactBaseMatches};
                return acc
            }, {})
             matchesOverviewLines.slice(2, -1).forEach(l => {
                let cols = l.trim().split(/(\s+)/).filter(e => e.trim().length >0);
               if(!!cols[2]){
                    const parts = cols[2].split('|')
                
                const alignment = alignments[cols[2]] 

                // Vsearch will return 100% matches on series of "N". Make sure that at least half of the alignment is exact matches marked with the | character. 
                if(alignment?.alignmentLength && (alignment?.numExactBaseMatches / alignment?.alignmentLength > 0.5)){
                    const res =  {
                        "query id": matchesOverviewLines[0],
                        "target id": cols[2],
                        "identity": Number(cols[0]?.replace("%", "") || 0),
                        "target length": Number(cols[1]),
                        "alignment": alignment?.alignment,
                        "identity": Number(alignment?.identity),
                        "alignmentLength": Number(alignment?.alignmentLength),
                        "accession" : parts?.[1] || "",
                        "scientificName" : parts?.[2] || ""
                    }
                    try {
                        const queryId = Number(res['query id']);
                        const queryLength = sequence[queryId].length;
                        res['qcovs'] = Math.round(((Number(res['alignmentLength']) / queryLength) * 100) * 10) / 10 ;
                    } catch (error) {
                        console.log(error)
                    }
                    
                    result.push( res);
                }
               }
               
            })


        })

        return result;
    } else {
        return {matchType: 'BLAST_NO_MATCH'};
    }

}


export const getFastaFromRequest = ({sequence, resultArray}) => {
    const data = typeof sequence === 'string' ? [sequence] : sequence;

    return data.map((s, idx) => {
        return   !_.get(resultArray, `[${idx}]`) ? `>${idx}\n${s}` : '';
    }).filter(s => !!s).join('\n')
}

export const getYargs = () =>  process.argv.reduce((acc, curr, idx) => {
    if(curr?.startsWith('--')){
      acc[curr.substring(2)] = process.argv[idx+1]
    }
    return acc
   }, {})

export default {
    sanitizeSequence,
    simplyfyMatch,
    getMatch,
    vsearchResultToJson,
    getFastaFromRequest,
    getYargs
}