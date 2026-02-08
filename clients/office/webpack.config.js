const fs = require('fs');
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');

const certsDir = path.join(require('os').homedir(), '.office-addin-dev-certs');
const hasDevCerts = fs.existsSync(path.join(certsDir, 'localhost.crt'));

module.exports = {
  entry: {taskpane: './src/taskpane/index.tsx'},
  output: {path: path.resolve(__dirname, 'dist'), filename: '[name].js', clean: true},
  resolve: {extensions: ['.ts', '.tsx', '.js']},
  module: {rules: [{test: /\.tsx?$/, use: 'ts-loader', exclude: /node_modules/}]},
  plugins: [
    new CopyPlugin({
      patterns: [
        {from: 'manifest.xml', to: 'manifest.xml'},
        {from: 'src/taskpane/styles.css', to: 'styles.css'},
        {from: '../../assets/cone@16.png', to: 'assets/icon-16.png'},
        {from: '../../assets/cone@32.png', to: 'assets/icon-32.png'},
        {from: '../../assets/cone@64.png', to: 'assets/icon-80.png'},
      ],
    }),
    new HtmlWebpackPlugin({
      template: './src/taskpane/index.html',
      filename: 'taskpane.html',
      chunks: ['taskpane'],
    }),
  ],
  devServer: {
    static: './dist',
    port: 3000,
    server: hasDevCerts
      ? {
        type: 'https',
        options: {
          key: path.join(certsDir, 'localhost.key'),
          cert: path.join(certsDir, 'localhost.crt'),
          ca: path.join(certsDir, 'ca.crt'),
        },
      }
      : 'https',
    headers: {'Access-Control-Allow-Origin': '*'},
  },
  devtool: 'cheap-module-source-map',
};
