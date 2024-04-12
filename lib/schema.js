'use strict'

const { schema } = require('@platformatic/service')
const { version } = require('../package.json')

const rabbitmqHooksSchema = {
  ...schema.schema,
  $id: 'rabbitmq-hooks',
  title: 'Rabbitmq Hooks Config',
  version,
  properties: {
    ...schema.schema.properties,
    module: { type: 'string' },
    rabbitmq: {
      type: 'object',
      properties: {
        url: { type: 'string' },
        exchange: { type: 'string' },
        routingKey: { type: 'string' },
        targetUrl: { type: 'string' }
      },
      required: ['url', 'exchange', 'targetUrl'],
      additionalProperties: false
    }
  }
}

module.exports.schema = rabbitmqHooksSchema

if (require.main === module) {
  console.log(JSON.stringify(rabbitmqHooksSchema, null, 2))
}
