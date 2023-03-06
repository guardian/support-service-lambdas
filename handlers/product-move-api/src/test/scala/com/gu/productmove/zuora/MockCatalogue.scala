package com.gu.productmove.zuora

import com.gu.productmove.zuora.GetSubscription
import com.gu.productmove.zuora.GetSubscription.GetSubscriptionResponse
import zio.json.*
import zio.{IO, Task, ZIO}

import scala.io.Source

class MockCatalogue extends GetCatalogue {
  override def get: IO[String, ZuoraProductCatalogue] = {
    val json = Source.fromResource("Catalogue.json").mkString

    ZIO.fromEither(json.fromJson[ZuoraProductCatalogue])
  }
}
