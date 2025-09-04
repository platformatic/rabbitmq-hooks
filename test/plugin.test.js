import Fastify from 'fastify'
import { deepEqual, strictEqual } from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { test } from 'node:test'
import { request } from 'undici'
import { createApplication, createExchange, publishMessage } from './helper.js'

test('Propagates the published messages to the target server', async t => {
  const url = 'amqp://localhost'
  const exchange = 'test-exchange'
  const routingKey = ''
  const queue = 'test-queue'
  const durableQueue = false
  const exclusiveQueue = false

  // Prepares a target server to receive messages
  const messages = []
  const messagesReceived = Promise.withResolvers()
  const target = Fastify()
  target.post('/', async (request, reply) => {
    messages.push(request.body)

    if (messages.length === 2) {
      messagesReceived.resolve()
    }

    return { ok: true }
  })
  t.after(() => target.close())
  await target.listen({ port: 0 })
  const targetUrl = `http://localhost:${target.server.address().port}`

  const exchanges = [{ name: exchange, routingKey, targetUrl, queue, durableQueue, exclusiveQueue }]
  const opts = {
    url,
    exchanges
  }
  await createExchange(url, exchange, 'fanout', routingKey, t)
  await createApplication(t, opts)

  await publishMessage(url, exchange, 'test message 1')
  await publishMessage(url, exchange, 'test message 2')
  await messagesReceived.promise

  deepEqual(messages, [{ message: 'test message 1' }, { message: 'test message 2' }])
})

test('Propagates the published messages on two exchanges to two different target URLs', async t => {
  const url = 'amqp://localhost'

  const exchange1 = 'test-exchange-1'
  const exchange2 = 'test-exchange-2'
  const routingKey = ''

  // Prepares a target server to receive messages
  const messages1 = []
  const messages2 = []
  const target = Fastify()

  const message1Receive = Promise.withResolvers()
  const message2Receive = Promise.withResolvers()

  target.post('/test1', async (request, reply) => {
    messages1.push(request.body)
    message1Receive.resolve()
    return { ok: true }
  })
  target.post('/test2', async (request, reply) => {
    messages2.push(request.body)
    message2Receive.resolve()
    return { ok: true }
  })
  t.after(() => target.close())

  await target.listen({ port: 0 })
  const targetBaseUrl = `http://localhost:${target.server.address().port}`
  const targetUrl1 = `${targetBaseUrl}/test1`
  const targetUrl2 = `${targetBaseUrl}/test2`

  const exchanges = [
    { name: exchange1, routingKey, targetUrl: targetUrl1 },
    { name: exchange2, routingKey, targetUrl: targetUrl2 }
  ]

  const opts = {
    url,
    exchanges
  }
  await createExchange(url, exchange1, 'fanout', routingKey, t)
  await createExchange(url, exchange2, 'fanout', routingKey, t)
  await createApplication(t, opts)

  await publishMessage(url, exchange1, 'test message 1')
  await message1Receive.promise
  await publishMessage(url, exchange2, 'test message 2')
  await message2Receive.promise

  deepEqual(messages1, [{ message: 'test message 1' }])
  deepEqual(messages2, [{ message: 'test message 2' }])
})

test('Propagates the published messages on two exchanges to the same target URLs', async t => {
  const url = 'amqp://localhost'

  const exchange1 = 'test-exchange-1'
  const exchange2 = 'test-exchange-2'
  const routingKey = ''

  await createExchange(url, exchange1, 'fanout', routingKey, t)
  await createExchange(url, exchange2, 'fanout', routingKey, t)

  // Prepares a target server to receive messages
  const messages = []
  const messagesReceived = Promise.withResolvers()
  const target = Fastify()
  target.post('/test', async (request, reply) => {
    messages.push(request.body)

    if (messages.length === 2) {
      messagesReceived.resolve()
    }

    return { ok: true }
  })
  t.after(() => target.close())
  await target.listen({ port: 0 })
  const targetBaseUrl = `http://localhost:${target.server.address().port}`
  const targetUrl = `${targetBaseUrl}/test`

  const exchanges = [
    { name: exchange1, routingKey, targetUrl },
    { name: exchange2, routingKey, targetUrl }
  ]

  const opts = {
    url,
    exchanges
  }
  await createApplication(t, opts)

  await publishMessage(url, exchange1, 'test message 1')
  await publishMessage(url, exchange2, 'test message 2')
  await messagesReceived.promise

  deepEqual(messages, [{ message: 'test message 1' }, { message: 'test message 2' }])
})

test('Publish using the POST /publish endpoint', async t => {
  const url = 'amqp://localhost'
  const exchange = 'test-exchange-publish22'
  const routingKey = ''

  // Prepares a target server to receive messages
  const messages = []
  const messagesReceived = Promise.withResolvers()
  const target = Fastify()
  target.post('/test', async (request, reply) => {
    messages.push(request.body)

    if (messages.length === 2) {
      messagesReceived.resolve()
    }

    return { ok: true }
  })
  t.after(() => target.close())
  await target.listen({ port: 0 })
  const targetBaseUrl = `http://127.0.0.1:${target.server.address().port}`
  const targetUrl = `${targetBaseUrl}/test`

  const exchanges = [{ name: exchange, routingKey, targetUrl }]
  const opts = {
    url,
    exchanges
  }
  await createExchange(url, exchange, 'fanout', routingKey, t)

  const server = await createApplication(t, opts)
  const serverUrl = await server.start()

  await request(serverUrl + `/publish/${exchange}`, {
    method: 'POST',
    body: Buffer.from('test message 1')
  })

  // Uses a different content type
  await request(serverUrl + `/publish/${exchange}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ test: 'test message 2' })
  })

  await messagesReceived.promise
  deepEqual(messages, [{ message: 'test message 1' }, { message: '{"test":"test message 2"}' }])
  // deepEqual(messages, [{ message: 'test message 1' }])
})

test('Publish on a non-existent exchange should fail', async t => {
  const url = 'amqp://localhost'
  const exchange = 'test-exchange-' + randomBytes(20).toString('hex')

  const opts = {
    url,
    generateExchange: false,
    exchanges: []
  }

  const server = await createApplication(t, opts)
  const serverUrl = await server.start()

  const res = await request(serverUrl + `/publish/${exchange}`, {
    method: 'POST',
    body: Buffer.from('test message 1')
  })

  strictEqual(res.statusCode, 500)
  const body = await res.body.json()
  deepEqual(body, {
    statusCode: 500,
    error: 'Internal Server Error',
    message: `Exchange ${exchange} does not exist`
  })
})

test('Propagates the published messages to the target server passing custom header and defaulting content-type to application/json', async t => {
  const url = 'amqp://localhost'
  const exchange = 'test-exchange'
  const routingKey = ''

  // Prepares a target server to receive messages
  const messages = []
  const messagesReceived = Promise.withResolvers()
  let headers = {}
  const target = Fastify()
  target.post('/', async (request, reply) => {
    headers = request.headers
    messages.push(request.body)

    if (messages.length === 2) {
      messagesReceived.resolve()
    }

    return { ok: true }
  })
  t.after(() => target.close())
  await target.listen({ port: 0 })
  const targetUrl = `http://localhost:${target.server.address().port}`

  const exchanges = [
    {
      name: exchange,
      routingKey,
      targetUrl,
      headers: {
        'My-Header': 'TEST'
      }
    }
  ]
  const opts = {
    url,
    exchanges
  }
  await createExchange(url, exchange, 'fanout', routingKey, t)
  await createApplication(t, opts)

  await publishMessage(url, exchange, 'test message 1')
  await publishMessage(url, exchange, 'test message 2')
  await messagesReceived.promise

  deepEqual(messages, [{ message: 'test message 1' }, { message: 'test message 2' }])

  deepEqual(headers['my-header'], 'TEST')
  deepEqual(headers['content-type'], 'application/json')
})

test('Propagates the published messages to the target server specifying content-type', async t => {
  const url = 'amqp://localhost'
  const exchange = 'test-exchange'
  const routingKey = ''

  // Prepares a target server to receive messages
  const messages = []
  const messagesReceived = Promise.withResolvers()
  let headers = {}
  const target = Fastify()
  target.post('/', async (request, reply) => {
    headers = request.headers
    messages.push(request.body)

    if (messages.length === 2) {
      messagesReceived.resolve()
    }

    return { ok: true }
  })
  t.after(() => target.close())
  await target.listen({ port: 0 })
  const targetUrl = `http://localhost:${target.server.address().port}`

  const exchanges = [
    {
      name: exchange,
      routingKey,
      targetUrl,
      headers: {
        'Content-Type': 'text/plain'
      }
    }
  ]
  const opts = {
    url,
    exchanges
  }
  await createExchange(url, exchange, 'fanout', routingKey, t)
  await createApplication(t, opts)

  await publishMessage(url, exchange, 'test message 1')
  await publishMessage(url, exchange, 'test message 2')
  await messagesReceived.promise

  deepEqual(headers['content-type'], 'text/plain')
  deepEqual(messages, ['{"message":"test message 1"}', '{"message":"test message 2"}'])
})
