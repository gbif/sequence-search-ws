import express from 'express';
import addRequestId from 'express-request-id';
import bodyParser from 'body-parser';
import search from './search.mjs';
import databases from './databases.mjs';
import config from './config.mjs';
import gbifServiceRegistry from './gbifServiceRegistry.js';
import cors from 'cors'

const app = express();
app.use(cors())

app.use(addRequestId());
app.use(bodyParser.json({
    limit: '1mb'
}));
databases(app)
search(app)

const listener = app.listen(config.EXPRESS_PORT, function() {
    // console.log("Config "+config.INPUT_PATH )
     console.log('Express server listening on port ' + config.EXPRESS_PORT);
          // Set up ZooKeeper.
    gbifServiceRegistry.register(config);
 });

// Exit on Ctrl-C
process.on('SIGINT', () => {
    listener.close(() => {
        process.exit(0)
    })
})

// Exit on terminate signal
process.on('SIGTERM', () => {
    listener.close(() => {
        process.exit(0)
    })
})


