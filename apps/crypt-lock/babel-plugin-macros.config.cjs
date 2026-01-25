const path = require('path')

module.exports = {
  twin: {
    preset: 'emotion',
    config: path.resolve(__dirname, '../../tailwind.config.cjs'),
  },
}
