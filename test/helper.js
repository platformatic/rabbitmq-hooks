'use strict'

const { join } = require('node:path')
const amqp = require('amqplib')
const rabbitHook = require('..')

async function getConfig (opts) {
  const { url, exchange, routingKey, targetUrl } = opts || {
    url: 'amqp://localhost',
    exchange: 'test-exchange',
    routingKey: '',
    targetUrl: 'http://localhost:3042'
  }
  const config = {}
  config.module = join(__dirname, '..')
  config.server = {
    port: 0,
    logger: { level: 'error' }
  }
  config.rabbitmq = {
    url,
    exchange,
    routingKey,
    targetUrl
  }
  return { config }
}

async function buildServer (t, opts) {
  const { config } = await getConfig(opts)
  const server = await rabbitHook.buildServer(config)
  t.after(() => server.close())
  return server
}

const createExchange = async (url, exchange, type = 'fanout') => {
  let connection = null
  let channel = null

  try {
    connection = await amqp.connect(url)
    channel = await connection.createChannel()
    await channel.assertExchange(exchange, type, { durable: false })
  } catch (err) {
    console.log(err)
    throw new Error(`Connection failed to ${url}`)
  } finally {
    if (channel) {
      await channel.close()
    }
    if (connection) {
      await connection.close()
    }
  }
}

const publishMessage = async (url, exchange, message) => {
  let connection = null
  let channel = null

  try {
    connection = await amqp.connect(url)
    channel = await connection.createChannel()
    await channel.publish(exchange, '', Buffer.from(message))
  } catch (err) {
    console.log(err)
    throw new Error(`Connection failed to ${url}`)
  } finally {
    if (channel) {
      await channel.close()
    }
    if (connection) {
      await connection.close()
    }
  }
}

module.exports = {
  createExchange,
  publishMessage,
  buildServer
}
