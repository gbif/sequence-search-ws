import fs from "fs"
import YAML from 'yaml'
import config from "./config.mjs"

let databasesAvailable = [];
const readDatabases = async () => {

    try {
        const fileList = await fs.promises.readdir(`${config.BLAST_DATABASE_PATH}`)
        const dbFiles = fileList.filter(f => f.endsWith('.udb'))
        databasesAvailable = dbFiles.map(f => {
            const yamlFileName = `${f.split(".udb")?.[0]}.yaml`
            const yamlFile = fileList.find(a => a === yamlFileName);
            let metadata = {}
            if(!!yamlFile){
                try {
                    const metadataRaw = fs.readFileSync(`${config.BLAST_DATABASE_PATH}${yamlFile}`, 'utf8');
                    metadata = YAML.parse(metadataRaw)
                } catch (error) {
                    console.log(`Failed to parse yaml: ${yamlFile}`)
                }
            }
            

            return {
                ...metadata,
                db: f
            }
        })
        console.log("Databases available:")
        databasesAvailable.forEach(d => console.log(d.db));
    } catch (error) {
        console.log("Could not load databases")
        console.log(error)
    }

}


const getDatabases = async (req, res) => {

    try {
        if(req?.query?.refresh){
            await readDatabases()
        }
        res.json(databasesAvailable)
    } catch (error) {
        console.log(error)
        res.sendStatus(500)
    }

}




readDatabases()


export default (app) => {
    app.get("/databases-available", getDatabases);
  };