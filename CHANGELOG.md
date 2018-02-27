## v0.8.0

- Update language server to 0.12.1 for better editing and Java 9 support
- Now link classpath message to our own wiki help instead of Eclipse's
- Update atom-languageclient to 0.9.0 which includes
  - Superior autocomplete (min-char triggers, caching, filtering, resolve)
  - Server restart/recovery
  - Cancels outstanding autocomplete/outline requests when no longer needed

## v0.7.0

- Update language server to 0.8.0
- Update atom-languageclient to 0.7.0 which includes
  - Sorting autocomplete results, fixes #46
  - Snippet completion type items
  - Busy signals for startup and shutdown

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
