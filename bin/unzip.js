const fs = require('fs')
const mkdirp = require('mkdirp')
const path = require('path')
const yauzl = require('yauzl')

module.exports = function (sourceFile, dest) {
  const destPath = path.join(process.cwd(), dest)
  const madeDir = mkdirp.sync(destPath)
  console.log(`gonna unzip ${sourceFile} to ${destPath}`)

  yauzl.open(sourceFile, { lazyEntries: true }, function (err, zipfile) {
    if (err) throw err
    zipfile.readEntry()
    zipfile.on('entry', function (entry) {
      if (/\/$/.test(entry.fileName)) {
        // Directory file names end with '/'.
        // Note that entires for directories themselves are optional.
        // An entry's fileName implicitly requires its parent directories to exist.
        zipfile.readEntry()
      } else {
        // file entry
        zipfile.openReadStream(entry, function (err, readStream) {
          if (err) throw err
          readStream.on('end', function() {
            zipfile.readEntry()
          })
          const destFile = path.join(destPath, entry.fileName)
          console.log(`Writing ${destFile}`)
          const writeStream = fs.createWriteStream(destFile)
          readStream.pipe(writeStream)
        })
      }
    })
  })
}
