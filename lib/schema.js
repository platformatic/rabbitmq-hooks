import { schema as serviceSchema } from '@platformatic/service'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

export const packageJson = JSON.parse(readFileSync(resolve(import.meta.dirname, '../package.json'), 'utf-8'))
export const version = packageJson.version

export const rabbitmq = {
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
}

export const schemaComponents = {
  rabbitmq
}

export const schema = structuredClone(serviceSchema)

schema.$id = `https://schemas.platformatic.dev/@platformatic/rabbitmq-hooks/${packageJson.version}.json`
schema.title = 'Platformatic rabbitmq-hooks configuration'
schema.version = packageJson.version
schema.properties.rabbitmq = rabbitmq
delete schema.properties.migrations
delete schema.properties.types
