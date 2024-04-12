'use strict'

const test = require('node:test')
const assert = require('node:assert')
const RabbitMQ = require('../lib/rabbitmq')
const { createExchange, publishMessage } = require('./helper')
const logger = require('pino')()

test('should fail connecting to rabbitmq', async () => {
  const url = 'amqp://localhostxxxx'
  const exchange = 'test-exchange'
  const routingKey = 'test-routing-key'
  const rabbitmq = new RabbitMQ({ url, exchange, routingKey, logger })
  try {
    await rabbitmq.connect(() => {})
    assert.fail('Should have thrown an error')
  } catch (err) {
    assert.strictEqual(err.message, 'Connection failed to amqp://localhostxxxx')
  }
  await rabbitmq.close()
})

test('should connect to rabbitmq succesfully', async () => {
  const url = 'amqp://localhost'
  const exchange = 'test-exchange'
  const routingKey = ''

  await createExchange(url, exchange, 'fanout')

  const messages = []
  const callback = (msg) => {
    messages.push(msg)
  }

  const rabbitmq = new RabbitMQ({ url, exchange, routingKey, logger })
  await rabbitmq.connect(callback)

  await rabbitmq.close()

  assert.strictEqual(messages.length, 0)
})

test('should receive messages and call the callback for each message', async () => {
  const url = 'amqp://localhost'
  const exchange = 'test-exchange'
  const routingKey = ''

  await createExchange(url, exchange, 'fanout')

  const messages = []
  const callback = (msg) => {
    messages.push(msg)
  }

  const rabbitmq = new RabbitMQ({ url, exchange, routingKey, logger })
  await rabbitmq.connect(callback)

  await publishMessage(url, exchange, 'test message 1')
  await publishMessage(url, exchange, 'test message 2')

  await rabbitmq.close()

  assert.strictEqual(messages.length, 2)
  assert.strictEqual(messages[0].content.toString(), 'test message 1')
  assert.strictEqual(messages[1].content.toString(), 'test message 2')
})
