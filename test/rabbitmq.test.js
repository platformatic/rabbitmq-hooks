import { abstractLogger as logger } from '@platformatic/foundation'
import { fail, strictEqual } from 'node:assert'
import { randomBytes } from 'node:crypto'
import { test } from 'node:test'
import { RabbitMQ } from '../lib/rabbitmq.js'
import { createExchange, publishMessage } from './helper.js'

test('should fail connecting to rabbitmq', async () => {
  const url = 'xxxx'
  const rabbitmq = new RabbitMQ({ logger })
  try {
    await rabbitmq.connect(url)
    fail('Should have thrown an error')
  } catch (err) {
    strictEqual(err.message, 'Connection failed to xxxx')
  }
  await rabbitmq.close()
})

test('should fail to listen on a non-existent exchange', async () => {
  const url = 'amqp://localhost'
  const exchange = 'test-exchange-xxx'
  const routingKey = ''

  const messages = []
  const callback = msg => {
    messages.push(msg)
  }

  let rabbitmq
  try {
    rabbitmq = new RabbitMQ({ logger })
    await rabbitmq.connect(url)
    await rabbitmq.listen({ exchange, routingKey }, callback)
    fail('Should have thrown an error')
  } catch (err) {
    strictEqual(err.message, 'Exchange test-exchange-xxx does not exist')
  }
  await rabbitmq.close()
  strictEqual(messages.length, 0)
})

test('should connect to rabbitmq succesfully', async t => {
  const url = 'amqp://localhost'
  const exchange = 'test-exchange'
  const routingKey = ''

  await createExchange(url, exchange, 'fanout', t)

  const messages = []
  const callback = msg => {
    messages.push(msg)
  }

  const rabbitmq = new RabbitMQ({ logger })
  await rabbitmq.connect(url)
  await rabbitmq.listen({ exchange, routingKey }, callback)

  await rabbitmq.close()

  strictEqual(messages.length, 0)
})

test('should receive messages and call the callback for each message', async t => {
  const url = 'amqp://localhost'
  const exchange = 'test-exchange-zzz'
  const routingKey = ''

  await createExchange(url, exchange, 'fanout', t)

  const messages = []
  const callback = msg => {
    messages.push(msg)
  }

  const rabbitmq = new RabbitMQ({ logger })
  await rabbitmq.connect()
  await rabbitmq.listen({ exchange, routingKey }, callback)

  await publishMessage(url, exchange, 'test message x1')
  await publishMessage(url, exchange, 'test message x2')

  await rabbitmq.close()

  strictEqual(messages.length, 2)
  strictEqual(messages[0].content.toString(), 'test message x1')
  strictEqual(messages[1].content.toString(), 'test message x2')
})

test('should receive messages and call the callback for each message, creating the exchange', async t => {
  const url = 'amqp://localhost'
  const exchange = 'test-exchange-' + randomBytes(20).toString('hex')
  const routingKey = ''

  const messages = []
  const callback = msg => {
    messages.push(msg)
  }

  const rabbitmq = new RabbitMQ({ logger, generateExchange: true })
  await rabbitmq.connect()
  await rabbitmq.listen({ exchange, routingKey }, callback)

  await publishMessage(url, exchange, 'test message x1')
  await publishMessage(url, exchange, 'test message x2')

  await rabbitmq.close()

  strictEqual(messages.length, 2)
  strictEqual(messages[0].content.toString(), 'test message x1')
  strictEqual(messages[1].content.toString(), 'test message x2')
})

test('should fail to publish messages on non-existent exchanges', async () => {
  const url = 'amqp://localhost'
  const exchange = 'test-exchange-xxx'

  const rabbitmq = new RabbitMQ({ logger })
  await rabbitmq.connect(url)

  try {
    await rabbitmq.publish(exchange, 'test 1')
    fail('Should have thrown an error')
  } catch (err) {
    strictEqual(err.message, 'Exchange test-exchange-xxx does not exist')
  }
  await rabbitmq.close()
})

test('should publish messages', async t => {
  const url = 'amqp://localhost'
  const exchange = 'test-exchange-aaa'
  const routingKey = ''

  await createExchange(url, exchange, 'fanout', t)

  const messages = []
  const messagesReceived = Promise.withResolvers()
  const callback = msg => {
    messages.push(msg)

    if (messages.length === 2) {
      messagesReceived.resolve()
    }
  }

  const rabbitmq = new RabbitMQ({ logger })
  await rabbitmq.connect(url)
  await rabbitmq.listen({ exchange, routingKey }, callback)

  await rabbitmq.publish(exchange, 'test 1')
  await rabbitmq.publish(exchange, 'test 2')

  await messagesReceived.promise

  strictEqual(messages.length, 2)
  strictEqual(messages[0].content.toString(), 'test 1')
  strictEqual(messages[1].content.toString(), 'test 2')

  await rabbitmq.close()
})

test('should register two listener on the same queue, and only one should receive the message', async t => {
  const url = 'amqp://localhost'
  const exchange = 'test-exchange-' + randomBytes(20).toString('hex')
  const routingKey = ''
  const queue = 'test-queue'

  const messages = []
  const messagesReceived = Promise.withResolvers()

  const callback = msg => {
    if (msg.fields.exchange !== exchange) {
      // ignore messages from other tests that use the same queue
      return
    }

    messages.push(msg)
    messagesReceived.resolve()
  }

  const rabbitmq = new RabbitMQ({ logger, generateExchange: true })
  await rabbitmq.connect()
  await rabbitmq.listen({ exchange, routingKey, queue }, callback)

  await publishMessage(url, exchange, 'test message')
  await messagesReceived.promise

  await rabbitmq.close()

  strictEqual(messages.length, 1)
  strictEqual(messages[0].content.toString(), 'test message')
})

test('should register two listener on the same exchange on two different queues, and both should receive the message', async t => {
  const url = 'amqp://localhost'
  const exchange = 'test-exchange-' + randomBytes(20).toString('hex')
  const routingKey = ''
  const queue1 = 'test-queue-1'
  const queue2 = 'test-queue-2'

  const messages = []
  const messages1Received = Promise.withResolvers()
  const messages2Received = Promise.withResolvers()

  const callback1 = msg => {
    messages.push(msg)
    messages1Received.resolve()
  }

  const callback2 = msg => {
    messages.push(msg)
    messages2Received.resolve()
  }

  const rabbitmq = new RabbitMQ({ logger, generateExchange: true })
  await rabbitmq.connect()
  await rabbitmq.listen({ exchange, routingKey, queue: queue1 }, callback1)
  await rabbitmq.listen({ exchange, routingKey, queue: queue2 }, callback2)

  await publishMessage(url, exchange, 'test message')
  await Promise.all([messages1Received.promise, messages2Received.promise])

  await rabbitmq.close()

  strictEqual(messages.length, 2)
  strictEqual(messages[0].content.toString(), 'test message')
  strictEqual(messages[1].content.toString(), 'test message')
})

test('retry if the consumer throws', async t => {
  const url = 'amqp://localhost'
  const exchange = 'test-exchange-' + randomBytes(20).toString('hex')
  const routingKey = ''
  const queue = 'test-queue'

  let retry = 0
  const messages = []
  const messagesReceived = Promise.withResolvers()

  const callback = msg => {
    retry++
    if (retry < 3) {
      throw new Error('test error')
    }
    messages.push(msg)

    messagesReceived.resolve()
  }

  const rabbitmq = new RabbitMQ({ logger, generateExchange: true })
  await rabbitmq.connect()
  await rabbitmq.listen({ exchange, routingKey, queue }, callback)

  await publishMessage(url, exchange, 'test message')
  await messagesReceived.promise

  await rabbitmq.close()
  strictEqual(messages.length, 1)
  strictEqual(messages[0].content.toString(), 'test message')
})
