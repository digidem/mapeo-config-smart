const fs = require('fs')
const mkdirp = require('mkdirp')
const path = require('path')
const yauzl = require('yauzl')
const logger = require('./logger')

function throwError (sourceFile, error) {
  logger.error(`Could not extract from ${sourceFile}:\n  ${error}`)
  process.exit(1)
}

module.exports = function (sourceFile, dest) {
  const destPath = path.join(process.cwd(), dest)
  const madeDir = mkdirp.sync(destPath)

  if (typeof sourceFile === 'undefined') {
    logger.error('Please provide path to SMART Patrol Package')
    process.exit(1)
  }

  logger.log(`Extracting ${sourceFile} to ${destPath} ...`)

  yauzl.open(sourceFile, { lazyEntries: true }, function (err, zipfile) {
    if (err) throwError(sourceFile, err)

    zipfile.readEntry()

    zipfile.on('entry', function (entry) {
      if (/\/$/.test(entry.fileName)) {
        // Directory file names end with '/'.
        // Note that entires for directories themselves are optional.
        // An entry's fileName implicitly requires its parent directories to exist.
        zipfile.readEntry()
      } else {
        // This is a file entry
        zipfile.openReadStream(entry, function (err, readStream) {
          if (err) throwError(sourceFile, err)

          readStream.on('end', function() {
            zipfile.readEntry()
          })

          const destFile = path.join(destPath, entry.fileName)
          const writeStream = fs.createWriteStream(destFile)
          logger.log(`Extracting ${destFile} ...`)

          readStream.pipe(writeStream)
        })
      }
    })

    zipfile.on('end', function () {
      logger.ok(`SMART Patrol Package extraction complete`)
    })

    zipfile.on('error', function (error) {
      throwError(sourceFile, error)
    })
  })
}
