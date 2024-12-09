const _ = require('lodash');
const config = require('../config_hbase.js')
// const config = import('../config.mjs').HBASE;
const thrift = require('thrift'),
  HBase = require('./gen-nodejs/HBase.js'),
  HBaseTypes = require('./gen-nodejs/Hbase_types.js');
 
/* const config = {
    hosts: ['uc6n10.gbif.org', 'uc6n11.gbif.org', 'uc6n12.gbif.org' ], //["c4master1-vh.gbif.org", "c4master2-vh.gbif.org", "c3master3-vh.gbif.org"],
    port: 31995,
    tableName: 'blast_cache'
    
  };  */

let connection; 
let client;
const connect = () =>{
    connection = thrift.createConnection(config.hosts[0], config.port, {
        transport: thrift.TBufferedTransport,
        protocol: thrift.TBinaryProtocol
      }); 
     client = thrift.createClient(HBase,connection);

     connection.on('close', function(){ 
         //console.log("The connnection closed, reconnecting...")
         connect()
    })
    connection.on('connect', function() {
        client.getTableNames(function(err,data) {
          if (err) {
            console.log('get table names error:', err);
          } else {
           // console.log('hbase tables:', data.map(t => t.toString()));
            const table = data.find(t => t.toString() === config.tableName);
            if(table){
               // console.log(`Hbase table ${config.tableName} found. Cache is ready.`);
                return client;
            } else {
                console.log(`Hbase table ${config.tableName} NOT found. Caching will not work`)
                return null;
            }
          }
        });
      });
}

const set = async (sequence, database, result) => {
    return new Promise((resolve, reject) => {
        if(client){
            var data = [new HBaseTypes.Mutation({column:'ref:sourcedb','value':database}), new HBaseTypes.Mutation({column:'ref:data','value': JSON.stringify(result)})];
            client.mutateRow(config.tableName, sequence, data, null, function(error, success){
                if(error){
                    console.log(error)
                    reject()
                } else {
                    resolve()
                   // console.log("Insertion succeeded")
                }
                
            })
        } else {
            reject()
        }
    })
}

const get = async (sequence, database) => {
    return new Promise((resolve, reject) => {
            if(client){
                client.getRow(config.tableName, sequence, null, function(error, data){
                    try {
                        if(error){
                            console.log(error)
                            reject(error)
                        } else {
                           // console.log("Get succeeded")
                            let result = data.find(row => _.get(row, 'columns["ref:sourcedb"].value', '').toString() === database)
                            // console.log(`Result ${!!result}`)
                            if(result){
                                const res = JSON.parse(_.get(result, 'columns["ref:data"].value', ''));
                                resolve(res) // resolve(parse ? res : res.toString())
                            } else {
                                reject("Not found")
                            }
                           
                        }  
                    } catch (error) {
                        console.log(error)
                    }
                    
                    
                })
            }  else {
                reject();
            }
    })
    
}

connect()
module.exports = {
    set,
    get
};