const crypto = require('crypto')
const path = require('path')
const mkdirp = require('mkdirp')
const unzip = require('./unzip')
const parseXml = require('./parse-xml')

// We're making these assumptions about the SMART data model file:
// - that the file will always be present
// - that the file will always be named this
//    - Note: `project.json` inside the package zip file have a
//      `definition` field which specifies this file name. Will this
//      file name ever be changeable during the export procedure?
// - that there are no other model files in addition to, or override this
const SMART_MODEL_FILE = 'cm_model.xml'

function generateProjectKey () {
  return crypto.randomBytes(32).toString('hex')
}

module.exports = (sourceFile, destDir) => {
  const destPath = path.join(process.cwd(), destDir)
  const madeDir = mkdirp.sync(destPath)

  unzip(sourceFile, destPath, parse)

  function parse () {
    parseXml(path.join(destPath, SMART_MODEL_FILE))
  }
  // convert files
  // clean output folder
  // copy to folder structure + make files
}
