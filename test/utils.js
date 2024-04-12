const amqp = require('amqplib')

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
  publishMessage
}
