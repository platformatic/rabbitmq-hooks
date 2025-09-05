import { create as createService, platformaticService } from '@platformatic/service'
import fp from 'fastify-plugin'
import { plugin } from './lib/plugin.js'
import { schema } from './lib/schema.js'

export async function rabbitmqHooks (app, capability) {
  await platformaticService(app, capability)
  await app.register(plugin, capability)
}

export async function create (configOrRoot, sourceOrConfig, context) {
  return createService(configOrRoot, sourceOrConfig, { schema, applicationFactory: fp(rabbitmqHooks), ...context })
}

export { Generator } from './lib/generator.js'
export { packageJson, schema, schemaComponents, version } from './lib/schema.js'
