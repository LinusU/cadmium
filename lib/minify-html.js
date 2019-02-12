const { minify } = require('html-minifier')

module.exports = (html) => minify(html, { collapseWhitespace: true, minifyCSS: true, minifyJS: true })
