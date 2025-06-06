package com.gu.productmove

import com.gu.productmove.GuStageLive.Stage
import com.gu.supporterdata.model.Stage.{CODE, PROD}
import com.gu.supporterdata.model.SupporterRatePlanItem
import com.gu.supporterdata.services.SupporterDataDynamoService

import java.time.LocalDate
import scala.concurrent.ExecutionContext.Implicits.global
import zio.*
import zio.json.*

import scala.concurrent.ExecutionContext

trait Dynamo {
  def writeItem(item: SupporterRatePlanItem): Task[Unit]
}

object Dynamo {
  def writeItem(item: SupporterRatePlanItem): RIO[Dynamo, Unit] = {
    ZIO.environmentWithZIO(_.get.writeItem(item))
  }
}

object DynamoLive {
  private def getStage(stage: Stage) = {
    stage match {
      case Stage.CODE =>
        CODE
      case Stage.PROD => PROD
    }
  }

  val layer: RLayer[Stage, Dynamo] =
    ZLayer.scoped {
      ZIO.service[Stage].map { stage =>
        val dynamoService = SupporterDataDynamoService(getStage(stage))

        new Dynamo {
          override def writeItem(item: SupporterRatePlanItem): Task[Unit] =
            ZIO
              .fromFuture {
                dynamoService.writeItem(item)(using _)
              }
              .mapError { ex =>
                new Throwable(
                  s"Failed to write to the Supporter Data Dynamo table for identityId: ${item.identityId} with subscription Number: ${item.subscriptionName} with error: ${ex.toString}",
                  ex,
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
