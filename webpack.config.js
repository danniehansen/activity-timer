const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = {
  entry: {
    main: ['@babel/polyfill', './src/js/views/main.js'],
    card_back_section: ['@babel/polyfill', './src/js/views/card_back_section.js'],
    history: ['@babel/polyfill', './src/js/views/history.js']
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'app.bundle.[name].[hash].js'
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: '[name].[hash].css',
    }),
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
    }),
    new HtmlWebpackPlugin({
      filename: "history.html",
      template: 'history.html',
      chunks: ['history']
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
            presets: ['@babel/preset-env'],
            plugins: ["@babel/plugin-proposal-class-properties"]
          }
        }
      },
      {
        test: /\.(png|svg|jpg|gif)$/,
        use: [
          'file-loader',
        ],
      },
      {
        test: /\.s[ac]ss$/i,
        use: [
          MiniCssExtractPlugin.loader,
          // Translates CSS into CommonJS
          'css-loader',
          // Compiles Sass to CSS
          'sass-loader',
        ],
      }
    ]
  }
}
