# XRPL MultiSignTool

#### Demo: https://www.youtube.com/watch?v=1NdRgxvgZAA

A vue-webpack project to:

1. Compose a XRPL transaction (JSON)
2. Distribute the raw (dummy) signed transaction for Multi Signing
3. MultiSign (OFFLINE), until the quorum is met
4. Combine the signatures and submit the transaction

There's also a helper tool to setup Multi Signing.

# Run (the easy way)
Get yourself the most recent release from https://github.com/WietseWind/XRPL-MultiSignTool/releases

Or run in development mode / build your own package:

## Project setup
This project uses a legacy Vue 2 / Webpack 4 toolchain. To reproduce the
existing build without dependency updates, use Node.js 12.22.12 with npm 6.

If you use `nvm`, run:

```
nvm install
nvm use
npm install -g npm@6.14.16
```

Confirm the expected versions:

```
node --version
npm --version
```

Expected:

```
v12.22.12
6.14.16
```

Then install the dependencies:

```
npm install
```

### Compiles and hot-reloads for development

```
npm run serve
```

### Compiles and zips for distribution / local use

```
./build.sh
```

The built output will live in `/dist` and a distribution zip will be stored in `/dist.zip`.
