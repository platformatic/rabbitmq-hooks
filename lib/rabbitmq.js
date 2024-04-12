const amqp = require('amqplib')

class RabbitMQ {
  #connection
  #channel
  #queue
  #url
  #exchange
  #routingKey
  #logger
  constructor ({ url, exchange, routingKey, logger }) {
    this.#connection = null
    this.#channel = null
    this.#url = url
    this.#exchange = exchange
    this.#routingKey = routingKey
    this.#logger = logger
  }

  async connect (consumer) {
    const logger = this.#logger
    try {
      this.#connection = await amqp.connect(this.#url)
      this.#channel = await this.#connection.createChannel()
      const { queue } = await this.#channel.assertQueue('', { exclusive: true })
      this.#queue = queue
      await this.#channel.bindQueue(this.#queue, this.#exchange, this.#routingKey)
    } catch (err) {
      logger.error(err)
      throw new Error(`Connection failed to ${this.#url}`)
    }
    logger.info('Connected to RabbitMQ')
    await this.#channel.consume(this.#queue, consumer)
    logger.info('Consuming messages')
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
