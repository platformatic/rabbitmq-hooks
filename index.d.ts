import { FastifyInstance } from 'fastify'
import { PlatformaticApp } from '@platformatic/service'
import { RabbitmqHooksConfig } from './config'

declare module 'fastify' {
  interface FastifyInstance {
    platformatic: PlatformaticApp<RabbitmqHooksConfig>
  }
}

export { PlatformaticApp, RabbitmqHooksConfig }
