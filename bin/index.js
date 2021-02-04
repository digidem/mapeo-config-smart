#!/usr/bin/env node
const { program } = require('commander')
const make = require('./make')

const TEMPORARY_DIR = '_temp'

program
  .arguments('[sourceFile]')
  .description('Convert a SMART Patrol Package for mapeo-settings-builder')
  .action((sourceFile) => {
    make(sourceFile, TEMPORARY_DIR)
  })

program.parse(process.argv)
