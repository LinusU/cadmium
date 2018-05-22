# Cadmium

Easily deploy single page applications to S3 + CloudFront.

**note:** This is very much a work in progress, don't expect anything to work right now

## Installation

```sh
npm install --global cadmium
```

## Usage

### Deploy an app

To deploy the app in the current directory, invoke `cadmium deploy`:

```sh
cadmium deploy --s3-bucket=website --cloudfront-distribution-id=C991478EDD28R
```

Cadmium currently uses some very opinionated defaults:

- `dist/main.min.js` will be revhashed and uploaded to `/main-${revHash}.js`
- `app.html` will be minified and uploaded as `index.html`, with `src="/main.js"` replaced by the path to the above file
- Every file in `assets/` with a rev hash in the filename will be uploaded to `/`
  - e.g. `assets/close-2f3235788c.svg` will be served at `/close-2f3235788c.svg`
  - if the file content doesn't match the revhash, an error will be thrown
- Every file in `well-known/` will be uploaded to `/.well-known`

Every revhashed file will only be uploaded if it doesn't already exists. `app.html`, and `well-known`-files, will always be uploaded.

The algorithm used for revhashing is the [rev-hash package](https://github.com/sindresorhus/rev-hash), which takes an md5 sum and truncates it to 10 characters.

When everything is uploaded an invalidation for the path `/` and `/.well-known/*` will be issued to the CloudFront distribution. Since every other file is revhashed every subsequent visit should now be the latest version.

### Serve app locally

To serve the app locally, invoke `cadmium serve`:

```sh
cadmium serve --port=3000
```

This command will start an http server that will match the behaviour that you should see from a site deployed to S3 + CloudFront.

The only difference to the `deploy` command is that it will look for the JavaScript at `dist/main.js` instead of `dist/main.min.js`, and it won't minify the html.
