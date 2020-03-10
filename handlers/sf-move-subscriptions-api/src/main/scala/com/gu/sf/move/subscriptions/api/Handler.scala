package com.gu.sf.move.subscriptions.api

import com.gu.AppIdentity
import io.github.howardjohn.lambda.http4s.Http4sLambdaHandler
import cats.syntax.either._
import com.softwaremill.sttp.HttpURLConnectionBackend

object Handler extends Http4sLambdaHandler(
  SFMoveSubscriptionsApiApp(AppIdentity.whoAmI(defaultAppName = "sf-move-subscriptions-api"), HttpURLConnectionBackend())
    .value
    .unsafeRunSync()
    .valueOr((error: MoveSubscriptionApiError) => throw new RuntimeException(error.toString))
)

