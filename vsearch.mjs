import fs from "fs";
import config from "./config.mjs";
import {getFastaFromRequest} from "./util.mjs"
import { spawn } from 'child_process';

export const runVsearch = ({ reqId, sequence, database, resultArray, outformat }) =>
    new Promise(async (resolve, reject) => {
      try {
           const queryFile = config.BLAST_SEQ_PATH + `${reqId}.fasta`;
        await fs.promises.writeFile(
          queryFile,
          getFastaFromRequest({sequence, resultArray}),
          "utf-8"
        ); 
  
        let params = [
          "--usearch_global",
           queryFile, 
          "--db",
          `${config.BLAST_DATABASE_PATH}${database}`,
          "--id",
          0.90,
          "--query_cov",
          0.5,
           outformat === "blast6out"  ?  "--blast6out" : "--alnout",
          "-",
          "--maxaccepts",
          100,
          "--maxrejects",
          100,
          "--maxhits",
          100,
          "--threads",
          config.NUM_THREADS,
          "--quiet"
        ];
  
        let pcs = spawn(config.VSEARCH, params, { stdio: ["pipe", "pipe", 0] });
      
        let string = "";
  
        pcs.on("error", function (e) {
          console.log(e);
          reject(e);
        });
        if (pcs.stdout) {
          pcs.stdout.on("data", function (chunk) {
            let part = chunk.toString();
            string += part;
          });
  
          pcs.stdout.on("end", function () {
            resolve(string);
            pcs.stdout.destroy();
            fs.unlink(queryFile, function(e1) {
              if (e1) {
                  console.log('Failed to remove seq file: ' + queryFile);
              }
          }); 
          });
        }
        if (pcs.stderr) {
          pcs.stderr.destroy();
        }
        if (pcs.stdin) {
          pcs.stdin.destroy();
        }
      } catch (error) {
        reject(error);
      }
    });

    export default {
        runVsearch
    }