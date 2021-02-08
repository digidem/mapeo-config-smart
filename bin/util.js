/**
 * Given a `CategoryHKey` property from the SMART data model, normalize
 * it into a string preset id for `mapeo-settings-builder`.
 *
 * @param {string} hkey - from SMART ConfiguarableModel
 * @returns {string}
 */
function getPresetName (hkey) {
  // - turn string to lowercase
  // - replace interstitial periods with dashes
  // - remove trailing dash if any
  return hkey.toLowerCase().replace(/\./g, '-').replace(/-$/, '')
}

module.exports = {
  getPresetName
}
