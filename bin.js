#!/usr/bin/env node

const neodoc = require('neodoc')

const deploy = require('./lib/deploy')
const serve = require('./lib/serve')

const usage = `
Cadmium

Usage:
  cadmium deploy --s3-bucket=<bucket> --cloudfront-distribution-id=<distribution-id>
  cadmium serve --port=<port>

Options:
  --s3-bucket                    Name of the S3 bucket in which to put the files.
  --cloudfront-distribution-id   ID of the cloudfront distribution where the files are served.
  --port                         Port on which to serve http content on.
`

async function main () {
  const args = neodoc.run(usage)

  const options = {
    assetsDir: 'assets',
    htmlFile: 'app.html',
    jsFile: 'dist/main.js',
    wellKnownDir: 'well-known'
  }

  if (args['serve']) {
    serve(options, Number(args['--port']))
  }

  if (args['deploy']) {
    deploy(options, args['--s3-bucket'], args['--cloudfront-distribution-id'])
  }
}

main().catch((err) => {
  process.exitCode = 1
  console.error(err.stack)
})
