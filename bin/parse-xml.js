const fs = require('fs')
const xml2js = require('xml2js')

const parser = new xml2js.Parser()

module.exports = function parseXml (sourceFile) {
  const data = fs.readFileSync(sourceFile)
  parser.parseString(data, function (err, result) {
    // do stuff with this
  })
}
