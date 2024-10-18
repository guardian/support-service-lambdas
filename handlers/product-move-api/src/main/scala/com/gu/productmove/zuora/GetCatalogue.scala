package com.gu.productmove.zuora

import com.gu.newproduct.api.productcatalog.ZuoraIds.{ProductRatePlanChargeId, ProductRatePlanId}
import com.gu.productmove.AwsS3
import com.gu.productmove.GuStageLive.Stage
import com.gu.productmove.endpoint.available.TimeUnit
import com.gu.productmove.endpoint.move.ProductMoveEndpointTypes.{ErrorResponse, InternalServerError}
import com.gu.productmove.zuora.rest.ZuoraGet
import sttp.capabilities.zio.ZioStreams
import sttp.capabilities.{Effect, WebSockets}
import sttp.client3.*
import sttp.client3.httpclient.zio.HttpClientZioBackend
import sttp.client3.ziojson.*
import sttp.model.Uri
import zio.json.*
import zio.{IO, RIO, Task, URLayer, ZIO, ZLayer}

import java.time.LocalDate

object GetCatalogueLive {
  val layer: URLayer[AwsS3 with Stage, GetCatalogue] = ZLayer.fromFunction(GetCatalogueLive(_, _))
}

class GetCatalogueLive(awsS3: AwsS3, stage: Stage) extends GetCatalogue {
  private val zuoraCatalogueBucket = "gu-zuora-catalog"

  private def key(stage: Stage) = {
    val stagePath =
      if (stage == Stage.CODE) "CODE/Zuora-CODE" else "PROD/Zuora-PROD"
    val relativePath = "catalog.json"
    s"$stagePath/$relativePath"
  }

  def get: Task[ZuoraProductCatalogue] =
    for {
      fileContent <- awsS3.getObject(zuoraCatalogueBucket, key(stage))
      zuoraCatalogue <- ZIO
        .fromEither(summon[JsonDecoder[ZuoraProductCatalogue]].decodeJson(fileContent))
        .mapError(x => new Throwable("issue decoding catalog: " + x))
    } yield zuoraCatalogue
}

trait GetCatalogue {
  def get: Task[ZuoraProductCatalogue]
}

object GetCatalogue {
  def get: RIO[GetCatalogue, ZuoraProductCatalogue] = ZIO.serviceWithZIO[GetCatalogue](_.get)
}

given JsonDecoder[ProductRatePlanChargeId] = JsonDecoder[String].map(ProductRatePlanChargeId.apply)
given JsonDecoder[ProductRatePlanId] = JsonDecoder[String].map(ProductRatePlanId.apply)

case class ZuoraProductCatalogue(products: List[ZuoraProduct], nextPage: Option[String] = None) derives JsonDecoder

case class ZuoraProduct(
    name: String,
    productRatePlans: List[ZuoraProductRatePlan],
) derives JsonDecoder

case class ZuoraProductRatePlan(
    id: ProductRatePlanId,
    name: String,
    productRatePlanCharges: List[ZuoraProductRatePlanCharge],
) derives JsonDecoder

case class ZuoraProductRatePlanCharge(
    id: ProductRatePlanChargeId,
    billingPeriod: Option[String],
    pricing: List[ZuoraPricing],
) derives JsonDecoder
