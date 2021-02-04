#!/usr/bin/env node

const { program } = require('commander')
const unzip = require('./unzip')

const TEMPORARY_DIR = '_temp'

program
  .arguments('[sourceFile]')
  .description('Convert a SMART Patrol Package for mapeo-settings-builder')
  .action((sourceFile) => {
    unzip(sourceFile, TEMPORARY_DIR)

    // convert files
    // clean output folder
    // copy to folder structure + make files
  })

program.parse(process.argv)
