# effects

This project contains the side effects (i.e. that we can't unit test.)

The would cause things to change or would change their response each time
 e.g. http requests, random numbers, today's date, file/s3/db access.

Obviously we want to minimise the untestable code, so this package should be kept as small as possible.

Side effects shouldn't be done from elsewhere in the code, although logging is a bit of a grey area since it's more
like observation rather than specific effects.  At present logging is mixed into the rest of the code.

The only line in the sand is this:

- This project should be depended on by the handlers only, it must not be depended on by anything else in lib.
