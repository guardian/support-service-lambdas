package com.gu.productmove.zuora

import com.gu.productmove.AwsS3
import com.gu.productmove.GuStageLive.Stage
import com.gu.productmove.endpoint.available.TimeUnit
import com.gu.productmove.zuora.rest.ZuoraGet
import sttp.capabilities.zio.ZioStreams
import sttp.capabilities.{Effect, WebSockets}
import sttp.client3.*
import sttp.client3.httpclient.zio.{HttpClientZioBackend}
import sttp.client3.ziojson.*
import sttp.model.Uri
import zio.json.*
import zio.{IO, RIO, Task, URLayer, ZIO, ZLayer}

import java.time.LocalDate

object GetCatalogueLive:
  val layer: URLayer[AwsS3 with Stage, GetCatalogue] = ZLayer.fromFunction(GetCatalogueLive(_, _))

private class GetCatalogueLive(awsS3: AwsS3, stage: Stage) extends GetCatalogue :
  private val zuoraCatalogueBucket = "gu-zuora-catalog"

  private def key(stage: Stage) = {
    val stagePath = if (stage == Stage.DEV) "CODE/Zuora-DEV" else if (stage == Stage.CODE) "CODE/Zuora-UAT" else "PROD/Zuora-PROD"
    val relativePath = "catalog.json"
    s"$stagePath/$relativePath"
  }

  def get: ZIO[Any, String, ZuoraProductCatalogue] =
    for {
      fileContent <- awsS3.getObject(zuoraCatalogueBucket, key(stage)).mapError(_.toString)
      zuoraCatalogue <- ZIO.fromEither(summon[JsonDecoder[ZuoraProductCatalogue]].decodeJson(fileContent))
    } yield zuoraCatalogue

trait GetCatalogue:
  def get: ZIO[Any, String, ZuoraProductCatalogue]

object GetCatalogue {
  def get: ZIO[GetCatalogue, String, ZuoraProductCatalogue] = ZIO.serviceWithZIO[GetCatalogue](_.get)
}

case class ZuoraProductCatalogue(products: Set[ZuoraProduct], nextPage: Option[String] = None)

object ZuoraProductCatalogue {
  given JsonDecoder[ZuoraProductCatalogue] = DeriveJsonDecoder.gen[ZuoraProductCatalogue]
}

case class ZuoraProduct(
  name: String,
  productRatePlans: Set[ZuoraProductRatePlan]
)

object ZuoraProduct {
  given JsonDecoder[ZuoraProduct] = DeriveJsonDecoder.gen[ZuoraProduct]
}

case class ZuoraProductRatePlan(
  id: String,
  name: String,
  productRatePlanCharges: Set[ZuoraProductRatePlanCharge]
)

object ZuoraProductRatePlan {
  given JsonDecoder[ZuoraProductRatePlan] = DeriveJsonDecoder.gen[ZuoraProductRatePlan]
}

case class ZuoraProductRatePlanCharge(id: String, billingPeriod: Option[String], pricing: List[ZuoraPricing])

object ZuoraProductRatePlanCharge {
  given JsonDecoder[ZuoraProductRatePlanCharge] = DeriveJsonDecoder.gen[ZuoraProductRatePlanCharge]
}
