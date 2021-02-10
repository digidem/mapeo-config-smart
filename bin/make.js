const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const mkdirp = require('mkdirp')
const unzip = require('./unzip')
const parseXml = require('./parse-xml')
const logger = require('./logger')
const makeDefaultsJson = require('./make-defaults')
const makePresets = require('./make-presets')
const makeFields = require('./make-fields')
const makeIcons = require('./make-icons')

// We're making these assumptions about the SMART data model file:
// - that the file will always be present
// - that the file will always be named this
//    - Note: `project.json` inside the package zip file have a
//      `definition` field which specifies this file name. Will this
//      file name ever be changeable during the export procedure?
// - that there are no other model files in addition to, or override this
const SMART_MODEL_FILE = 'cm_model.xml'
const TEMPORARY_DIR = '_temp'

// This is copied from mapeo-settings-builder's generateProjectKey()
// which we might want to re-use if we want to generate `metadata.json`
// dynamically based on certain inputs. e.g. consider creating a
// pseudorandom project key which are consistent when seeded with
// the same inputs, so that the same SMART config generates the same
// projectt key.
function generateProjectKey () {
  return crypto.randomBytes(32).toString('hex')
}

// Write out parsed XML data to JSON in the tempPath for inspection
function writeDebugFile (bool = false, data, tempPath) {
  // Only run when the condition is true (first argument to this function)
  if (!true) return

  try {
    const file = path.join(tempPath, `cm_model.json`)
    fs.writeFileSync(file, JSON.stringify(data.json, null, 2))
    logger.verbose('Exported cm_model.json to temporary directory')
  } catch (err) {
    logger.warn(`Unable to create cm_model.json: ${err}`)
  }
}

module.exports = (sourceFile, destPath) => {
  // Create destination and temporary folders, if necessary
  // TODO: Clean existing folders
  const tempPath = path.join(process.cwd(), TEMPORARY_DIR)

  const madeDestPath = mkdirp.sync(destPath)
  if (madeDestPath) {
    logger.log(`Creating destination directory ${destPath}`)
  }

  const madeTempPath = mkdirp.sync(tempPath)
  if (madeTempPath) {
    logger.log(`Creating temporary directory ${tempPath}`)
  }

  // Unzip the SMART Patrol package
  unzip(sourceFile, tempPath, parse)

  // Parse the SMART Configurable Model
  function parse () {
    parseXml(path.join(tempPath, SMART_MODEL_FILE), generate)
  }

  // Create presets, icons, and metadata for mapeo-settings-builder
  function generate (data) {
    // Export converted JSON in debug mode
    writeDebugFile(process.env.debug === 'true', data, tempPath)

    makeDefaultsJson(destPath, data.presets)
    makePresets(destPath, data.presets)
    makeFields(destPath, data.fields)
    makeIcons(tempPath, destPath, data.presets)
  }
}
