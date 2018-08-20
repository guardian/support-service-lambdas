package com.gu.newproduct.api.productcatalog

import com.gu.effects.GetFromS3
import com.gu.util.config.Stage

import scalaz.Scalaz._

object NewProductApiCatalogManualTest extends App {

  //  val res = for {
  //    zuoraIds <- ZuoraIds.zuoraIdsForStage(Stage("DEV")).toDisjunction
  //    zuoraToPlanId = zuoraIds.voucherZuoraIds.zuoraIdToPlanid.get _
  //    stage = Stage("DEV")
  //    response <- {
  //      def pricesFromZuora(stage: Stage) = PricesFromZuoraCatalog(stage, GetFromS3.fetchString, zuoraToPlanId)

  //    }
  //  } yield response
  //
  //  println(res)
}
