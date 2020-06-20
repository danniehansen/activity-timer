const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = {
  entry: {
    main: ['@babel/polyfill', './src/js/views/main.js'],
    card_back_section: ['@babel/polyfill', './src/js/views/card_back_section.js'],
    change_estimate: ['@babel/polyfill', './src/js/views/change_estimate.js'],
    history: ['@babel/polyfill', './src/js/views/history.js'],
    settings: ['@babel/polyfill', './src/js/views/settings.js'],
    notifications: ['@babel/polyfill', './src/js/views/notifications.js'],
    enable_notifications: ['@babel/polyfill', './src/js/views/enable_notifications.js']
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
      template: './views/index.html',
      chunks: ['main']
    }),
    new HtmlWebpackPlugin({
      filename: "card_back_section.html",
      template: './views/card_back_section.html',
      chunks: ['card_back_section']
    }),
    new HtmlWebpackPlugin({
      filename: "change_estimate.html",
      template: './views/change_estimate.html',
      chunks: ['change_estimate']
    }),
    new HtmlWebpackPlugin({
      filename: "history.html",
      template: './views/history.html',
      chunks: ['history']
    }),
    new HtmlWebpackPlugin({
      filename: "settings.html",
      template: './views/settings.html',
      chunks: ['settings']
    }),
    new HtmlWebpackPlugin({
      filename: "notifications.html",
      template: './views/notifications.html',
      chunks: ['notifications']
    }),
    new HtmlWebpackPlugin({
      filename: "enable_notifications.html",
      template: './views/enable_notifications.html',
      chunks: ['enable_notifications']
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
