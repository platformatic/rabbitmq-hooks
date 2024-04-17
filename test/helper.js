'use strict'

const { join } = require('node:path')
const amqp = require('amqplib')
const rabbitHook = require('..')

async function getConfig (opts) {
  const { url, exchanges } = opts || {
    url: 'amqp://localhost',
    exchanges: [{
      name: 'test-exchange',
      routingKey: '',
      targetUrl: 'http://localhost:3042'
    }]
  }
  const config = {}
  config.module = join(__dirname, '..')
  config.server = {
    port: 0,
    logger: { level: 'error' }
  }
  config.rabbitmq = {
    url,
    exchanges
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
    channel.on('error', err => {
      console.log('ERR2', err)
    })
  } finally {
    if (connection) {
      await connection.close()
    }
  }
  // return the cleanup
  return async () => {
    let connection
    let channel
    try {
      connection = await amqp.connect(url)
      channel = await connection.createChannel()
      channel.deleteExchange(exchange)
    } finally {
      if (connection) {
        await connection.close()
      }
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

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

module.exports = {
  createExchange,
  publishMessage,
  buildServer,
  sleep
}
