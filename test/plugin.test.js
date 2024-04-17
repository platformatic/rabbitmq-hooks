'use strict'

const { test } = require('node:test')
const { buildServer } = require('./helper')
const { createExchange, publishMessage, sleep } = require('./helper')
const Fastify = require('fastify')
const { deepEqual } = require('node:assert/strict')

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
  const deleteExchange = await createExchange(url, exchange, 'fanout', routingKey)
  t.after(deleteExchange)
  await buildServer(t, opts)

  await publishMessage(url, exchange, 'test message 1')
  await sleep(200)
  await publishMessage(url, exchange, 'test message 2')

  deepEqual(messages, [{ data: 'test message 1' }, { data: 'test message 2' }])
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
  const delete1 = await createExchange(url, exchange1, 'fanout', routingKey)
  t.after(delete1)
  const delete2 = await createExchange(url, exchange2, 'fanout', routingKey)
  t.after(delete2)
  await buildServer(t, opts)

  await publishMessage(url, exchange1, 'test message 1')
  await sleep(200)
  await publishMessage(url, exchange2, 'test message 2')

  deepEqual(messages1, [{ data: 'test message 1' }])
  deepEqual(messages2, [{ data: 'test message 2' }])
})

test('Propagates the published messages on two exchanges to the same target URLs', async (t) => {
  const url = 'amqp://localhost'

  const exchange1 = 'test-exchange-1'
  const exchange2 = 'test-exchange-2'
  const routingKey = ''

  const delete1 = await createExchange(url, exchange1, 'fanout', routingKey)
  t.after(delete1)
  const delete2 = await createExchange(url, exchange2, 'fanout', routingKey)
  t.after(delete2)

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

  deepEqual(messages, [{ data: 'test message 1' }, { data: 'test message 2' }])
})
