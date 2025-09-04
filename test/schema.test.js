import { deepStrictEqual, strictEqual } from 'node:assert'
import test from 'node:test'
import { schema, version } from '../lib/schema.js'

test('should export stackable schema', async () => {
  strictEqual(schema.$id, `https://schemas.platformatic.dev/@platformatic/rabbitmq-hooks/${version}.json`)
  strictEqual(typeof schema.version, 'string')

  deepStrictEqual(schema.properties.rabbitmq, {
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
            targetUrl: { type: 'string' },
            headers: {
              type: 'object',
              additionalProperties: { type: 'string' }
            },
            queue: { type: 'string' },
            durableQueue: { type: 'boolean', default: false },
            exclusiveQueue: { type: 'boolean', default: false }
          },
          required: ['name', 'targetUrl'],
          additionalProperties: false
        }
      }
    },
    required: ['url', 'exchanges'],
    additionalProperties: false
  })
})
