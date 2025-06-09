import mysql from 'mysql2';

class MySQLClientWMetrics {
  /**
   *
   * @param {import('mysql2').PoolOptions} options
   */
  constructor (options) {
    this.poolCallbackStyle = mysql.createPool(options);
    this.pool = this.poolCallbackStyle.promise();
  }
}

export default MySQLClientWMetrics;
