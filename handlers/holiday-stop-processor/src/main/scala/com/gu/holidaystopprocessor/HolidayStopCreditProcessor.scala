package com.gu.holidaystopprocessor

import java.time.LocalDate

import com.gu.creditprocessor.{ProcessResult, Processor}
import com.gu.effects.S3Location
import com.gu.fulfilmentdates.FulfilmentDatesFetcher
import com.gu.holiday_stops.{Config, Zuora}
import com.gu.util.config.Stage
import com.gu.zuora.ZuoraProductTypes.{GuardianWeekly, NewspaperHomeDelivery, NewspaperVoucherBook}
import com.gu.zuora.subscription.{OverallFailure, SubscriptionUpdate}
import com.softwaremill.sttp.{Id, SttpBackend}

import scala.util.Try

object HolidayStopCreditProcessor {

  def processAllProducts(
    config: Config,
    processDateOverride: Option[LocalDate],
    backend: SttpBackend[Id, Nothing],
    fetchFromS3: S3Location => Try[String]
  ): List[ProcessResult[ZuoraHolidayCreditAddResult]] =
    Zuora.accessTokenGetResponse(config.zuoraConfig, backend) match {
      case Left(err) =>
        List(ProcessResult(Nil, Nil, Nil, Some(OverallFailure(err.reason))))

      case Right(zuoraAccessToken) =>
        val stage = Stage()
        val fulfilmentDatesFetcher = FulfilmentDatesFetcher(fetchFromS3, stage)
        List(
          NewspaperHomeDelivery,
          NewspaperVoucherBook,
          GuardianWeekly,
        )
        .map { productType =>
          Processor.processProduct(
            HolidayCreditProduct.forStage(stage),
            Salesforce.holidayStopRequests(config.sfConfig),
            fulfilmentDatesFetcher,
            processDateOverride,
            productType,
            Zuora.subscriptionGetResponse(config, zuoraAccessToken, backend),
            SubscriptionUpdate.forHolidayStop,
            Zuora.subscriptionUpdateResponse(config, zuoraAccessToken, backend),
            ZuoraHolidayCreditAddResult.apply,
            Salesforce.holidayStopUpdateResponse(config.sfConfig)
          )
        }
    }
}
