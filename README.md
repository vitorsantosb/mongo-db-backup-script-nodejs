# MongoDB Backup Project

This project provides a Node.js script for backing up data from one MongoDB database to another. It ensures that all collections and documents from the source database are copied to the destination database.
Features

- Automatic Backup: Copies all collections and documents from the source database to the destination database.
- Log Management: Uses pino and pino-pretty for structured and readable logging.
- Error Handling: Properly handles errors during the backup process.
- Clean Copy: Removes collections from the destination database before copying to ensure a clean backup.

Prerequisites

- Node.js installed on your machine.
- MongoDB database URLs for the source and destination databases.

## Getting Started
Installation

Clone the repository:
```
git clone https://github.com/vitorsantosb/mongo-db-backup-script-nodejs.git
cd mongo-db-backup-script-nodejs
```

- Install the required dependencies:

```bash
npm install
```
Configuration

    Source Database URL: The MongoDB connection URL of the source database.
    Destination Database URL: The MongoDB connection URL of the destination database.
    Database Name: The name of the database you want to back up.

These configurations can be set directly in the backupMongoDB() function call at the end of the script.

Example Configuration
javascript
```js
const sourceURL = 'mongodb://source-db-url:27017';
const destinationURL = 'mongodb://destination-db-url:27017';
const dbName = 'meu_client';

backupMongoDB(sourceURL, destinationURL, dbName);
```
Did you prefer, you can choose for use ```dotenv``` for store you ```SOURCE_DATABASE_URL```, ```DESTINATION_DATABASE_URL``` and ```DATABASE_NAME```

### Running the Backup Script

To run the backup script with nodemon for automatic restarts on changes and structured logging:

```bash
npm run dev
```
This will start the script and begin the backup process. You will see logs in the terminal indicating the progress of the backup.

### Logs

Logs are managed using pino and pino-pretty for better readability. The logs provide detailed information about each step of the backup process, including:
- Connection to the databases.
- Collection retrieval.
- Document copying.
- Completion status.

### Handling Errors

If an error occurs during the backup process, it will be logged in the console with detailed information, allowing for easier debugging.

### Contributions
Contributions are welcome! Please feel free to submit a pull request or open an issue to suggest improvements or report bugs.

This README provides all the necessary steps to set up and use the MongoDB backup project effectively. Let me know if you need any additional information!
