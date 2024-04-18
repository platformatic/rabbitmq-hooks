'use strict'

const test = require('node:test')
const assert = require('node:assert')
const crypto = require('node:crypto')
const RabbitMQ = require('../lib/rabbitmq')
const { createExchange, publishMessage, sleep } = require('./helper')
const logger = require('pino')()

test('should fail connecting to rabbitmq', async () => {
  const url = 'xxxx'
  const rabbitmq = new RabbitMQ({ logger })
  try {
    await rabbitmq.connect(url)
    assert.fail('Should have thrown an error')
  } catch (err) {
    assert.strictEqual(err.message, 'Connection failed to xxxx')
  }
  await rabbitmq.close()
})

test('should fail to listen on a non-existent exchange', async () => {
  const url = 'amqp://localhost'
  const exchange = 'test-exchange-xxx'
  const routingKey = ''

  const messages = []
  const callback = (msg) => {
    messages.push(msg)
  }

  let rabbitmq
  try {
    rabbitmq = new RabbitMQ({ logger })
    await rabbitmq.connect(url)
    await rabbitmq.listen(exchange, routingKey, callback)
    assert.fail('Should have thrown an error')
  } catch (err) {
    assert.strictEqual(err.message, 'Exchange test-exchange-xxx does not exist')
  }
  await rabbitmq.close()
  assert.strictEqual(messages.length, 0)
})

test('should connect to rabbitmq succesfully', async (t) => {
  const url = 'amqp://localhost'
  const exchange = 'test-exchange'
  const routingKey = ''

  await createExchange(url, exchange, 'fanout')

  const messages = []
  const callback = (msg) => {
    messages.push(msg)
  }

  const rabbitmq = new RabbitMQ({ logger })
  await rabbitmq.connect(url)
  await rabbitmq.listen(exchange, routingKey, callback)

  await rabbitmq.close()

  assert.strictEqual(messages.length, 0)
})

test('should receive messages and call the callback for each message', async (t) => {
  const url = 'amqp://localhost'
  const exchange = 'test-exchange-zzz'
  const routingKey = ''

  await createExchange(url, exchange, 'fanout')

  const messages = []
  const callback = (msg) => {
    messages.push(msg)
  }

  const rabbitmq = new RabbitMQ({ logger })
  await rabbitmq.connect()
  await rabbitmq.listen(exchange, routingKey, callback)

  await publishMessage(url, exchange, 'test message x1')
  await publishMessage(url, exchange, 'test message x2')

  await rabbitmq.close()

  assert.strictEqual(messages.length, 2)
  assert.strictEqual(messages[0].content.toString(), 'test message x1')
  assert.strictEqual(messages[1].content.toString(), 'test message x2')
})

test('should receive messages and call the callback for each message, creating the exchange', async (t) => {
  const url = 'amqp://localhost'
  const exchange = 'test-exchange-' + crypto.randomBytes(20).toString('hex')
  const routingKey = ''

  const messages = []
  const callback = (msg) => {
    messages.push(msg)
  }

  const rabbitmq = new RabbitMQ({ logger, generateExchange: true })
  await rabbitmq.connect()
  await rabbitmq.listen(exchange, routingKey, callback)

  await publishMessage(url, exchange, 'test message x1')
  await publishMessage(url, exchange, 'test message x2')

  await rabbitmq.close()

  assert.strictEqual(messages.length, 2)
  assert.strictEqual(messages[0].content.toString(), 'test message x1')
  assert.strictEqual(messages[1].content.toString(), 'test message x2')
})

test('should fail to publish messages on non-existent exchanges', async () => {
  const url = 'amqp://localhost'
  const exchange = 'test-exchange-xxx'

  const rabbitmq = new RabbitMQ({ logger })
  await rabbitmq.connect(url)

  try {
    await rabbitmq.publish(exchange, 'test 1')
    assert.fail('Should have thrown an error')
  } catch (err) {
    assert.strictEqual(err.message, 'Exchange test-exchange-xxx does not exist')
  }
  await rabbitmq.close()
})

test('should publish messages', async (t) => {
  const url = 'amqp://localhost'
  const exchange = 'test-exchange-aaa'
  const routingKey = ''

  await createExchange(url, exchange, 'fanout')

  const messages = []
  const callback = (msg) => {
    messages.push(msg)
  }

  const rabbitmq = new RabbitMQ({ logger })
  await rabbitmq.connect(url)
  await rabbitmq.listen(exchange, routingKey, callback)

  await rabbitmq.publish(exchange, 'test 1')
  await rabbitmq.publish(exchange, 'test 2')

  await sleep(200) // wait for the messages to be processed before closing the connection

  assert.strictEqual(messages.length, 2)
  assert.strictEqual(messages[0].content.toString(), 'test 1')
  assert.strictEqual(messages[1].content.toString(), 'test 2')

  await rabbitmq.close()
})
