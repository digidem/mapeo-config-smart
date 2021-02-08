const fs = require('fs')
const path = require('path')
const archy = require('archy')
const xml2js = require('xml2js')
const logger = require('./logger')

const parser = new xml2js.Parser()

// SMART Configurable Model data schema
// https://app.assembla.com/spaces/smart-cs/subversion-2/source/HEAD/trunk/source/java/org.wcs.smart.dataentry/src/org/wcs/smart/dataentry/model/xml/ConfigurableModelSchema.xsd
// Note: while the schema is defined, there doesn't appear to be actual
// documentation on what each of the properties _mean_. The useful bits of
// the model have been inferred.

module.exports = function parseXml (sourceFile, cb = () => {}) {
  const data = fs.readFileSync(sourceFile)
  parser.parseString(data, function (err, result) {
    const cm = result.ConfigurableModel

    // Language code of SMART model
    // According to the schema, there's always one at minimum, but there is
    // no maximum. English is used in the reference model I'm working with,
    // and for the MVP version of this we'll assume just one language.
    // Question to answer later: if a SMART model is exported in a multi-
    // language setting, are all strings guaranteed to exist for each language?
    // Or can there ever be a configuration that has one "complete" or "main"
    // language, with other strings in incomplete or missing translation states?
    // TODO: Use this to create "messages" files
    const defaultLanguage = getDefaultLanguage(cm)

    // Print tree of SMART model for debug reasons
    const archyOutput = result.ConfigurableModel.nodes[0].node.reduce(archyTreeOutput, {})
    archyOutput.label = 'Parsing SMART Configurable Model into the following tree:'
    logger.log(archy(archyOutput))

    // Iterate through SMART model to create preset definitions
    const presets = result.ConfigurableModel.nodes[0].node.reduce(getPresets, [])

    // Run the callback function to process the parsed data
    cb({
      presets
    })
  })
}

/**
 * Called recursively on the SMART ConfigurableModel data structure to build
 * a tree of categories and nested sub-categories, to be visualized by the
 * archy library (output similar to `npm ls`).
 *
 * @param {Object} tree - accumulator object for archy input
 * @param {Object} node - SMART ConfigurableModel node
 * @returns {Object} the current state of the tree for the next iteration
 */
function archyTreeOutput (tree, node) {
  const label = node.name[0].$.value

  let child
  if (node.node && Array.isArray(node.node)) {
    child = node.node.reduce(archyTreeOutput, { label })
  } else {
    child = { label }
  }

  if (!tree.nodes) {
    tree.nodes = []
  }
  tree.nodes.push(child)

  return tree
}

/**
 * Called recursively on the SMART ConfigurableModel data structure to build
 * a list of presets. Preset schema are defined by the iD editor:
 * https://github.com/openstreetmap/iD/tree/b9dc749a19f49931ff81ef10d19813b18694a5be/data/presets
 *
 * @param {Array} presets - accumulator array of preset definitions
 * @param {Object} node - SMART ConfigurableModel node
 * @returns {Array} the current state of the array for the next iteration
 */
function getPresets (presets, node) {
  const preset = {
    name: node.name[0].$.value,
    // `mapeo-settings-builder` only needs the file name without the extension
    icon: node.$.imageFile && path.basename(node.$.imageFile, '.svg'),
    // I don't see any way to programatically define whether a SMART
    // model item should be a point, line, area etc. so for now the
    // assumption is that all these things are points.
    geometry: ['point'],
    tags: {
      // These tags allow us to map categorized observations back to
      // the SMART data model.
      'smart:id': node.$.id,
      'smart:categorykey': node.$.categoryKey,
      'smart:categoryhkey': node.$.categoryHkey
      // TODO: Other tags? (Note: it may not be possible to generate
      // all appropriate tags for a feature programatically)
    },
    // Human-searchable synonyms for this preset. This will be left
    // blank in the initial conversion because there's no way to
    // build this programatically.
    terms: [],
    // TODO: build this from attribute fields.
    fields: []
  }

  // Only nodes with the `categoryKey` property is turned in to a preset.
  // Nodes without it are category parents, and observations are not
  // directly classified within them, I think?
  if (node.$.categoryKey) {
    presets.push(preset)
  }

  if (node.node && Array.isArray(node.node)) {
    node.node.reduce(getPresets, presets)
  }

  return presets
}

/**
 * Determine the default language code from the SMART configuration
 *
 * @todo More in-depth work for localizing strings from SMART to Mapeo settings
 * @param {Object} cm - parsed XML file (raw xml2js output)
 * @return {String} two-letter language code used for this config
 */
function getDefaultLanguage (cm) {
  let defaultLanguage
  cm.languages.map((lang) => {
    if (lang.language[0].$.is_default === 'true') {
      defaultLanguage = lang.language[0].$.code
      logger.log(`Using model's default language '${defaultLanguage}'`)
    } else {
      logger.log(`Language code ${lang.language[0].$.code} found`)
    }
  })

  if (!defaultLanguage) {
    defaultLanguage = 'en'
    logger.log(`No default language specified in model. Defaulting to 'en'`)
  }

  return defaultLanguage
}
