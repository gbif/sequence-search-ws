import express from 'express';
import addRequestId from 'express-request-id';
import bodyParser from 'body-parser';
import search from './search.mjs';
import databases from './databases.mjs';
import config from './config.mjs';
const app = express();

app.use(addRequestId());
app.use(bodyParser.json({
    limit: '1mb'
}));
databases(app)
search(app)
app.listen(config.EXPRESS_PORT, function() {
    // console.log("Config "+config.INPUT_PATH )
     console.log('Express server listening on port ' + config.EXPRESS_PORT);
 });