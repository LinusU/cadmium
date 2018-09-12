const fs = require('fs')
const globby = require('globby')
const ora = require('ora')
const path = require('path')
const revHash = require('rev-hash')
const CloudFront = require('aws-sdk/clients/cloudfront')
const S3 = require('@filestore/s3')
const { minify } = require('html-minifier')

const cloudfront = new CloudFront({ apiVersion: '2017-03-25' })

const minifyOpts = { collapseWhitespace: true, minifyCSS: true, minifyJS: true }

/**
 * @param {string} distributionId
 * @param {string[]} paths
 */
async function invalidatePaths (distributionId, paths) {
  const params = {
    DistributionId: distributionId,
    InvalidationBatch: {
      CallerReference: (new Date()).toISOString(),
      Paths: {
        Quantity: paths.length,
        Items: paths
      }
    }
  }

  await cloudfront.createInvalidation(params).promise()
}

/**
 * @typedef {object} Options
 * @property {string} assetsDir
 * @property {string} htmlFile
 * @property {string} jsProdFile
 * @property {string} wellKnownDir
 */

/**
 * @param {Options} options
 * @param {string} bucket
 * @param {string} distributionId
 */
module.exports = async function deploy (options, bucket, distributionId) {
  const spinner = ora()

  try {
    const s3 = new S3({ bucket })

    const jsSource = fs.readFileSync(options.jsProdFile)
    const jsRevHash = revHash(jsSource)
    const target = `main-${jsRevHash}.js`

    spinner.start('Deploying JavaScript')
    if (!(await s3.has(target))) {
      await s3.put(target, jsSource, {
        ACL: 'public-read',
        CacheControl: 'public, max-age=31536000, immutable',
        ContentType: 'application/javascript; charset=utf-8'
      })
    }
    spinner.succeed()

    const htmlSource = fs
      .readFileSync(options.htmlFile, 'utf-8')
      .replace('src="/main.js"', `src="/${target}"`)

    const minifiedHtml = minify(htmlSource, minifyOpts)

    spinner.start('Deploying HTML')
    await s3.put('index.html', minifiedHtml, {
      ACL: 'public-read',
      CacheControl: 'public, max-age=900',
      ContentType: 'text/html; charset=utf-8'
    })
    spinner.succeed()

    spinner.start('Deploying assets')
    const assets = await globby(`${options.assetsDir}/*-??????????.???`)
    for (const asset of assets) {
      const assetSource = fs.readFileSync(asset)
      const assetRevHash = revHash(assetSource)
      const assetName = path.basename(asset)

      if (asset.slice(-14, -4) !== assetRevHash) {
        throw new Error(`Rev hash is incorrect for "${assetName}", expected ${assetRevHash}`)
      }

      if (!(await s3.has(assetName))) {
        let contentType
        switch (assetName.slice(-4)) {
          case '.gif': contentType = 'image/gif'; break
          case '.jpg': contentType = 'image/jpeg'; break
          case '.png': contentType = 'image/png'; break
          case '.svg': contentType = 'image/svg+xml'; break
          default: throw new Error(`Unsupported file extension: ${assetName.slice(-4)}`)
        }

        await s3.put(assetName, assetSource, {
          ACL: 'public-read',
          CacheControl: 'public, max-age=31536000, immutable',
          ContentType: contentType
        })
      }
    }
    spinner.succeed()

    const hasWellKnown = fs.existsSync(options.wellKnownDir)

    if (hasWellKnown) {
      const files = fs.readdirSync(options.wellKnownDir)

      spinner.start(`Deploying ${files.length} well-known file${files.length === 1 ? '' : 's'}`)

      for (const file of files) {
        const source = fs.readFileSync(`${options.wellKnownDir}/${file}`)

        let contentType
        if (file === 'apple-app-site-association') contentType = 'application/json'
        if (file === 'assetlinks.json') contentType = 'application/json'

        await s3.put(`.well-known/${file}`, source, {
          ACL: 'public-read',
          CacheControl: 'public, max-age=900',
          ContentType: contentType
        })
      }

      spinner.succeed()
    }

    spinner.start('Invalidating CloudFront cache')
    await invalidatePaths(distributionId, hasWellKnown ? ['/', '/.well-known/*'] : ['/'])
    spinner.succeed()
  } catch (err) {
    spinner.fail(err.toString())
    throw err
  }
}
