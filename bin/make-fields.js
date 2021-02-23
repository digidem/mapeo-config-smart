const fs = require('fs')
const path = require('path')
const logger = require('./logger')

const FIELDS_FOLDER = 'fields'

function makeFields (destPath, fields) {
  logger.log(`Converting fields ...`)

  // Write out each field definition
  fields.map((field) => {
    const id = field.key

    // Write the file
    const file = path.join(destPath, FIELDS_FOLDER, `${id}.json`)
    try {
      // One must not merely write a JavaScript object, so stringify first
      // Pretty print the JSON so it's easier for human review
      fs.writeFileSync(file, JSON.stringify(field, null, 2))
      logger.verbose(`Wrote field '${id}'`)
    } catch (err) {
      logger.error(`Error writing field '${id}': ${err}`)
    }
  })

  logger.ok('Converted fields')
}

module.exports = makeFields
