# handler

This project is a little bit of a flavour of "common".  It basically includes code that is relevant to
our current way of running a lambda from API gateway, excluding anything that has side effects.  This
means it should be able to have 100% test coverage.

This is
- turning config from a string into a nice data structure including stage
- turning the string input stream into a nice string which represents the http body
- checking the api key from the url
- turning response objects into the right string to write to an output stream
