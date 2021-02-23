#!/usr/bin/env node
const { program } = require('commander')
const make = require('./make')

const OUTPUT_DIR = process.cwd()

program
  .arguments('[sourceFile]')
  .description('Convert a SMART Patrol Package for mapeo-settings-builder')
  .action((sourceFile) => {
    make(sourceFile, OUTPUT_DIR)
  })

program.parse(process.argv)
