#!/usr/bin/env node
'use strict'

const { join } = require('node:path')
const { parseArgs } = require('node:util')
const { Generator } = require('../lib/generator')

async function execute () {
  const args = parseArgs({
    args: process.argv.slice(2),
    options: {
      dir: {
        type: 'string',
        default: join(process.cwd(), 'rabbitmq-hooks-app')
      },
      port: { type: 'string', default: '3042' },
      hostname: { type: 'string', default: '0.0.0.0' },
      plugin: { type: 'boolean', default: true },
      tests: { type: 'boolean', default: true },
      typescript: { type: 'boolean', default: false },
      git: { type: 'boolean', default: false },
      install: { type: 'boolean', default: true }
    }
  })

  const generator = new Generator()

  generator.setConfig({
    port: parseInt(args.values.port),
    hostname: args.values.hostname,
    plugin: args.values.plugin,
    tests: args.values.tests,
    typescript: args.values.typescript,
    initGitRepository: args.values.git,
    targetDirectory: args.values.dir
  })

  await generator.run()

  console.log('Application created successfully! Run `npm run start` to start an application.')
}

execute()
