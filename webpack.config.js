const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  entry: __dirname + "/src/index.js", 
  output: {
    path: __dirname + '/build', 
    filename: 'bundle.js',  
    publicPath: '/' 
  },
  module: {  
      rules: [ 
      ]
  },
  plugins: [ 
      new HtmlWebpackPlugin({
          template: __dirname + "/public/index.html",
          inject: 'body'
      })
  ],
  devServer: {  
      contentBase: './public',  
      port: 7700, 
  } 
};