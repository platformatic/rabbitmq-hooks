'use strict'

const { test } = require('node:test')
const { buildServer } = require('./helper')
const { createExchange, publishMessage } = require('./helper')
const Fastify = require('fastify')
const { deepEqual } = require('node:assert/strict')

test('happy path', async (t) => {
  const url = 'amqp://localhost'
  const exchange = 'test-exchange'
  const routingKey = ''

  const messages = []
  const target = Fastify()
  target.post('/', async (request, reply) => {
    messages.push(request.body)
    return { ok: true }
  })
  t.after(() => target.close())
  await target.listen({ port: 0 })
  const targetUrl = `http://localhost:${target.server.address().port}`

  const opts = {
    url,
    exchange,
    routingKey,
    targetUrl
  }
  await createExchange(url, exchange, 'fanout', routingKey)
  await buildServer(t, opts)

  await publishMessage(url, exchange, 'test message 1')
  await publishMessage(url, exchange, 'test message 2')

  deepEqual(messages, [{ data: 'test message 1' }, { data: 'test message 2' }])
})
