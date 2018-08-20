package com.gu.newproduct.api.productcatalog

import com.gu.effects.GetFromS3
import com.gu.util.config.Stage

import scala.util.Try
import scalaz.Scalaz._
import scalaz._

object NewProductApiCatalogManualTest extends App {

  val res = for {
    zuoraIds <- ZuoraIds.zuoraIdsForStage(Stage("DEV")).toDisjunction
    zuoraToPlanId = zuoraIds.voucherZuoraIds.zuoraIdToPlanid.get _
    stage = Stage("DEV")
    response <- {
      def pricesFromZuora(stage: Stage) = PricesFromZuoraCatalog(stage, GetFromS3.fetchString, zuoraToPlanId)
      NewProductApiCatalog.catalog1( pricesFromZuora, stage).toDisjunction
    }
  } yield response

  println(res)
}
