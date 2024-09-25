'use strict'

const test = require('node:test')
const assert = require('node:assert')
const stackable = require('../index')
const { schema } = require('../lib/schema')
const { Generator } = require('../lib/generator')
const { getConfig, createExchange } = require('./helper')

test('should export stackable interface', async () => {
  assert.strictEqual(typeof stackable, 'function')
  assert.strictEqual(stackable.configType, 'rabbitmq-hooks')
  assert.deepStrictEqual(stackable.schema, schema)
  assert.deepStrictEqual(stackable.Generator, Generator)
  assert.ok(stackable.configManagerConfig)
  assert.ok(typeof stackable.transformConfig, 'function')
})

test('should build a stackable instance', async (t) => {
  const url = 'amqp://localhost'
  const exchange = 'test-exchange'
  const routingKey = ''
  const queue = 'test-queue'
  const durableQueue = false
  const exclusiveQueue = false
  const targetUrl = `http://localhost:3042`

  const exchanges = [{ name: exchange, routingKey, targetUrl, queue, durableQueue, exclusiveQueue }]
  const opts = {
    url,
    exchanges
  }
  await createExchange(url, exchange, 'fanout', routingKey, t)

  const config = await getConfig(opts)
  const app = await stackable.buildStackable(config)

  await app.start()

  await app.stop()
})
