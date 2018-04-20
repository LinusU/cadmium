const path = require('path')
const express = require('express')

/**
 * @typedef {object} Options
 * @property {string} assetsDir
 * @property {string} htmlFile
 * @property {string} jsDevFile
 * @property {string} wellKnownDir
 */

/**
 * @param {Options} options
 * @param {number} port
 */
module.exports = function (options, port) {
  const app = express()
  const root = process.cwd()

  app.get('/', (req, res) => {
    res.sendFile(path.join(root, options.htmlFile))
  })

  app.get('/app.js', (req, res) => {
    res.sendFile(path.join(root, options.jsDevFile))
  })

  app.use(express.static(path.join(root, options.assetsDir)))

  app.get('/.well-known/apple-app-site-association', (req, res) => {
    res.contentType('application/json')
    res.sendFile(path.join(root, options.wellKnownDir, 'apple-app-site-association'))
  })

  app.use('/.well-known/', express.static(path.join(root, options.wellKnownDir)))

  app.listen(port, () => console.log(`http://localhost:${port}/`))
}
