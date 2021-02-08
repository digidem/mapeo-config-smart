const chalk = require('chalk')
const winston = require('winston')

// Rationale: implementation similar to
// https://github.com/digidem/mapeo-settings-builder/blob/master/scripts/log.js
// but doesn't overwrite native console methods

// API:
// logger.info() - logs OK (with green color)
// logger.ok() - alias for logger.info()
// logger.warn() - logs warning (with yellow color)
// logger.error() - logs error (with red color)
// logger.verbose() - logs extra info (gray)
// logger.log() - alias for logger.verbose()

// By default, only warnings, errors, and info logs are output to console
// but you can change this by setting the environment variable DEBUG=true
// to also include verbose messages.

const isWin = process.platform === 'win32'
const symbols = {
  info: chalk.green(isWin ? '\u221A' : '✓'),
  error: isWin ? '\u00D7' : '✖',
  warn: '!',
  verbose: '◦'
}
const color = {
  info: 'green',
  error: 'red',
  warn: 'yellow',
  verbose: 'gray'
}
const formatter = winston.format.printf(({ level, message }) => {
  return chalk[color[level]]`${symbols[level]} ${message}`
})

const logger = winston.createLogger({
  level: process.env.DEBUG === 'true' ? 'verbose' : 'info',
  format: formatter,
  transports: [
    new winston.transports.Console()
  ]
})

// Create some aliases
logger.ok = logger.info
logger.log = logger.verbose

module.exports = logger
