package com.gu.sf.move.subscriptions.api

import com.gu.AppIdentity
import cats.syntax.either._
import com.softwaremill.sttp.HttpURLConnectionBackend
import com.gu.http4s.Http4sLambdaHandler

object Handler extends Http4sLambdaHandler(
  SFMoveSubscriptionsApiApp(AppIdentity.whoAmI(defaultAppName = "sf-move-subscriptions-api"), HttpURLConnectionBackend())
    .value
    .unsafeRunSync()
    .valueOr((error: MoveSubscriptionApiError) => throw new RuntimeException(error.toString))
)

