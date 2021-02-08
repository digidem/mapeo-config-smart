const fs = require('fs')
const path = require('path')
const logger = require('./logger')
const { getPresetName } = require('./util')

const BASE_OBJECT = {
  area: [],
  line: [],
  point: [
    'point'
  ],
  vertex: [],
  relation: []
}

function makeDefaultsJson (destPath, presets) {
  logger.log(`Writing defaults.json`)

  // Make a clone of the BASE_OBJECT the old fashioned way
  const data = JSON.parse(JSON.stringify(BASE_OBJECT))

  // Make the cotents of defaults.json be what it is
  presets.map((preset) => {
    const id = getPresetName(preset.tags['smart:categoryhkey'])
    preset.geometry.map((geom) => {
      data[geom].push(id)
    })
  })

  // Write the file
  const file = path.join(destPath, 'defaults.json')
  try {
    // One must not merely write a JavaScript object, so stringify first
    // Pretty print the JSON so it's easier for human review
    fs.writeFileSync(file, JSON.stringify(data, null, 2))
    logger.ok(`Wrote defaults.json`)
  } catch (err) {
    logger.error(`Error writing defaults.json: ${err}`)
  }
}

module.exports = makeDefaultsJson
