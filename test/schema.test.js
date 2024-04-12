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
      exchange: { type: 'string' },
      routingKey: { type: 'string' },
      targetUrl: { type: 'string' }
    },
    required: ['url', 'exchange', 'targetUrl'],
    additionalProperties: false
  })
})
