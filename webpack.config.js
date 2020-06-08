const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: {
    main: ['@babel/polyfill', './src/main.js'],
    card_back_section: ['@babel/polyfill', './src/card_back_section.js']
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'app.bundle.[name].[hash].js'
  },
  plugins: [
    new CleanWebpackPlugin(),
    new CopyPlugin({
      patterns: [
        { from: 'images', to: 'images' },
      ],
    }),
    new HtmlWebpackPlugin({
      filename: "index.html",
      template: 'index.html',
      chunks: ['main']
    }),
    new HtmlWebpackPlugin({
      filename: "card_back_section.html",
      template: 'card_back_section.html',
      chunks: ['card_back_section']
    })
  ],
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      },
      {
        test: /\.(png|svg|jpg|gif)$/,
        use: [
          'file-loader',
        ],
      },
    ]
  }
}
