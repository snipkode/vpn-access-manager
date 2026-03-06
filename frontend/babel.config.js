/** @type {import('@babel/core').TransformOptions} */
module.exports = {
  presets: [
    ['@babel/preset-react', { runtime: 'automatic' }],
    ['@babel/preset-env', { targets: { browsers: ['> 1%', 'last 2 versions'] } }]
  ],
  plugins: []
};
