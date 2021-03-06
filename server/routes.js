'use strict'

const path = require('path')

module.exports = function (app) {
  app.use('/api/repository', require('./api/repository'))
  app.use('/api/', (req, res) => {
    res.json({
      message: 'You‘re at Ludwig API root!'
    })
  })
  app.use('/login', require('./login'))
  app.use('/oauth', require('./oauth'))

  app.route('/*').get((req, res) => {
    res.sendFile(path.resolve(path.join(__dirname, '../client/index.html')))
  })
}
