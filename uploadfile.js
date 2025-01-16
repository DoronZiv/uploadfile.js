const { google } = require('googleapis');
const fs = require('fs');

// Step 1: Authenticate and create the service
async function authenticateGoogleDrive() {
    const SCOPES = ['https://www.googleapis.com/auth/drive.file'];
    const TOKEN_PATH = 'token.json';
    const CREDENTIALS_PATH = 'credentials.json';

    let credentials;
    try {
        credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
    } catch (error) {
        throw new Error('Error loading credentials file. Make sure "credentials.json" exists.');
    }

    const { client_secret, client_id, redirect_uris } = credentials.installed;
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

    // Check if token already exists
    if (fs.existsSync(TOKEN_PATH)) {
        const token = fs.readFileSync(TOKEN_PATH, 'utf8');
        oAuth2Client.setCredentials(JSON.parse(token));
    } else {
        // Request user authentication
        const authUrl = oAuth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: SCOPES,
        });
        console.log('Authorize this app by visiting this URL:', authUrl);

        const readline = require('readline').createInterface({
            input: process.stdin,
            output: process.stdout,
        });

        await new Promise((resolve) => {
            readline.question('Enter the code from the page here: ', (code) => {
                readline.close();
                oAuth2Client.getToken(code, (err, token) => {
                    if (err) return console.error('Error retrieving access token', err);
                    oAuth2Client.setCredentials(token);

                    // Save the token for future use
                    fs.writeFileSync(TOKEN_PATH, JSON.stringify(token));
                    console.log('Token stored to', TOKEN_PATH);
                    resolve();
                });
            });
        });
    }

    return google.drive({ version: 'v3', auth: oAuth2Client });
}

// Step 2: Upload a file
async function uploadFileToDrive(service, filePath, mimeType) {
    try {
        const fileMetadata = {
            name: require('path').basename(filePath),
        };
        const media = {
            mimeType: mimeType,
            body: fs.createReadStream(filePath),
        };

        const file = await service.files.create({
            resource: fileMetadata,
            media: media,
            fields: 'id',
        });

        console.log(`File uploaded successfully. File ID: ${file.data.id}`);
    } catch (error) {
        console.error('Error uploading file:', error.message);
    }
}

(async () => {
    try {
        const filePath = 'your_file.txt'; // Path to the file you want to upload
        const mimeType = 'text/plain'; // Adjust MIME type based on your file type

        const service = await authenticateGoogleDrive();
        await uploadFileToDrive(service, filePath, mimeType);
    } catch (error) {
        console.error('Error:', error.message);
    }
})();