const { MongoClient } = require('mongodb');
const pino = require('pino');
const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname'
    }
  }
});
require('dotenv').config()

// Function to generate a unique database name with a timestamp
function generateDatabaseName(baseName) {
  const timestamp = Math.floor(Date.now() / 1000); // Generate a Unix timestamp
  return `${baseName}_${timestamp}`;
}

// Function to get the timestamp from the database name
function extractTimestamp(dbName) {
  const parts = dbName.split('_');
  return parseInt(parts[parts.length - 1], 10);
}

async function connectToDatabase(url, dbName) {
  logger.info(`Connecting to database ${dbName}...`);
  const client = await MongoClient.connect(url);
  const db = client.db(dbName);
  logger.info(`Connected to database ${dbName}`);
  return { client, db };
}

async function getBackupDatabases(client, baseDbName) {
  logger.info('Fetching list of databases...');
  const databases = await client.db().admin().listDatabases();
  // Filter the databases that match the baseDbName prefix
  return databases.databases
    .map(db => db.name)
    .filter(name => name.startsWith(baseDbName));
}

async function removeOldestDatabase(client, databases) {
  logger.info('Checking if more than 10 backup databases exist...');
  if (databases.length > 10) {
    logger.info('More than 10 backups found. Removing the oldest one...');
    const sortedDatabases = databases.sort((a, b) => extractTimestamp(a) - extractTimestamp(b));
    const oldestDatabase = sortedDatabases[0];
    logger.info(`[DATABASE_DROP] Dropping the oldest database: ${oldestDatabase}`);
    await client.db(oldestDatabase).dropDatabase();
    logger.info(`[DATABASE_DROP] Database ${oldestDatabase} removed successfully`);
  }
}

async function mountCollections(db) {
  logger.info('Fetching list of collections...');
  const collections = await db.listCollections().toArray();
  logger.info(`Found ${collections.length} collections`);
  return collections;
}

async function copyCollections(sourceDB, destinationDB, collections) {
  for (const collection of collections) {
    const sourceCollection = sourceDB.collection(collection.name);
    const destinationCollection = destinationDB.collection(collection.name);
    
    logger.info(`Checking if collection ${collection.name} exists in the destination database...`);
    await destinationCollection.drop().catch(err => {
      if (err.codeName !== 'NamespaceNotFound') {
        throw err;
      }
    });
    logger.info(`Collection ${collection.name} removed from the destination database (if it existed)`);
    
    logger.info(`Copying documents from collection ${collection.name}...`);
    const documents = await sourceCollection.find().toArray();
    if (documents.length > 0) {
      await destinationCollection.insertMany(documents);
      logger.info(`Copied ${documents.length} documents from collection ${collection.name}`);
    } else {
      logger.info(`No documents found in collection ${collection.name}`);
    }
  }
}

async function backupMongoDB(sourceURL, destinationURL, baseDbName) {
  try {
    logger.info('Starting MongoDB backup...');
    
    // Generate a unique destination database name with a timestamp
    const backupDbName = generateDatabaseName(baseDbName);
    
    const { client: sourceClient, db: sourceDB } = await connectToDatabase(sourceURL, baseDbName);
    const { client: destinationClient, db: destinationDB } = await connectToDatabase(destinationURL, backupDbName);
    
    // Get list of existing backup databases
    const existingBackupDatabases = await getBackupDatabases(destinationClient, baseDbName);
    
    // Check if there are more than 10 backups, and remove the oldest one if necessary
    await removeOldestDatabase(destinationClient, existingBackupDatabases);
    
    const collections = await mountCollections(sourceDB);
    if (collections.length === 0) {
      logger.info('No collections found in the source database');
      return;
    }
    
    await copyCollections(sourceDB, destinationDB, collections);
    
    logger.info('Closing database connections...');
    await sourceClient.close();
    await destinationClient.close();
    
    logger.info(`Backup completed successfully! Destination database: ${backupDbName}`);
  } catch (error) {
    logger.error('An error occurred during the backup:', error);
  }
}

const sourceURL = process.env.SOURCE_DATABASE_URL;
const destinationURL = process.env.DESTINATION_DATABASE_URL;
const baseDbName = process.env.DATABASE_NAME;

backupMongoDB(sourceURL, destinationURL, baseDbName);
