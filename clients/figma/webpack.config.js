const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const HtmlInlineScriptPlugin = require('html-inline-script-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: {sandbox: './src/sandbox/code.ts', ui: './src/ui/index.tsx'},
  output: {path: path.resolve(__dirname, 'dist'), filename: '[name].js', clean: true},
  resolve: {extensions: ['.ts', '.tsx', '.js']},
  module: {
    rules: [{test: /\.tsx?$/, use: 'ts-loader', exclude: /node_modules/}, {
      test: /\.css$/,
      use: ['style-loader', 'css-loader'],
    }],
  },
  plugins: [
    new CopyPlugin({patterns: [{from: 'manifest.json', to: 'manifest.json'}]}),
    new HtmlWebpackPlugin({
      template: './src/ui/index.html',
      filename: 'ui.html',
      chunks: ['ui'],
      inject: 'body',
    }),
    new HtmlInlineScriptPlugin(),
  ],
  devtool: 'cheap-module-source-map',
  optimization: {splitChunks: false},
};
