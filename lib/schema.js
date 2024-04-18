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
        generateExchange: { type: 'boolean', default: true },
        exchanges: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              routingKey: { type: 'string' },
              targetUrl: { type: 'string' }
            },
            required: ['name', 'targetUrl'],
            additionalProperties: false
          }
        }
      },
      required: ['url', 'exchanges'],
      additionalProperties: false
    }
  }
}

module.exports.schema = rabbitmqHooksSchema

if (require.main === module) {
  console.log(JSON.stringify(rabbitmqHooksSchema, null, 2))
}
