const RabbitMQ = require('./rabbitmq')
const { request } = require('undici')

/** @param {import('fastify').FastifyInstance} app */
module.exports = async function (app, options) {
  app.log.info('Starting rabbitmq-hooks plugin')
  const { rabbitmq } = app.platformatic.config

  const { url, exchange, routingKey, targetUrl } = rabbitmq

  const rabbit = new RabbitMQ({ url, exchange, routingKey, logger: app.log })
  app.log.info('Connecting to RabbitMQ')
  await rabbit.connect(async (msg) => {
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

  app.decorate('rabbit', rabbit)

  app.addHook('onClose', async function () {
    app.log.info('Closing rabbitmq-hooks plugin')
    if (!app.rabbit) return
    return app.rabbit.close()
  })
}
