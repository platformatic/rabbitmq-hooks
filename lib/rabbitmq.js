const amqp = require('amqplib')

class RabbitMQ {
  #url
  #connection
  #channel
  #checkExchangeChannel
  #logger
  #generateExchange
  #consumerTag

  constructor (opts = {}) {
    const { logger, generateExchange } = opts
    this.#logger = logger
    this.#connection = null
    this.#channel = null
    this.#checkExchangeChannel = null // separate channel to check if exchange exists because the checkExchange method closes the channel
    this.#generateExchange = generateExchange
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
      const _err = new Error(`Connection failed to ${url}`)
      _err.cause = err
      throw _err
    }
    logger.info('Connected to RabbitMQ %s', url)
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

  // If `#generateExchange` is true, assert the exchanges as fanout/not durable, otherwise check if the exchange exists
  // and throws if not.
  async #checkExchange (exchange) {
    if (this.#generateExchange) {
      const channel = await this.#getChannel()
      await channel.assertExchange(exchange, 'fanout', { durable: false })
      return
    }

    const logger = this.#logger
    if (!this.#checkExchangeChannel) {
      this.#checkExchangeChannel = await this.#connection.createChannel()
    }
    this.#checkExchangeChannel.on('error', (err) => {
      logger.error({ err }, 'Failed to check exchange')
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

  async listen ({ exchange, routingKey, queue = '', durableQueue = false, exclusiveQueue = false }, consumer) {
    const logger = this.#logger
    const channel = await this.#getChannel()
    await this.#checkExchange(exchange)
    // if queue is not specified, create a queue with a random name
    const { queue: q } = await channel.assertQueue(queue, { exclusive: exclusiveQueue, durable: durableQueue })
    await channel.bindQueue(q, exchange, routingKey)
    const ret = await channel.consume(q, async (msg) => {
      try {
        await consumer(msg)
      } catch (err) {
        logger.error('Failed to consume message', err)
        channel.nack(msg)
        return
      }
      channel.ack(msg)
    }, { noAck: false })
    this.#consumerTag = ret.consumerTag
    logger.info('Registered message consumer with tag', this.#consumerTag)
  }

  async publish (exchange, message, routingKey = '') {
    await this.#checkExchange(exchange)
    const logger = this.#logger
    logger.debug('Publishing message')
    if (typeof message === 'object') {
      message = JSON.stringify(message)
    }
    message = Buffer.from(message)

    await this.#channel.publish(exchange, routingKey, message)
    logger.debug('Published message')
  }

  async close () {
    const logger = this.#logger
    logger.info('Closing RabbitMQ connection')
    if (this.#channel) {
      if (this.#consumerTag) {
        await this.#channel.cancel(this.#consumerTag)
      }
      await this.#channel.close()
    }
    if (this.#connection) {
      await this.#connection.close()
    }
    logger.info('Closed RabbitMQ connection')
  }
}

module.exports = RabbitMQ
