const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  entry: {
    background: './src/background/index.ts',
    sidepanel: './src/sidepanel/index.tsx',
    readabilityExtractor: './src/content/readabilityExtractor.ts',
  },
  output: {path: path.resolve(__dirname, 'dist'), filename: '[name].js', clean: true},
  resolve: {extensions: ['.ts', '.tsx', '.js']},
  module: {rules: [{test: /\.tsx?$/, use: 'ts-loader', exclude: /node_modules/}]},
  plugins: [
    new CopyPlugin({
      patterns: [{from: 'public/manifest.json', to: 'manifest.json'}, {
        from: 'public/icons',
        to: 'icons',
      }, {from: 'src/sidepanel/styles.css', to: 'styles.css'}],
    }),
    new HtmlWebpackPlugin({
      template: './src/sidepanel/index.html',
      filename: 'sidepanel.html',
      chunks: ['sidepanel'],
    }),
  ],
  devtool: 'cheap-module-source-map',
  optimization: {splitChunks: false},
};
