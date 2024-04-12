'use strict'

const { join } = require('node:path')
const { readFile } = require('node:fs/promises')
const { Generator: ServiceGenerator } = require('@platformatic/service')
const { schema } = require('./schema')
const { generateGlobalTypesFile } = require('./templates/types')

class RabbitmqHooksGenerator extends ServiceGenerator {
  getDefaultConfig () {
    const defaultBaseConfig = super.getDefaultConfig()
    const defaultConfig = {
      rabbitmq: {
        url: 'amqp://localhost',
        exchange: 'my-exchange',
        routingKey: '',
        targetUrl: 'http://localhost:3042'
      }
    }
    return Object.assign({}, defaultBaseConfig, defaultConfig)
  }

  getConfigFieldsDefinitions () {
    const serviceConfigFieldsDefs = super.getConfigFieldsDefinitions()
    return [
      ...serviceConfigFieldsDefs,
      {
        var: 'RABBITMQ_URL',
        label: 'RabbitMQ URL',
        default: 'amqp://localhost',
        type: 'string'
      }, {
        var: 'RABBITMQ_EXCHANGE',
        label: 'RabbitMQ Exchange',
        default: 'my-exchange',
        type: 'string'
      }, {
        var: 'RABBITMQ_ROUTING_KEY',
        label: 'RabbitMQ Routing Key',
        default: '',
        type: 'string'
      }, {
        var: 'RABBITMQ_TARGET_URL',
        label: 'RabbitMQ Target URL',
        default: 'http://localhost:3042',
        type: 'string'
      }
    ]
  }

  async _getConfigFileContents () {
    const baseConfig = await super._getConfigFileContents()
    const packageJson = await this.getStackablePackageJson()
    const config = {
      $schema: './stackable.schema.json',
      module: `${packageJson.name}@${packageJson.version}`,
      rabbitmq: {
        url: `{${this.getEnvVarName('RABBITMQ_URL')}}`,
        exchange: `{${this.getEnvVarName('RABBITMQ_EXCHANGE')}}`,
        routingKey: `{${this.getEnvVarName('RABBITMQ_ROUTING_KEY')}}`,
        targetUrl: `{${this.getEnvVarName('RABBITMQ_TARGET_URL')}}`
      }
    }
    return Object.assign({}, baseConfig, config)
  }

  async _beforePrepare () {
    super._beforePrepare()

    this.addEnvVars({
      RABBITMQ_URL: this.config.rabbitmq.url,
      RABBITMQ_EXCHANGE: this.config.rabbitmq.exchange,
      RABBITMQ_ROUTING_KEY: this.config.rabbitmq.routingKey,
      RABBITMQ_TARGET_URL: this.config.rabbitmq.targetUrl
    }, { overwrite: false })

    const packageJson = await this.getStackablePackageJson()

    this.config.dependencies = {
      [packageJson.name]: `^${packageJson.version}`
    }
  }

  async _afterPrepare () {
    const packageJson = await this.getStackablePackageJson()
    this.addFile({
      path: '',
      file: 'global.d.ts',
      contents: generateGlobalTypesFile(packageJson.name)
    })

    this.addFile({
      path: '',
      file: 'stackable.schema.json',
      contents: JSON.stringify(schema, null, 2)
    })
  }

  async getStackablePackageJson () {
    if (!this._packageJson) {
      const packageJsonPath = join(__dirname, '..', 'package.json')
      const packageJsonFile = await readFile(packageJsonPath, 'utf8')
      const packageJson = JSON.parse(packageJsonFile)

      if (!packageJson.name) {
        throw new Error('Missing package name in package.json')
      }

      if (!packageJson.version) {
        throw new Error('Missing package version in package.json')
      }

      this._packageJson = packageJson
      return packageJson
    }
    return this._packageJson
  }
}

module.exports = RabbitmqHooksGenerator
module.exports.Generator = RabbitmqHooksGenerator
