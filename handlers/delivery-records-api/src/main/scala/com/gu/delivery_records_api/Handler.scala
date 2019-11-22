package com.gu.delivery_records_api

import io.github.howardjohn.lambda.http4s.Http4sLambdaHandler

object Handler extends Http4sLambdaHandler(DeliveryRecordsApiApp().unsafeRunSync())
