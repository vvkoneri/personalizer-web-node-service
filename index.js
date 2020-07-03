// index.js

/**
 * Required External Modules
 */
const express = require("express");
const cors = require('cors')
const bodyParser = require('body-parser')
const level = require('level');    
const path = require('path');


/**
 * App Variables
 */
const _dirname = "./db"
const app = express();
const port = process.env.PORT || "8000";

const dbPath = process.env.DB_PATH || path.join(_dirname, 'search-keywords-db');  
const db = level(dbPath);
/**
 *  App Configuration
 */
app.use(cors());
app.use( bodyParser.json() );       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
})); 
app.set('views','./pages');
app.set('view engine', 'ejs');
let records = [];

const data_initialize = () => {
    try  {
            records = [];
            const dbRecords = db.createReadStream().on('data', function(data){
            let dbRecord = {};
            dbRecord['user'] = data.key;
            dbRecord['records']= JSON.parse(data.value).records;
            records.push(dbRecord);
        });
    } catch (err) {
        console.log(`IGNORE** error on db fetch : ${err.message}`)
    }
}

data_initialize();

/**
 * Routes Definitions
 */
app.get("/search/records/:userIp", async (req,res) => {
   // console.log("reached here : " + req.params.ip);
    const userIp = req.params.userIp;
    // console.log(userIp);
    let responseBody = {
        "user_ip" : userIp,
        "search_keywords" : []
    }

    if(userIp) {
        try {
            const searchKeyEntry = await db.get(userIp);
            responseBody = {
                "user_ip" : userIp,
                "search_keywords" : JSON.parse(searchKeyEntry)
            }
        } catch (err) {
            console.log(`Error during database operation : ${err.message} `);
        }
    }
    res.status(200).send(responseBody);
})

app.post("/search-query", async (req,res) => {
    const search_keywords = req.body;
    if (Object.keys(search_keywords).length !== 0) {

        const clientIp = search_keywords.user;
        let dbEntry;
        try {
            dbEntry = await db.get(clientIp);
        } catch (err) {
            console.log(`IGNORE** Error during database operation during fetch: ${err.message} `);
        }

        let recordsArr = [];
        if(dbEntry) {
            recordsArr = JSON.parse(dbEntry).records;
        }
        recordsArr.push(search_keywords);

        try {
            await db.put(clientIp, JSON.stringify({ "records" : recordsArr }));
            data_initialize();
        } catch (err) {
            console.log(`Error during database operation during put: ${err.message} `);
            res.status(501).send({
                "error" : err.message
            });
        }
        res.status(200).send({
            "message" : "Update to search query parameters : Success"
        });
    
    } else {

        res.status(400).send({
            "error" : "No search query passed"
        });
    }     
});

app.get('/dashboard', (req, res) => {
        res.render('dashboard.ejs',{
            'records' : records
        });
});

/**
 * Server Activation
 */
app.listen(port, () => {
    console.log(`Listening to requests on http://localhost:${port}`);
});