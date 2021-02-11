const fs = require('fs')
const path = require('path')
const archy = require('archy')
const chalk = require('chalk')
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
    logModelTree(cm)

    // Iterate through SMART model to create field and preset definitions
    const presets = getPresets(cm)
    const fields = getFields(cm)

    // Run the callback function to process the parsed data
    cb({
      json: cm,
      lang: defaultLanguage,
      presets,
      fields
    })
  })
}

function logModelTree (cm) {
  const archyOutput = cm.nodes[0].node.reduce(archyTreeOutput, {})
  archyOutput.label = 'Parsing SMART Configurable Model into the following tree:'
  logger.log(archy(archyOutput))
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

  // Append if node has attributes
  let attr = ''
  if (node.attribute && Array.isArray(node.attribute)) {
    attr = ' - has attributes'
  }

  let child
  // Color code nodes that are top-level categories
  if (node.node && Array.isArray(node.node)) {
    child = node.node.reduce(archyTreeOutput, {
      label: chalk.magenta`${label}` + attr
    })
  } else {
    child = {
      label: chalk.cyan`${label}` + attr
    }
  }

  // Observation note: it seems that top-level categories do NOT have
  // their own attributes.

  if (!tree.nodes) {
    tree.nodes = []
  }
  tree.nodes.push(child)

  return tree
}

/**
 * Returns a list of presets for Mapeo.
 *
 * @param {Object} cm - the parsed data model from XML to JSON
 * @returns {Array} list of preset definitions
 */
function getPresets (cm) {
  return cm.nodes[0].node.reduce(getPresetIterator, [])
}

/**
 * Called recursively on the SMART ConfigurableModel data structure to build
 * a list of presets. Preset schema are defined by the iD editor:
 * https://github.com/openstreetmap/iD/tree/b9dc749a19f49931ff81ef10d19813b18694a5be/data/presets
 * https://github.com/openstreetmap/iD/blob/b9dc749a19f49931ff81ef10d19813b18694a5be/data/presets/schema/preset.json
 *
 * Additional schema as documented by the Mapeo project:
 * https://github.com/digidem/mapeo-schema/blob/master/docs/preset.md
 *
 * @param {Array} presets - accumulator array of preset definitions
 * @param {Object} node - SMART ConfigurableModel node
 * @returns {Array} the current state of the array for the next iteration
 */
function getPresetIterator (presets, node) {
  let attributes
  if (node.attribute && Array.isArray(node.attribute)) {
    attributes = node.attribute.map(attr => attr.$.attributeKey)
  }

  const preset = {
    name: node.name[0].$.value,
    // `mapeo-settings-builder` only needs the file name without the extension
    icon: node.$.imageFile && path.basename(node.$.imageFile, '.svg'),
    // There isn't a way to programatically determine whether a SMART model
    // item should be a point, line, area etc. so we make the assumption that
    // all these things are points.
    geometry: ['point'],
    tags: {
      // These tags allow us to map categorized observations back to the SMART
      // data model. We may not need all of these IDs, but I don't know the
      // difference between each of them enough to choose one. Putting them
      // all in the tags means we hopefully don't go too far down the path
      // of collecting data without a means of associating back to the model
      'smart:id': node.$.id,
      'smart:dmuuid': node.$.dmUuid,
      'smart:configid': node.$.configId,
      'smart:categorykey': node.$.categoryKey,
      'smart:categoryhkey': node.$.categoryHkey
      // TODO: Other tags? (Note: it may not be possible to generate
      // all appropriate tags for a feature programatically)
    },
    // Human-searchable synonyms for this preset. This will be left
    // blank in the initial conversion because there's no way to
    // build this programatically.
    terms: [],
    fields: attributes || []
  }

  // Only nodes with the `categoryKey` property is turned in to a preset.
  // Nodes without it are category parents, and observations are not
  // directly classified within them, I think?
  if (node.$.categoryKey) {
    presets.push(preset)
  }

  if (node.node && Array.isArray(node.node)) {
    logger.warn(`Warning: parent level category '${node.name[0].$.value}' will only export its children`)
    node.node.reduce(getPresetIterator, presets)
  }

  return presets
}

/**
 * Called recursively on the SMART ConfigurableModel data structure to build
 * a list of fields. Mapeo does not use the same field schema as iD editor.
 * Instead, refer to  this:
 * https://github.com/digidem/mapeo-schema/blob/master/docs/field.md
 *
 * @param {Array} fields - accumulator array of field definitions
 * @param {Object} node - SMART ConfigurableModel node
 * @returns {Array} the current state of the array for the next iteration
 */
function getFields (cm) {
  if (!cm.attributeConfig || !Array.isArray(cm.attributeConfig)) {
    logger.verbose('No attributes detected, skipping field generation')
    return []
  }

  const attributeConfigs = cm.attributeConfig.reduce((lookupObj, attr) => {
    const key = attr.$.attributeKey
    lookupObj[key] = attr
    return lookupObj
  }, {})
  const attributes = cm.nodes[0].node.reduce(getFieldsIterator, {})

  const fields = Object.entries(attributes).map(([key, value]) => {
    const attr = value[0]

    const field = {
      key,
      label: attr.name[0].$.value
    }

    // Set type
    /**
     * Note:
     * there are five types of fields in SMART:
     *  - Numeric
     *  - List (aka "select one")
     *  - Tree (select one, but choices are in a nested tree)
     *  - Text
     *  - Boolean
     * List and tree attributes are defined in the attributeConfig property.
     * Numerical fields are not, so we need to collect those from each node.
     *  - numerical fields may have 'minValue' or 'maxValue'
     * Text and boolean fields are not defined, so we assume the format based
     * on the name of the type
     */
    switch (attr.$.type) {
      case 'NUMERIC':
        field.type = 'number'
        // Set min and max values for number types
        // Note: the field properties used in Mapeo are named differently
        // than in iD editor
        if (attr.$.minValue) {
          field.min_value = Number.parseInt(attr.$.minValue, 10)
        }
        if (attr.$.maxValue) {
          field.max_value = Number.parseInt(attr.$.maxValue, 10)
        }
        break
      case 'BOOLEAN':
        field.type = 'select_one'

        // Manually define "yes" and "no" selections for boolean types
        // Although the iD editor specifies a "check" type, this is
        // not suppored by Mapeo. We implement this with a select_one type
        field.options = [
          {
            label: "Yes",
            value: true
          },
          {
            label: "No",
            value: false
          }
        ]
        break
      case 'LIST':
        field.type = 'select_one'
        field.options = attributeConfigs[key].listItem.map((item) => {
          return {
            label: item.name[0].$.value,
            value: item.$.keyRef
          }
        })
        break
      // Trees are the most complex selection types in SMART. The selection
      // is made after navigating a nested list of choices. In some cases
      // it's possible for SMART to have defined a flat, single-level tree
      // even though it works as a list.
      // The way this will work is to create multiple select fields that
      // have a prerequisite on the previous one.
      case 'TREE':
        logFieldTree(attributeConfigs[key])
        field.type = 'select_one'
        field.options = flattenTreeSelect(attributeConfigs[key])
        break
      case 'TEXT':
      default:
        field.type = 'text'
        break
    }

    return field
  })

  return fields
}

function getFieldsIterator (fields, node) {
  // Collect all the attribute definitions in every node. Attributes with the
  // same key can exist in multiple nodes. I don't know if it's possible for an
  // attribute defined on one node to have different properties from the same
  // attribute defined on another node. At a cursory glance through the data,
  // it appears the attributes all have the same properties if the key was the
  // same (apart from the 'id'). However: I'm still collecting all instances
  // of an attribute as an array, and we can double-check this assumption later.
  if (node.attribute && Array.isArray(node.attribute)) {
    const attrs = node.attribute
    for (let i = 0; i < attrs.length; i++) {
      const attr = attrs[i]
      const key = attr.$.attributeKey
      fields[key] = fields[key] || []
      fields[key].push(attr)
    }
  }

  if (node.node && Array.isArray(node.node)) {
    node.node.reduce(getFieldsIterator, fields)
  }

  return fields
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


/**
 * Similar code to logging the tree structure of presets, this visualizes
 * the structure of a tree selection type for debug purposes
 */
function logFieldTree (attrConfig) {
  logger.warn(`Warning: tree-select field '${attrConfig.$.attributeKey}' will be flattened`)
  const archyOutput = attrConfig.treeNode.reduce(archyFieldTreeOutput, {})
  archyOutput.label = `Flattening this tree for field '${chalk.yellow(attrConfig.$.attributeKey)}':`
  logger.log(archy(archyOutput))
}

function archyFieldTreeOutput (tree, node) {
  const label = node.name[0].$.value

  let child
  // Color code nodes that are top-level categories
  if (node.children && Array.isArray(node.children)) {
    child = node.children.reduce(archyFieldTreeOutput, {
      label: chalk.magenta`${label}`
    })
  } else {
    child = {
      label: chalk.cyan`${label}`
    }
  }

  if (!tree.nodes) {
    tree.nodes = []
  }
  tree.nodes.push(child)

  return tree
}

/**
 * Flattens a tree-select configuration into a single list of selections
 * for use with Mapeo
 *
 * @param {Object} attrConfig
 * @returns {Array}
 */
function flattenTreeSelect (attrConfig) {
  return attrConfig.treeNode.reduce(flattenTreeSelectIterator, [])
}

function flattenTreeSelectIterator (list, node) {
  // If this is a top-level item with children, traverse child nodes
  if (node.children && Array.isArray(node.children)) {
    node.children.reduce(flattenTreeSelectIterator, list)
  } else {
    // Otherwise, create the select object and push to the list
    list.push({
      label: node.name[0].$.value,
      value: node.$.keyRef
    })
  }

  return list
}
