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
    const { name, routingKey, targetUrl, headers, queue, durableQueue, exclusiveQueue } = exchange

    app.log.info(`Listening to exchange ${name}`)
    if (!routingKey) {
      app.log.info('No routing key specified')
    } else {
      app.log.info(`Routing key: ${routingKey}`)
    }

    const targetHeaders = headers || {}
    if (!targetHeaders['Content-Type'] && !targetHeaders['content-type']) {
      targetHeaders['Content-Type'] = 'application/json'
    }

    await rabbit.listen({
      exchange: name,
      routingKey,
      queue,
      durableQueue,
      exclusiveQueue
    }, async (msg) => {
      const message = msg?.content?.toString()
      try {
        await request(targetUrl, {
          method: 'POST',
          headers: targetHeaders,
          body: JSON.stringify({ message })
        })
      } catch (err) {
        app.log.error(err)
        throw new Error('Failed to send message to targetUrl')
      }
    })
  }
  app.decorate('rabbit', rabbit)

  // Let's add a catch-all content type parser so we can handle any type of payload
  app.addContentTypeParser('*', function (request, payload, done) {
    let data = ''
    payload.on('data', chunk => { data += chunk })
    payload.on('end', () => {
      done(null, data)
    })
  })

  app.post('/publish/:exchange/:routingKey?', {
    schema: {
      params: {
        type: 'object',
        properties: {
          exchange: { type: 'string' },
          routingKey: { type: 'string' }
        }
      }
    },
    handler: async (req, reply) => {
      const message = await req.body
      const { exchange, routingKey } = req.params
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
