'use strict'

const { platformaticService } = require('@platformatic/service')
const { buildServer } = require('@platformatic/service')
const { schema } = require('./lib/schema')
const { Generator } = require('./lib/generator')
const plugin = require('./lib/plugin')

async function stackable (fastify, opts) {
  await fastify.register(platformaticService, opts)
  await fastify.register(plugin)
}

stackable.configType = 'rabbitmq-hooks'
stackable.schema = schema
stackable.Generator = Generator

stackable.configManagerConfig = {
  schema,
  envWhitelist: ['PORT', 'HOSTNAME'],
  allowToWatch: ['.env'],
  schemaOptions: {
    useDefaults: true,
    coerceTypes: true,
    allErrors: true,
    strict: false
  },
  async transformConfig () {
    this.current.plugins ||= {}
    this.current.plugins.paths ||= []
    // this.current.plugins.paths.push(join(__dirname, 'lib', 'plugin.js'))
    return platformaticService.configManagerConfig.transformConfig.call(this)
  }
}

function _buildServer (opts) {
  return buildServer(opts, stackable)
}

// break fastify encapsulation
stackable[Symbol.for('skip-override')] = true

module.exports = stackable
module.exports.schema = schema
module.exports.Generator = Generator
module.exports.buildServer = _buildServer
