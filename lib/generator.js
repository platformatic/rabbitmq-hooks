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
        exchanges: [{
          name: 'my-exchange',
          routingKey: '',
          targetUrl: 'http://localhost:3042'
        }]
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
        var: 'RABBITMQ_EXCHANGE_NAME_0',
        label: 'RabbitMQ Exchange name',
        default: 'my-exchange',
        type: 'string'
      }, {
        var: 'RABBITMQ_ROUTING_KEY_0',
        label: 'RabbitMQ Routing Key',
        default: '',
        type: 'string'
      }, {
        var: 'RABBITMQ_TARGET_URL_0',
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
        exchanges: [{
          name: `{${this.getEnvVarName('RABBITMQ_EXCHANGE_NAME_0')}}`,
          routingKey: `{${this.getEnvVarName('RABBITMQ_ROUTING_KEY_0')}}`,
          targetUrl: `{${this.getEnvVarName('RABBITMQ_TARGET_URL_0')}}`
        }]
      }
    }
    return Object.assign({}, baseConfig, config)
  }

  async _beforePrepare () {
    super._beforePrepare()

    this.addEnvVars({
      RABBITMQ_URL: this.config.rabbitmq.url,
      RABBITMQ_EXCHANGE_NAME_0: this.config.rabbitmq.exchanges[0].name,
      RABBITMQ_ROUTING_KEY_0: this.config.rabbitmq.exchanges[0].routingKey,
      RABBITMQ_TARGET_URL_0: this.config.rabbitmq.exchanges[0].targetUrl
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
