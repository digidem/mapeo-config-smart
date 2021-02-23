/**
 * Making icons for `mapeo-settings-builder`
 * 
 * Icons live in the `icons` folder, and they must have two versions of each,
 * one with the `-100px` suffix and another with the `-24px` suffix. With SVGs,
 * we can provide the same image to both sizes, and that's all we need to do.
 */
const fs = require('fs')
const path = require('path')
const logger = require('./logger')

const ICON_FOLDER = 'icons'
const ICON_100PX_SUFFIX = '-100px'
const ICON_24PX_SUFFIX = '-24px'

function makeIcons (sourcePath, destPath, presets = []) {
  logger.log('Exporting icons ...')

  for (let i = 0; i < presets.length; i++) {
    const preset = presets[i]
    if (!preset.icon) {
      logger.warn(`Warning: no icon is defined for preset ${preset.name} (skipping)`)
      continue
    }

    const file = path.join(sourcePath, preset.icon + '.svg')

    const dest1 = path.join(destPath, ICON_FOLDER, preset.icon + ICON_100PX_SUFFIX + '.svg')
    const dest2 = path.join(destPath, ICON_FOLDER, preset.icon + ICON_24PX_SUFFIX + '.svg')
    copyFileSync(file, dest1)
    copyFileSync(file, dest2)
  }

  logger.ok('Exported icons')
}

function copyFileSync (file, dest) {
  try {
    fs.copyFileSync(file, dest)
    logger.log(`Copied ${path.basename(dest)}`)
  } catch (err) {
    logger.error(`Error copying to ${path.basename(dest)}: ${err}`)
  }
}

module.exports = makeIcons
