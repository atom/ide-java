const path = require('path')
const chai = require('chai')
const {createRunner} = require('atom-mocha-test-runner')

global.assert = chai.assert
global.expect = chai.expect

module.exports = createRunner({
  htmlTitle: `IDE-Java Package Tests - pid ${process.pid}`,
  reporter: process.env.MOCHA_REPORTER || 'spec',
}, mocha => {
  mocha.timeout(parseInt(process.env.MOCHA_TIMEOUT || '5000', 10))

  if (process.env.TEST_JUNIT_XML_PATH) {
    mocha.reporter(require('mocha-junit-and-console-reporter'), {
      mochaFile: process.env.TEST_JUNIT_XML_PATH,
    })
  } else if (process.env.APPVEYOR_API_URL) {
    mocha.reporter(require('mocha-appveyor-reporter'))
  } else if (process.env.CIRCLECI === 'true') {
    mocha.reporter(require('mocha-junit-and-console-reporter'), {
      mochaFile: path.join(process.env.CIRCLE_TEST_REPORTS, 'mocha', 'test-results.xml'),
    })
  }
})
