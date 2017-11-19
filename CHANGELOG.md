## v0.6.8
- Only add status bar tile after ide-java detects Java files

## v0.6.7

- Update language server to v0.7.0 for better performance etc.

## v0.6.6

- Fixed "Classpath is incomplete" error introduced in v0.6.4 caused by language server breaking LSP 2.0 support #37

## v0.6.5

- Add Java 9 support
- Status bar and process handle improvements

## v0.6.4

- Ensure version detection compatible with openjdk

## v0.6.3

- Change version detection logic to handle stderr and stdout

## v0.6.2

- Update language server to 0.5.0 (fixes #8)
- Display diagnostics error if language server exits unexpectedly
- Remove warnings in console during install

## v0.6.1

- Update language server to 0.3.0 #13
- Update atom-languageclient for better diagnostics, source ordered OutlineView
- Check Java runtime version at start-up
- Create temporary directory for language server data #5
- Documentation clean-up
- Clean up and simplify download and install code

## v0.6.0

- Initial release
