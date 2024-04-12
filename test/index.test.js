'use strict'

const test = require('node:test')
const assert = require('node:assert')
const stackable = require('../index')
const { schema } = require('../lib/schema')
const { Generator } = require('../lib/generator')

test('should export stackable interface', async () => {
  assert.strictEqual(typeof stackable, 'function')
  assert.strictEqual(stackable.configType, 'rabbitmq-hooks')
  assert.deepStrictEqual(stackable.schema, schema)
  assert.deepStrictEqual(stackable.Generator, Generator)
  assert.ok(stackable.configManagerConfig)
  assert.ok(typeof stackable.transformConfig, 'function')
})
