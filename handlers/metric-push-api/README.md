# metric-push-api

This lambda takes http requests from the client side for never events e.g.
fail to render.  This would be the form of an img tag or similar.
It will then push a metric to cloudwatch which we can then alarm on.
