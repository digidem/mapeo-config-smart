const fs = require('fs')
const path = require('path')
const yauzl = require('yauzl')
const logger = require('./logger')

function throwError (sourceFile, error) {
  logger.error(`Could not extract from ${sourceFile}:\n  ${error}`)
  process.exit(1)
}

module.exports = function unzipPackage (sourceFile, destPath, cb = () => {}) {
  if (typeof sourceFile === 'undefined') {
    logger.error('Please provide path to SMART Patrol Package')
    process.exit(1)
  }

  logger.log(`Extracting ${sourceFile} to ${destPath}`)

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
          logger.log(`Extracting ${entry.fileName}`)

          readStream.pipe(writeStream)
        })
      }
    })

    zipfile.on('end', function () {
      logger.ok(`SMART Patrol Package extraction complete`)

      // Run the next step after unzipping via a callback.
      // This might be better implemented by making this entire
      // module use async syntax, but using the callback function
      // is the easier implementation for now.
      cb()
    })

    zipfile.on('error', function (error) {
      throwError(sourceFile, error)
    })
  })
}
