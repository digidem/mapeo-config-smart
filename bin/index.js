#!/usr/bin/env node

const { program } = require('commander')
const unzip = require('./unzip')

program
  .arguments('[sourceFile]')
  .description('Convert a SMART Patrol Package for mapeo-settings-builder')
  .action((sourceFile) => {
    unzip(sourceFile, './_temp')
  })

program.parse(process.argv)
