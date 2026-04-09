import _ from 'lodash';




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
    getFastaFromRequest,
    getYargs
}