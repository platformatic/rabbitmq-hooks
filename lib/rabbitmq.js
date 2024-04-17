const amqp = require('amqplib')

class RabbitMQ {
  #url
  #connection
  #channel
  #checkExchangeChannel
  #logger
  constructor (opts = {}) {
    const { logger } = opts
    this.#logger = logger
    this.#connection = null
    this.#channel = null
    this.#checkExchangeChannel = null // separate channel to check if exchange exists because the checkExchange method closes the channel
  }

  async connect (url) {
    const logger = this.#logger
    if (this.#connection) {
      this.#logger.warn('Connection already established, reopening')
      this.#connection.close()
      this.#connection = null
      this.#channel = null
      this.#checkExchangeChannel = null
    }
    try {
      this.#connection = await amqp.connect(url)
    } catch (err) {
      throw new Error(`Connection failed to ${url}`)
    }
    logger.info('Connected to RabbitMQ', url)
  }

  async #getChannel () {
    const logger = this.#logger
    if (!this.#connection) {
      logger.warn('Connection not established')
      await this.connect()
    }

    if (this.#channel) {
      return this.#channel
    }

    const channel = await this.#connection.createChannel()
    this.#channel = channel
    return channel
  }

  async #checkExchange (exchange) {
    const logger = this.#logger
    if (!this.#checkExchangeChannel) {
      this.#checkExchangeChannel = await this.#connection.createChannel()
    }
    this.#checkExchangeChannel.on('error', (err) => {
      logger.error('Failed to check exchange', err)
    })
    try {
      await this.#checkExchangeChannel.checkExchange(exchange)
    } catch (err) {
      logger.error('The exchange does not exists', exchange)
      this.#checkExchangeChannel = null // the channel is now invalid
      if (err.code === 404) {
        throw new Error(`Exchange ${exchange} does not exist`, err)
      }
      throw err
    }
  }

  async listen (exchange, routingKey, consumer) {
    const logger = this.#logger
    const channel = await this.#getChannel()
    await this.#checkExchange(exchange)
    const { queue } = await channel.assertQueue('', { exclusive: true })
    await channel.bindQueue(queue, exchange, routingKey)
    await channel.consume(queue, async (msg) => {
      try {
        await consumer(msg)
      } catch (err) {
        logger.error('Failed to consume message', err)
        channel.nack(msg)
      }
      channel.ack(msg)
    }, { noAck: false })
    logger.info('Registered message consumer')
  }

  async publish (exchange, message, routingKey = '') {
    await this.#checkExchange(exchange)
    const logger = this.#logger
    console.log(message, 'Publishing message')
    logger.info(message, 'Publishing message')
    await this.#channel.publish(exchange, routingKey, Buffer.from(message))
    logger.debug(message, 'Published message')
  }

  async close () {
    const logger = this.#logger
    logger.info('Closing RabbitMQ connection')
    if (this.#channel) {
      await this.#channel.close()
    }
    if (this.#connection) {
      await this.#connection.close()
    }
    logger.info('Closed RabbitMQ connection')
  }
}

module.exports = RabbitMQ
