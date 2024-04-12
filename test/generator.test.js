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
    exchange: 'my-exchange',
    routingKey: '',
    targetUrl: 'http://localhost:3042'
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
    field => field.var === 'RABBITMQ_URL'
  )
  assert.deepStrictEqual(rabbitmqUrl, {
    var: 'RABBITMQ_URL',
    label: 'RabbitMQ URL',
    default: 'amqp://localhost',
    type: 'string'
  })

  const rabbitmqExchange = configFieldsDefs.find(
    field => field.var === 'RABBITMQ_EXCHANGE'
  )
  assert.deepStrictEqual(rabbitmqExchange, {
    var: 'RABBITMQ_EXCHANGE',
    label: 'RabbitMQ Exchange',
    default: 'my-exchange',
    type: 'string'
  })

  const rabbitmqRoutingKey = configFieldsDefs.find(
    field => field.var === 'RABBITMQ_ROUTING_KEY'
  )
  assert.deepStrictEqual(rabbitmqRoutingKey, {
    var: 'RABBITMQ_ROUTING_KEY',
    label: 'RabbitMQ Routing Key',
    default: '',
    type: 'string'
  })

  const rabbitmqTargetUrl = configFieldsDefs.find(
    field => field.var === 'RABBITMQ_TARGET_URL'
  )
  assert.deepStrictEqual(rabbitmqTargetUrl, {
    var: 'RABBITMQ_TARGET_URL',
    label: 'RabbitMQ Target URL',
    default: 'http://localhost:3042',
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
    'platformatic.json',
    'stackable.schema.json'
  ])

  const packageJson = require(join(testDir, 'package.json'))
  assert.strictEqual(packageJson.name, 'stackable-app')

  const envFile = await readFile(join(testDir, '.env'), 'utf8')
  const envVars = envFile.split('\n').filter(Boolean)
  assert.deepStrictEqual(envVars.sort(), [
    'PLT_SERVER_HOSTNAME=0.0.0.0',
    'PLT_SERVER_LOGGER_LEVEL=info',
    'PLT_TYPESCRIPT=false',
    'PORT=3042',
    'RABBITMQ_EXCHANGE=my-exchange',
    'RABBITMQ_ROUTING_KEY=',
    'RABBITMQ_TARGET_URL=http://localhost:3042',
    'RABBITMQ_URL=amqp://localhost'
  ])

  const stackableConfig = require(join(testDir, 'platformatic.json'))
  const stackableName = stackablePackageJson.name
  const stackableVersion = stackablePackageJson.version

  assert.deepEqual(stackableConfig, {
    $schema: './stackable.schema.json',
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
      exchange: '{RABBITMQ_EXCHANGE}',
      routingKey: '{RABBITMQ_ROUTING_KEY}',
      url: '{RABBITMQ_URL}',
      targetUrl: '{RABBITMQ_TARGET_URL}'
    },
    watch: true
  })
})
