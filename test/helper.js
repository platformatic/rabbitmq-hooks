import { connect } from 'amqplib'
import { create } from '../index.js'

export async function getConfig (opts) {}

export async function createApplication (t, opts) {
  const { url, exchanges, generateExchange } = opts || {
    url: 'amqp://localhost',
    generateExchange: 'true',
    exchanges: [
      {
        name: 'test-exchange',
        routingKey: '',
        targetUrl: 'http://localhost:3042'
      }
    ]
  }

  const server = await create(import.meta.dirname, {
    server: {
      port: 0,
      logger: { level: 'silent' }
    },
    rabbitmq: {
      url,
      generateExchange,
      exchanges
    }
  })

  t.after(() => server.close())

  await server.init()
  return server
}

export async function createExchange (url, exchange, type = 'fanout', t) {
  let connection = null
  let channel = null

  try {
    connection = await connect(url)
    channel = await connection.createChannel()
    await channel.assertExchange(exchange, type, { durable: false })
    channel.on('error', err => {
      console.log(err)
    })
  } finally {
    if (connection) {
      await connection.close()
    }
  }

  if (!t) {
    return
  }

  t.after(async () => {
    // cleanup
    let connection
    let channel
    try {
      connection = await connect(url)
      channel = await connection.createChannel()
      await channel.deleteExchange(exchange)
    } finally {
      if (connection) {
        await connection.close()
      }
    }
  })
}

export async function publishMessage (url, exchange, message) {
  let connection = null
  let channel = null

  try {
    connection = await connect(url)
    channel = await connection.createChannel()
    await channel.publish(exchange, '', Buffer.from(message), { expiration: 1000 })
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
