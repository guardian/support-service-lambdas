package com.gu.sf.move.subscriptions.api

import com.gu.AppIdentity
import io.github.howardjohn.lambda.http4s.Http4sLambdaHandler

object Handler extends Http4sLambdaHandler(
  SFMoveSubscriptionsApiApp.apply(AppIdentity.whoAmI(defaultAppName = "sf-move-subscriptions-api"))
)

