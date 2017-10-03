const JavaLanguageClient = require('../lib/main.js')

describe('main', () => {
  describe('parsing `Java --showVersion --version` output', () => {
    it('returns null for unmatched input', () => {
      const version = JavaLanguageClient.getJavaVersionFromOutput("my homemade java v1.9.2.1")
      expect(version).to.be.null
    })

    it('returns 1.8 for Sun Java SE 1.8.0_40', () => {
      const version = JavaLanguageClient.getJavaVersionFromOutput('java version "1.8.0_40"'
        + '\nJava(TM) SE Runtime Environment (build 1.8.0_40-b27)'
        + '\nJava HotSpot(TM) 64-Bit Server VM (build 25.40-b25, mixed mode)')
      expect(version).to.be.equal(1.8)
    })

    it('returns 1.8 for OpenJDK 1.8', () => {
      const version = JavaLanguageClient.getJavaVersionFromOutput('openjdk version "1.8.0_131"'
        + '\nOpenJDK Runtime Environment (build 1.8.0_131-8u131-b11-2ubuntu1.17.04.3-b11)'
        + '\nOpenJDK 64-Bit Server VM (build 25.131-b11, mixed mode)')
      expect(version).to.be.equal(1.8)
    })

    it('returns 8 for Sun OpenJDK 1.8', () => {
      const version = JavaLanguageClient.getJavaVersionFromOutput('java version "9"'
        + '\nJava(TM) SE Runtime Environment (build 9+181)'
        + '\nJava HotSpot(TM) 64-Bit Server VM (build 9+181, mixed mode)')
      expect(version).to.be.equal(9)
    })
  })
})
