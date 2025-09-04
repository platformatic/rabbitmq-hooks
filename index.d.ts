import { BaseCapability } from '@platformatic/basic'
import { ConfigurationOptions } from '@platformatic/foundation'
import { BaseGenerator } from '@platformatic/generators'
import { ServiceCapability, ServerInstance as ServiceServerInstance } from '@platformatic/service'
import { JSONSchemaType } from 'ajv'
import { FastifyInstance } from 'fastify'
import { PlatformaticRabbitmqHooksConfiguration } from './config'

export { PlatformaticRabbitmqHooksConfiguration } from './config'

export type RabbitmqHooksCapability = ServiceCapability<PlatformaticRabbitmqHooksConfiguration>

export type ServerInstance = ServiceServerInstance<PlatformaticRabbitmqHooksConfiguration>

export function create (
  root: string,
  source?: string | PlatformaticRabbitmqHooksConfiguration,
  context?: ConfigurationOptions
): Promise<RabbitmqHooksCapability>

export declare function RabbitmqHooks (app: FastifyInstance, capability: BaseCapability): Promise<void>

export class Generator extends BaseGenerator.BaseGenerator {}

export declare const packageJson: Record<string, unknown>

export declare const schema: JSONSchemaType<PlatformaticRabbitmqHooksConfiguration>

export declare const schemaComponents: {
  hooks: JSONSchemaType<object>
}

export declare const version: string
