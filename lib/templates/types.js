'use strict'

function generateGlobalTypesFile (npmPackageName) {
  return `import { FastifyInstance } from 'fastify'
import { RabbitmqHooksConfig, PlatformaticApp } from '${npmPackageName}'
  
declare module 'fastify' {
  interface FastifyInstance {
    platformatic: PlatformaticApp<RabbitmqHooksConfig>
  }
}
`
}

module.exports = {
  generateGlobalTypesFile
}
