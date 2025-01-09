# sequence-search-ws

A thin rest service on top af vsearch. New backend for the [sequence id tool](https://www.gbif.org/tools/sequence-id) and taxonomic annotation in installations of the [Metabarcoding Data Toolkit](https://mdt.gbif-test.org/).

### Requirements

* Node version v20.10.0 or newer installed.
* [vsearch installed](https://github.com/torognes/vsearch/releases), and a vsearch database created for querying
* Write access to a directory defined in `BLAST_SEQ_PATH` in the config. Temporary fasta files will be written to this directory.

### Install

Download a reference dataset: https://unite.ut.ee/repository.php - choose the "General FASTA release"

Make a vsearch database: 

`vsearch --makeudb_usearch sh_general_release_dynamic_s_all_25.07.2023.fasta --output sh_general_release_dynamic_s_all_25.07.2023.udb`

Clone this repository:

`git clone https://github.com/thomasstjerne/sequence-search-ws.git`   

cd in to the directory:

`cd sequence-search-ws`

install dependencies:

`npm install`


### Run the service

`node app.mjs`

### Usage

`POST http://localhost:9002/search`

The body of your request should be a JSON object:

```javascript
{
  "database": "sh_general_release_dynamic_s_all_25.07.2023.udb", 
  "sequence": ["TTAGAGGAAGTAAAAGTCGTAACAAGGTTTCCGTAGGTGAACCTGCGGAAGGATCATTATTGAAATAAACCT.......", "AGTCGTAACAAGGTTTCCGTAGGTGAACCTGCGGAAGGATC...."]
 }
```

### Example

```
curl --header "Content-Type: application/json" \
  --request POST \
  --data '{"sequence" : ["TTAGAGGAAGTAAAAGTCGTAACAAGGTTTCCGTAGGTGAACCTGCGGAAGGATCATTATTGAAATAAACCTGATGAGTTGTTGCTGGCTCTCTAGGGAGCATGTGCACACTTGTCATCTTTGTATCTTCACCTGTGCACCTTTTGTAGACCTTGGGTATCTATCTGATTGCTTTAGCACTCAGGATTGAGGATTGACTTCTTGTCTCTTCTTACATTTCCAGGTCTATGTTTCTTAATATACCCTAATGTATGTTTATAGAATGTAATTAATGGGCCTTTGTGCCTATAAATCTATACAACTTTCAGCAACGGATCTCTTGGCTCTCGCATCGATGAAGAACGCAGCGAAATGCGATAAGTAATGTGAATTGCAGAATTCAGTGAATCATCGAATCTTTGAACGCACCTTGCGCTCCTTGGTATTCCGAGGAGCATGCCTGTTTGAGTGTCATTAATATATCAACCTCTTTGGTTGGATGTGGGGGTTTGCTGGCCACTTGAGGTCAGCTCCTCTTAAATGCATTAGCGGACAACATTTTGCTAAACGTTCATTGGTGTGATAATTATCTACGCTCTTGACGTGAAGCAGGTTCAGCTTCTAACAGTCCATTGACTTGGATAAATTTTTTTCTATCAATGTGACCTCAAATCAGGTAGGACTACCCGCTGAACTTAAGCATATCAATAAGCGGAGGAAAAGAAACTAACAAGGATTCCCCTAGTAACTGCGAGTGAAGCGGGAAAAGCTCAAATTTAAAATCTGGCAGTCTTTGGCTGTCCGAGTTGTAATCTAGAGAAGCATTATCCGCGCTG"],
	"database": "sh_general_release_dynamic_s_all_25.07.2023.udb"
}' \
  http://localhost:9002/search | node <<< "var o = $(cat); console.log(JSON.stringify(o, null, 4));"
```

### HBase cache

```
create 'blast_cache', {NAME=>'ref', VERSIONS => 1, COMPRESSION => 'SNAPPY', DATA_BLOCK_ENCODING => 'FAST_DIFF', BLOOMFILTER => 'NONE'}

hosts: 'uc6n10.gbif.org', 'uc6n11.gbif.org', 'uc6n12.gbif.org'
port: 31995

> hbase shell
hbase> count 'blast_cache'
hbase> scan 'blast_cache'
```
