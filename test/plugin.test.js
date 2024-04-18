'use strict'

const { test } = require('node:test')
const { createExchange, publishMessage, sleep, buildServer } = require('./helper')
const Fastify = require('fastify')
const { deepEqual, strictEqual } = require('node:assert/strict')
const { request } = require('undici')
const crypto = require('node:crypto')

test('Propagates the published messages to the target server', async (t) => {
  const url = 'amqp://localhost'
  const exchange = 'test-exchange'
  const routingKey = ''

  // Prepares a target server to receive messages
  const messages = []
  const target = Fastify()
  target.post('/', async (request, reply) => {
    messages.push(request.body)
    return { ok: true }
  })
  t.after(() => target.close())
  await target.listen({ port: 0 })
  const targetUrl = `http://localhost:${target.server.address().port}`

  const exchanges = [{ name: exchange, routingKey, targetUrl }]
  const opts = {
    url,
    exchanges
  }
  await createExchange(url, exchange, 'fanout', routingKey)
  await buildServer(t, opts)

  await publishMessage(url, exchange, 'test message 1')
  await sleep(200)
  await publishMessage(url, exchange, 'test message 2')

  deepEqual(messages, [{ message: 'test message 1' }, { message: 'test message 2' }])
})

test('Propagates the published messages on two exchanges to two different target URLs', async (t) => {
  const url = 'amqp://localhost'

  const exchange1 = 'test-exchange-1'
  const exchange2 = 'test-exchange-2'
  const routingKey = ''

  // Prepares a target server to receive messages
  const messages1 = []
  const messages2 = []
  const target = Fastify()
  target.post('/test1', async (request, reply) => {
    messages1.push(request.body)
    return { ok: true }
  })
  target.post('/test2', async (request, reply) => {
    messages2.push(request.body)
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
  await createExchange(url, exchange1, 'fanout', routingKey)
  await createExchange(url, exchange2, 'fanout', routingKey)
  await buildServer(t, opts)

  await publishMessage(url, exchange1, 'test message 1')
  await sleep(200)
  await publishMessage(url, exchange2, 'test message 2')

  deepEqual(messages1, [{ message: 'test message 1' }])
  deepEqual(messages2, [{ message: 'test message 2' }])
})

test('Propagates the published messages on two exchanges to the same target URLs', async (t) => {
  const url = 'amqp://localhost'

  const exchange1 = 'test-exchange-1'
  const exchange2 = 'test-exchange-2'
  const routingKey = ''

  await createExchange(url, exchange1, 'fanout', routingKey)
  await createExchange(url, exchange2, 'fanout', routingKey)

  // Prepares a target server to receive messages
  const messages = []
  const target = Fastify()
  target.post('/test', async (request, reply) => {
    messages.push(request.body)
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
  await buildServer(t, opts)

  await publishMessage(url, exchange1, 'test message 1')
  await sleep(200)
  await publishMessage(url, exchange2, 'test message 2')

  deepEqual(messages, [{ message: 'test message 1' }, { message: 'test message 2' }])
})

test('Publish using the POST /publish endpoint', async (t) => {
  const url = 'amqp://localhost'
  const exchange = 'test-exchange-publish22'
  const routingKey = ''

  // Prepares a target server to receive messages
  const messages = []
  const target = Fastify()
  target.post('/test', async (request, reply) => {
    messages.push(request.body)
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
  await createExchange(url, exchange, 'fanout', routingKey)

  const server = await buildServer(t, opts)
  await server.listen(13042)

  await request(`http://localhost:13042/publish/${exchange}`, {
    method: 'POST',
    body: Buffer.from('test message 1')
  })

  await sleep(200)

  // Uses a different content type
  await request(`http://localhost:13042/publish/${exchange}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ test: 'test message 2' })
  })

  await sleep(200)
  deepEqual(messages, [{ message: 'test message 1' }, { message: '{"test":"test message 2"}' }])
  // deepEqual(messages, [{ message: 'test message 1' }])
})

test('Publish on a non-existent exchange should fail', async (t) => {
  const url = 'amqp://localhost'
  const exchange = 'test-exchange-' + crypto.randomBytes(20).toString('hex')

  const opts = {
    url,
    generateExchange: false,
    exchanges: []
  }

  const server = await buildServer(t, opts)
  await server.listen(13042)

  const res = await request(`http://localhost:13042/publish/${exchange}`, {
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
