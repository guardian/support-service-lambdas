package com.gu.productmove.zuora

import com.gu.productmove.endpoint.move.ProductMoveEndpointTypes.{ErrorResponse, InternalServerError}
import com.gu.productmove.zuora.GetSubscription
import com.gu.productmove.zuora.GetSubscription.GetSubscriptionResponse
import zio.json.*
import zio.*

import scala.io.Source

class MockCatalogue extends GetCatalogue {
  override def get: Task[ZuoraProductCatalogue] = {
    val json = Source.fromResource("Catalogue.json").mkString

    ZIO.fromEither(json.fromJson[ZuoraProductCatalogue]).mapError(x => new Throwable(x))
  }
}
