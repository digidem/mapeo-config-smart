const fs = require('fs')
const path = require('path')
const logger = require('./logger')
const { getPresetName } = require('./util')

const PRESET_FOLDER = 'presets'

function makePresets (destPath, presets) {
  logger.log(`Writing presets ...`)

  // Write out each preset
  presets.map((preset) => {
    const id = getPresetName(preset.tags['smart:categoryhkey'])

    // Write the file
    const file = path.join(destPath, PRESET_FOLDER, `${id}.json`)
    try {
      // One must not merely write a JavaScript object, so stringify first
      // Pretty print the JSON so it's easier for human review
      fs.writeFileSync(file, JSON.stringify(preset, null, 2))
      logger.verbose(`Wrote preset '${id}'`)
    } catch (err) {
      logger.error(`Error writing preset '${id}': ${err}`)
    }
  })

  logger.ok('Finished writing presets')
}

module.exports = makePresets
