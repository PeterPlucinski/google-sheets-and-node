const fs = require('fs');
const readline = require('readline');
const { google } = require('googleapis');

const http = require('http') // added

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const TOKEN_PATH = 'token.json';
const SPREADSHEET_ID = '12gsgDLjMMjDIRlbcaKuUYY8rth_ugIsH4zI-Ns98PFc';

// server setup
const PORT = 3000;

// Load client secrets from a local file.
fs.readFile('credentials.json', (err, content) => {
    if (err) return console.log('Error loading client secret file:', err);
    // Authorize a client with credentials, then call the Google Sheets API.
    authorize(JSON.parse(content), createServerAndGoogleSheetsObj); // changed
});

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
    const { client_secret, client_id, redirect_uris } = credentials.installed;
    const oAuth2Client = new google.auth.OAuth2(
        client_id, client_secret, redirect_uris[0]);

    // Check if we have previously stored a token.
    fs.readFile(TOKEN_PATH, (err, token) => {
        if (err) return getNewToken(oAuth2Client, callback);
        oAuth2Client.setCredentials(JSON.parse(token));
        callback(oAuth2Client);
    });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getNewToken(oAuth2Client, callback) {
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
    });
    console.log('Authorize this app by visiting this url:', authUrl);
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    rl.question('Enter the code from that page here: ', (code) => {
        rl.close();
        oAuth2Client.getToken(code, (err, token) => {
            if (err) return console.error('Error while trying to retrieve access token', err);
            oAuth2Client.setCredentials(token);
            // Store the token to disk for later program executions
            fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
                if (err) console.error(err);
                console.log('Token stored to', TOKEN_PATH);
            });
            callback(oAuth2Client);
        });
    });
}

// removed listMajors function

// new
function createServerAndGoogleSheetsObj(oAuth2Client) {
    
    const sheets = google.sheets({ version: 'v4', auth: oAuth2Client });

    const server = http.createServer((request, response) => {

        if (request.method === 'POST') {
            
            // request object is a 'stream' so we must wait for it to finish
            let body = '';
            let bodyParsed = {};

            request.on('data', chunk => {
                body += chunk;
            });

            request.on('end', () => {
                bodyParsed = JSON.parse(body);
                addDataToSpreadsheet(bodyParsed.data, sheets);
            });

        }

        response.end('Request received');

    });

    server.listen(PORT, (err) => {
        if (err) {
            return console.log('something bad happened', err)
        }
        console.log(`server is listening on ${PORT}`)
    });

}

function addDataToSpreadsheet(data, googleSheetsObj) {

    let values = [
        data,
        // Additional rows ...
    ];

    let resource = {
        values,
    };

    googleSheetsObj.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Sheet1',
        valueInputOption: 'RAW',
        resource,
    }, (err, result) => {
        if (err) {
            console.log(err);
        } else {
            console.log(`${result.data.updates.updatedCells} cells appended.`);
        }
    });

}