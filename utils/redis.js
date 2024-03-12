import { promisify } from 'util';
import { createClient } from 'redis';

class RedisClient {
  constructor() {
    this.connection = createClient();
    this.connected = true;
    this.connection.on('error', (err) => {
      console.error('Redis client error:', err.message || err.toString());
      this.connected = false;
    });
    this.connection.on('connect', () => {
      this.connected = true;
    });
  }

  isAlive() {
    return this.connected;
  }

  async get(key) {
    const asyncGet = promisify(this.connection.get).bind(this.connection);
    return asyncGet(key);
  }

  async set(key, value, duration) {
    const asyncSetEx = promisify(this.connection.setex).bind(this.connection);
    await asyncSetEx(key, duration, value);
  }

  async del(key) {
    const asyncDel = promisify(this.connection.del).bind(this.connection);
    await asyncDel(key);
  }
}

export const redisClient = new RedisClient();
export default redisClient;
