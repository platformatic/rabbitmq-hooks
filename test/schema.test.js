'use strict'

const test = require('node:test')
const assert = require('node:assert')
const { schema } = require('../index')

test('should export stackable schema', async () => {
  assert.strictEqual(schema.$id, 'rabbitmq-hooks')
  assert.strictEqual(typeof schema.version, 'string')

  assert.deepStrictEqual(schema.properties.rabbitmq, {
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
