import { MongoClient } from 'mongodb';

class DBClient {
  constructor() {
    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || 27017;
    const database = process.env.DB_DATABASE || 'files_manager';
    const url = `mongodb://${host}:${port}/${database}`;
    this.client = new MongoClient(url, { useNewUrlParser: true, useUnifiedTopology: true });
    this.client.connect();
    this.db = this.client.db(database);
  }

  async isAlive() {
    try {
      await this.client.db().admin().ping();
      return true;
    } catch (error) {
      return false;
    }
  }

  async nbUsers() {
    return this.db.collection('users').estimatedDocumentCount();
  }

  async nbFiles() {
    return this.db.collection('files').estimatedDocumentCount();
  }
}

const dbClient = new DBClient();
export default dbClient;
