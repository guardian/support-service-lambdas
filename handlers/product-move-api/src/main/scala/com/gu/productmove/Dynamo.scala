package com.gu.productmove

import com.gu.productmove.GuStageLive.Stage
import com.gu.productmove.endpoint.move.ProductMoveEndpointTypes.{ErrorResponse, InternalServerError}
import com.gu.supporterdata.model.Stage.{DEV, PROD, UAT}
import com.gu.supporterdata.model.SupporterRatePlanItem
import com.gu.supporterdata.services.SupporterDataDynamoService

import java.time.LocalDate
import scala.concurrent.ExecutionContext.Implicits.global
import zio.*
import zio.json.*

trait Dynamo {
  def writeItem(item: SupporterRatePlanItem): ZIO[Any, ErrorResponse, Unit]
}

object Dynamo {
  def writeItem(item: SupporterRatePlanItem): ZIO[Dynamo, ErrorResponse, Unit] = {
    ZIO.environmentWithZIO(_.get.writeItem(item))
  }
}

object DynamoLive {
  private def getStage(stage: Stage) = {
    stage match
      case Stage.DEV => DEV
      case Stage.CODE => DEV
      case Stage.PROD => PROD
  }

  val layer: ZLayer[Stage, ErrorResponse, Dynamo] =
    ZLayer.scoped {
      ZIO.service[Stage].map { stage =>
        val dynamoService = SupporterDataDynamoService(getStage(stage))

        new Dynamo {
          override def writeItem(item: SupporterRatePlanItem): ZIO[Any, ErrorResponse, Unit] =
            ZIO
              .fromFuture {
                dynamoService.writeItem(item)
              }
              .mapError { ex =>
                InternalServerError(
                  s"Failed to write to the Supporter Data Dynamo table for identityId: ${item.identityId} with subscription Number: ${item.subscriptionName} with error: ${ex.toString}",
                )
              }
              .flatMap { _ =>
                ZIO.log(
                  s"Successfully write to the Supporter Data Dynamo table for identityId: ${item.identityId} with subscription Number: ${item.subscriptionName}",
                )
              }
        }
      }
    }
}
