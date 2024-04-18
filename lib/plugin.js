const RabbitMQ = require('./rabbitmq')
const { request } = require('undici')

/** @param {import('fastify').FastifyInstance} app */
module.exports = async function (app, options) {
  app.log.info('Starting rabbitmq-hooks plugin')
  const { rabbitmq } = app.platformatic.config

  const { url, generateExchange, exchanges } = rabbitmq

  const rabbit = new RabbitMQ({ logger: app.log, generateExchange })
  await rabbit.connect(url)

  // create a listener for each exchange
  for (const exchange of exchanges) {
    const { name, routingKey, targetUrl } = exchange

    app.log.info(`Listening to exchange ${name}`)
    if (!routingKey) {
      app.log.info('No routing key specified')
    } else {
      app.log.info(`Routing key: ${routingKey}`)
    }
    await rabbit.listen(name, routingKey, async (msg) => {
      const message = msg?.content?.toString()
      app.log.debug('Received', message)
      try {
        await request(targetUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ data: message })
        })
      } catch (err) {
        app.log.error(err)
        throw new Error('Failed to send message to targetUrl')
      }
    })
  }
  app.decorate('rabbit', rabbit)

  app.post('/publish',
    {
      schema: {
        body: {
          type: 'object',
          properties: {
            exchange: { type: 'string' },
            routingKey: { type: 'string' },
            message: { type: 'string' }
          }
        }
      },
      handler: async (req, reply) => {
        const { exchange, routingKey, message } = req.body
        app.log.info(`Publishing to exchange ${exchange} with routing key ${routingKey}`)
        await rabbit.publish(exchange, message, routingKey)
        return { status: 'ok' }
      }
    })

  app.addHook('onClose', async function () {
    app.log.info('Closing rabbitmq-hooks plugin')
    if (!app.rabbit) return
    return app.rabbit.close()
  })
}
