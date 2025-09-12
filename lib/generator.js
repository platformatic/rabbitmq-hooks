import { Generator as ServiceGenerator } from '@platformatic/service'
import { packageJson } from './schema.js'

class RabbitmqHooksGenerator extends ServiceGenerator {
  getDefaultConfig () {
    const defaultBaseConfig = super.getDefaultConfig()
    const defaultConfig = {
      rabbitmq: {
        url: 'amqp://localhost',
        generateExchange: 'true',
        exchanges: [
          {
            name: 'my-exchange',
            routingKey: '',
            targetUrl: 'http://localhost:3042',
            queue: 'test-queue'
          }
        ]
      }
    }
    return Object.assign({}, defaultBaseConfig, defaultConfig, {
      skipTypescript: true,
      tests: false,
      plugin: false
    })
  }

  getConfigFieldsDefinitions () {
    const serviceConfigFieldsDefs = super.getConfigFieldsDefinitions()
    return [
      ...serviceConfigFieldsDefs,
      {
        var: 'PLT_RABBITMQ_CONNECTION_URL',
        label: 'RabbitMQ URL',
        default: 'amqp://localhost',
        type: 'string'
      },
      {
        var: 'PLT_RABBITMQ_GENERATE_EXCHANGE',
        label: 'RabbitMQ Generate Exchange',
        default: 'true',
        type: 'string'
      },
      {
        var: 'PLT_RABBITMQ_EXCHANGE_NAME_0',
        label: 'RabbitMQ Exchange name',
        default: 'my-exchange',
        type: 'string'
      },
      {
        var: 'PLT_RABBITMQ_ROUTING_KEY_0',
        label: 'RabbitMQ Routing Key',
        default: '',
        type: 'string'
      },
      {
        var: 'PLT_RABBITMQ_TARGET_URL_0',
        label: 'RabbitMQ Target URL',
        default: 'http://localhost:3042',
        type: 'string'
      },
      {
        var: 'PLT_RABBITMQ_TARGET_QUEUE_0',
        label: 'RabbitMQ Queue name',
        default: '',
        type: 'string'
      }
    ]
  }

  async _getConfigFileContents () {
    const baseConfig = await super._getConfigFileContents()

    const config = {
      $schema: `https://schemas.platformatic.dev/@platformatic/rabbitmq-hooks/${packageJson.version}.json`,
      module: packageJson.name,
      rabbitmq: {
        url: `{${this.getEnvVarName('PLT_RABBITMQ_CONNECTION_URL')}}`,
        generateExchange: `{${this.getEnvVarName('PLT_RABBITMQ_GENERATE_EXCHANGE')}}`,
        exchanges: [
          {
            name: `{${this.getEnvVarName('PLT_RABBITMQ_EXCHANGE_NAME_0')}}`,
            targetUrl: `{${this.getEnvVarName('PLT_RABBITMQ_TARGET_URL_0')}}`,
            queue: `{${this.getEnvVarName('PLT_RABBITMQ_TARGET_QUEUE_0')}}`
          }
        ]
      }
    }
    return Object.assign({}, baseConfig, config)
  }

  async _beforePrepare () {
    super._beforePrepare()

    this.addEnvVars(
      {
        PLT_RABBITMQ_CONNECTION_URL: this.config.rabbitmq.url,
        PLT_RABBITMQ_GENERATE_EXCHANGE: this.config.rabbitmq.generateExchange,
        PLT_RABBITMQ_EXCHANGE_NAME_0: this.config.rabbitmq.exchanges[0].name,
        PLT_RABBITMQ_TARGET_URL_0: this.config.rabbitmq.exchanges[0].targetUrl,
        PLT_RABBITMQ_TARGET_QUEUE_0: this.config.rabbitmq.exchanges[0].queue
      },
      { overwrite: false }
    )

    this.config.dependencies = {
      [packageJson.name]: `^${packageJson.version}`
    }
  }
}

export default RabbitmqHooksGenerator
export const Generator = RabbitmqHooksGenerator
