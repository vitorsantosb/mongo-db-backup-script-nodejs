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


async function connectToDatabase(url, dbName) {
  logger.info(`\nConectando ao banco de dados ${dbName}...`);
  const client = await MongoClient.connect(url);
  const db = client.db(dbName);
  logger.info(`Conectado ao banco de dados ${dbName}\n`);
  return { client, db };
}

async function mountCollections(db) {
  logger.info('\nObtendo lista de colecoes...');
  const collections = await db.listCollections().toArray();
  logger.info(`Encontradas ${collections.length} colecoes\n`);
  return collections;
}

async function copyCollections(sourceDB, destinationDB, collections) {
  for (const collection of collections) {
    const sourceCollection = sourceDB.collection(collection.name);
    const destinationCollection = destinationDB.collection(collection.name);

    logger.info(`Verificando se a colecao ${collection.name} existe no banco de dados de destino...`);
    await destinationCollection.drop().catch(err => {
      if (err.codeName !== 'NamespaceNotFound') {
        throw err;
      }
    });
    logger.info(`Colecao ${collection.name} removida do banco de dados de destino (se existia)\n`);

    logger.info(`Copiando documentos da colecao ${collection.name}...`);
    const documents = await sourceCollection.find().toArray();
    if (documents.length > 0) {
      await destinationCollection.insertMany(documents);
      logger.info(`Copiados ${documents.length} documentos da colecao ${collection.name}\n`);
    } else {
      logger.info(`Nenhum documento encontrado na colecao ${collection.name}\n`);
    }
  }
}

async function backupMongoDB(sourceURL, destinationURL, dbName) {
  try {
    logger.info('\nIniciando backup do MongoDB');

    const { client: sourceClient, db: sourceDB } = await connectToDatabase(sourceURL, dbName);

    const { client: destinationClient, db: destinationDB } = await connectToDatabase(destinationURL, dbName);

    const collections = await mountCollections(sourceDB);
    if (collections.length === 0) {
      logger.info('Nenhuma colecao encontrada no banco de dados de origem');
      return;
    }

    await copyCollections(sourceDB, destinationDB, collections);

    logger.info('Fechando conexoes com os bancos de dados...');
    await sourceClient.close();
    await destinationClient.close();

    logger.info('Backup concluido com sucesso!\n');
  } catch (error) {
    logger.error('Ocorreu um erro durante o backup:', error);
  }
}

const sourceURL = process.env.SOURCE_DATABASE_URL;
const destinationURL = process.env.DESTINATION_DATABASE_URL;
const dbName = process.env.DATABASE_NAME;


backupMongoDB(sourceURL, destinationURL, dbName);
