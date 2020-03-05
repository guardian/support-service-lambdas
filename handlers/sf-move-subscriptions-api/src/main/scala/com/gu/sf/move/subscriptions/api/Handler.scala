package com.gu.sf.move.subscriptions.api

import io.github.howardjohn.lambda.http4s.Http4sLambdaHandler

object Handler extends Http4sLambdaHandler(SFMoveSubscriptionsApiApp.apply())

