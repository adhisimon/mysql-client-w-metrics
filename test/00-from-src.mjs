/* global describe, it, before, after */

import 'dotenv/config';
import should from 'should';
import MySQLClientWMetrics from '../src/index.mjs';

const {
  MYSQL_HOST,
  MYSQL_PORT,
  MYSQL_DATABASE,
  MYSQL_USER,
  MYSQL_PASSWORD
} = process.env;

/**
 * @type {MySQLClientWMetrics}
 */
let client;

describe('#import from src directly', () => {
  before(() => {
    client = new MySQLClientWMetrics({
      host: MYSQL_HOST,
      database: MYSQL_DATABASE,
      port: Number(MYSQL_PORT),
      user: MYSQL_USER,
      password: MYSQL_PASSWORD
    });
  });

  after(() => {
    client.poolCallbackStyle.end();
  });

  it('should behave correctly', async () => {
    should.exists(client, 'client should exists [80557CD2]');
    should.ok(await client.isConnected(), 'client shoud be connected [A7E1F316]');
  });
});
