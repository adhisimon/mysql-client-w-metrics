import mysql from 'mysql2';
import { Counter, Gauge, register } from 'prom-client';
let instanceCreated = 0;

/**
 * @typedef PoolIdObject
 * @type {object}
 * @property {string?} prefix
 * @property {string?} value
 * @property {string?} suffix
 */

class MySQLClientWMetrics {
  /**
   *
   * @param {import('mysql2').PoolOptions} poolOptions
   * @param {string|PoolIdObject} [poolId]
   */
  constructor (poolOptions, poolId) {
    instanceCreated += 1;

    if (!poolId) {
      poolId = instanceCreated.toString();
    } else if (typeof poolId !== 'string') {
      poolId = [
        poolId.prefix,
        poolId.value || instanceCreated.toString(),
        poolId.suffix
      ].filter((item) => item).join('-');
    }
    this.poolId = instanceCreated.toString();

    /**
     * @type {import('mysql2').PoolOptions}
     */
    const _poolOptions = poolOptions
      ? JSON.parse(JSON.stringify(poolOptions))
      : {};

    if (!_poolOptions.host) _poolOptions.host = 'localhost';
    _poolOptions.port = Number(_poolOptions.port) || 3306;

    this.poolCallbackStyle = mysql.createPool(_poolOptions);
    this.pool = this.poolCallbackStyle.promise();

    const connectionLimit = this.poolCallbackStyle.config.connectionLimit;
    let queueLength = 0;
    let highestConnectionQueueLength = 0;
    let activeConnectionsCount = 0;
    let freeConnectionsCount = 0;

    const updateMetrics = () => {
      activeConnectionsCount = this.poolCallbackStyle._allConnections?.length || 0;
      freeConnectionsCount = this.poolCallbackStyle._freeConnections?.length || 0;

      queueLength = this.poolCallbackStyle._connectionQueue?.length || 0;
      highestConnectionQueueLength = Math.max(highestConnectionQueueLength, queueLength);
    };

    /**
     * Check if pool is connected
     *
     * @returns {Promise<boolean>}
     */
    this.isConnected = async () => {
      try {
        await this.pool.query('SELECT 1');
        return true;
      } catch (e) {
        return false;
      }
    };

    this.metrics = async () => await register.metrics();

    const waitingForConnectionCounter = new Counter({
      name: 'mysql_pool_waiting_for_connection_occured',
      help: 'Number of mysql pool waiting for connection occured',
      labelNames: ['pool_id']
    });

    const acquireConnectionCounter = new Counter({
      name: 'mysql_pool_acquire_connection',
      help: 'Number of mysql pool acquire connection occured',
      labelNames: ['pool_id']
    });

    // eslint-disable-next-line no-new
    new Gauge({
      name: 'mysql_pool_connection_limit',
      help: 'Number of connection limit on mysql pool connection',
      labelNames: ['pool_id'],
      collect () {
        this.set(
          { pool_id: poolId },
          connectionLimit
        );
      }
    });

    // eslint-disable-next-line no-new
    new Gauge({
      name: 'mysql_pool_connection_queue_length',
      help: 'Number of connection waiting in mysql pool queue',
      labelNames: ['pool_id'],
      collect () {
        this.set(
          { pool_id: poolId },
          queueLength
        );
      }
    });

    // eslint-disable-next-line no-new
    new Gauge({
      name: 'mysql_pool_highest_connection_queue_length',
      help: 'Highest connection queue length on mysql pool',
      labelNames: ['pool_id'],
      collect () {
        this.set(
          { pool_id: poolId },
          highestConnectionQueueLength
        );
      }
    });

    // eslint-disable-next-line no-new
    new Gauge({
      name: 'mysql_pool_active_connection',
      help: 'Number of active connections on mysql pool',
      labelNames: ['pool_id'],
      collect () {
        this.set(
          { pool_id: poolId },
          activeConnectionsCount
        );
      }
    });

    // eslint-disable-next-line no-new
    new Gauge({
      name: 'mysql_pool_free_connection',
      help: 'Number of free connections on mysql pool',
      labelNames: ['pool_id'],
      collect () {
        this.set(
          { pool_id: poolId },
          freeConnectionsCount
        );
      }
    });

    this.poolCallbackStyle.on('enqueue', () => {
      waitingForConnectionCounter.labels({ pool_id: poolId }).inc();
      updateMetrics();
    });

    this.poolCallbackStyle.on('connection', () => {
      updateMetrics();
    });

    this.poolCallbackStyle.on('acquire', () => {
      acquireConnectionCounter.labels({ pool_id: poolId }).inc();
      updateMetrics();
    });

    this.poolCallbackStyle.on('release', () => {
      updateMetrics();
    });
  }
}

export default MySQLClientWMetrics;
