package com.gu.sf.move.subscriptions.api

import com.gu.AppIdentity
import cats.syntax.either._
import com.gu.effects.aws
import sttp.client3.HttpURLConnectionBackend
import com.gu.http4s.Http4sLambdaHandler

object Handler
    extends Http4sLambdaHandler(
      SFMoveSubscriptionsApiApp(
        AppIdentity.whoAmI(defaultAppName = "sf-move-subscriptions-api", aws.CredentialsProvider).get,
        HttpURLConnectionBackend(),
        UpdateSupporterProductDataService(
          sys.env.getOrElse(
            "Stage",
            throw new RuntimeException("Stage parameter is missing from the lambda environment variables"),
          ),
        ),
      ).value
        .unsafeRunSync()
        .valueOr((error: MoveSubscriptionApiError) => throw new RuntimeException(error.toString)),
    )
