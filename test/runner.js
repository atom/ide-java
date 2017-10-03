const path = require('path')
const chai = require('chai')
const {createRunner} = require('atom-mocha-test-runner')

global.assert = chai.assert
global.expect = chai.expect

global.stress = function(count, ...args) {
  const [description, ...rest] = args
  for (let i = 0; i < count; i++) {
    it.only(`${description} #${i}`, ...rest)
  }
}

module.exports = createRunner({
  htmlTitle: `IDE-Java Package Tests - pid ${process.pid}`,
  reporter: process.env.MOCHA_REPORTER || 'spec',
  overrideTestPaths: [/spec$/, /test/],
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
