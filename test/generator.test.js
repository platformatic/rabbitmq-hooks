'use strict'

const test = require('node:test')
const assert = require('node:assert')
const { tmpdir } = require('node:os')
const { join } = require('node:path')
const { readFile, readdir, mkdtemp, rm } = require('node:fs/promises')
const { Generator } = require('../index')
const stackablePackageJson = require('../package.json')

test('should return a default Generator config', async () => {
  const generator = new Generator()
  const defaultConfig = generator.getDefaultConfig()

  assert.strictEqual(defaultConfig.hostname, '0.0.0.0')
  assert.strictEqual(defaultConfig.port, 3042)
  assert.deepEqual(defaultConfig.rabbitmq, {
    url: 'amqp://localhost',
    generateExchange: 'true',
    exchanges: [{
      name: 'my-exchange',
      routingKey: '',
      targetUrl: 'http://localhost:3042',
      queue: 'test-queue'
    }]
  })
  assert.deepStrictEqual(defaultConfig.env, {})
  assert.deepStrictEqual(defaultConfig.dependencies, {})
  assert.deepStrictEqual(defaultConfig.devDependencies, {})
})

test('should return Generator config fields definitions', async () => {
  const generator = new Generator()
  const configFieldsDefs = generator.getConfigFieldsDefinitions()

  const hostnameField = configFieldsDefs.find(
    field => field.var === 'PLT_SERVER_HOSTNAME'
  )
  assert.deepStrictEqual(hostnameField, {
    var: 'PLT_SERVER_HOSTNAME',
    label: 'What is the hostname?',
    default: '0.0.0.0',
    type: 'string',
    configValue: 'hostname'
  })

  const portField = configFieldsDefs.find(
    field => field.var === 'PORT'
  )
  assert.deepStrictEqual(portField, {
    var: 'PORT',
    label: 'Which port do you want to use?',
    default: 3042,
    type: 'number',
    configValue: 'port'
  })

  const rabbitmqUrl = configFieldsDefs.find(
    field => field.var === 'PLT_RABBITMQ_CONNECTION_URL'
  )
  assert.deepStrictEqual(rabbitmqUrl, {
    var: 'PLT_RABBITMQ_CONNECTION_URL',
    label: 'RabbitMQ URL',
    default: 'amqp://localhost',
    type: 'string'
  })

  const rabbitmqGenerateExchange = configFieldsDefs.find(
    field => field.var === 'PLT_RABBITMQ_GENERATE_EXCHANGE'
  )
  assert.deepStrictEqual(rabbitmqGenerateExchange, {
    var: 'PLT_RABBITMQ_GENERATE_EXCHANGE',
    label: 'RabbitMQ Generate Exchange',
    default: 'true',
    type: 'string'
  })

  const rabbitmqExchange = configFieldsDefs.find(
    field => field.var === 'PLT_RABBITMQ_EXCHANGE_NAME_0'
  )
  assert.deepStrictEqual(rabbitmqExchange, {
    var: 'PLT_RABBITMQ_EXCHANGE_NAME_0',
    label: 'RabbitMQ Exchange name',
    default: 'my-exchange',
    type: 'string'
  })

  const rabbitmqRoutingKey = configFieldsDefs.find(
    field => field.var === 'PLT_RABBITMQ_ROUTING_KEY_0'
  )
  assert.deepStrictEqual(rabbitmqRoutingKey, {
    var: 'PLT_RABBITMQ_ROUTING_KEY_0',
    label: 'RabbitMQ Routing Key',
    default: '',
    type: 'string'
  })

  const rabbitmqTargetUrl = configFieldsDefs.find(
    field => field.var === 'PLT_RABBITMQ_TARGET_URL_0'
  )
  assert.deepStrictEqual(rabbitmqTargetUrl, {
    var: 'PLT_RABBITMQ_TARGET_URL_0',
    label: 'RabbitMQ Target URL',
    default: 'http://localhost:3042',
    type: 'string'
  })

  const rabbitmqQueue = configFieldsDefs.find(
    field => field.var === 'PLT_RABBITMQ_TARGET_QUEUE_0'
  )
  assert.deepStrictEqual(rabbitmqQueue, {
    var: 'PLT_RABBITMQ_TARGET_QUEUE_0',
    label: 'RabbitMQ Queue name',
    default: '',
    type: 'string'
  })
})

test('should generate a stackable app', async (t) => {
  const testDir = await mkdtemp(join(tmpdir(), 'stackable-'))
  t.after(() => rm(testDir, { recursive: true, force: true }))

  const generator = new Generator()

  generator.setConfig({
    serviceName: 'stackable-app',
    targetDirectory: testDir
  })

  await generator.prepare()
  await generator.writeFiles()

  const files = await readdir(testDir)
  assert.deepStrictEqual(files.sort(), [
    '.env',
    '.env.sample',
    '.gitignore',
    'global.d.ts',
    'package.json',
    'platformatic.json'
  ])

  const packageJson = require(join(testDir, 'package.json'))
  assert.strictEqual(packageJson.name, 'stackable-app')

  const envFile = await readFile(join(testDir, '.env'), 'utf8')
  const envVars = envFile.split('\n').filter(Boolean)
  assert.deepStrictEqual(envVars.sort(), [
    'PLT_RABBITMQ_CONNECTION_URL=amqp://localhost',
    'PLT_RABBITMQ_EXCHANGE_NAME_0=my-exchange',
    'PLT_RABBITMQ_GENERATE_EXCHANGE=true',
    'PLT_RABBITMQ_TARGET_QUEUE_0=test-queue',
    'PLT_RABBITMQ_TARGET_URL_0=http://localhost:3042',
    'PLT_SERVER_HOSTNAME=0.0.0.0',
    'PLT_SERVER_LOGGER_LEVEL=info',
    'PLT_TYPESCRIPT=false',
    'PORT=3042'
  ])

  const stackableConfig = require(join(testDir, 'platformatic.json'))
  const stackableName = stackablePackageJson.name
  const stackableVersion = stackablePackageJson.version

  assert.deepEqual(stackableConfig, {
    $schema: `https://schemas.platformatic.dev/@platformatic/rabbitmq-hooks/${stackablePackageJson.version}.json`,
    module: `${stackableName}@${stackableVersion}`,
    server: {
      hostname: '{PLT_SERVER_HOSTNAME}',
      port: '{PORT}',
      logger: {
        level: '{PLT_SERVER_LOGGER_LEVEL}'
      }
    },
    service: {
      openapi: true
    },
    rabbitmq: {
      url: '{PLT_RABBITMQ_CONNECTION_URL}',
      generateExchange: '{PLT_RABBITMQ_GENERATE_EXCHANGE}',
      exchanges: [{
        name: '{PLT_RABBITMQ_EXCHANGE_NAME_0}',
        targetUrl: '{PLT_RABBITMQ_TARGET_URL_0}',
        queue: '{PLT_RABBITMQ_TARGET_QUEUE_0}'
      }]
    },
    watch: true
  })
})
