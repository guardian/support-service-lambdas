package com.gu.holidaystopprocessor

import java.time.LocalDate

import com.gu.creditprocessor.{ProcessResult, Processor, ZuoraCreditAddResult}
import com.gu.effects.S3Location
import com.gu.fulfilmentdates.FulfilmentDatesFetcher
import com.gu.holiday_stops.{Config, Zuora}
import com.gu.util.config.Stage
import com.gu.zuora.ZuoraProductTypes.{GuardianWeekly, NewspaperHomeDelivery, NewspaperVoucherBook}
import com.gu.zuora.subscription.OverallFailure
import com.softwaremill.sttp.{Id, SttpBackend}

import scala.util.Try

object HolidayStopCreditProcessor {

  def processAllProducts(
    config: Config,
    processDateOverride: Option[LocalDate],
    backend: SttpBackend[Id, Nothing],
    fetchFromS3: S3Location => Try[String]
  ): List[ProcessResult] =
    Zuora.accessTokenGetResponse(config.zuoraConfig, backend) match {
      case Left(err) =>
        List(ProcessResult(Nil, Nil, Nil, Some(OverallFailure(err.reason))))

      case Right(zuoraAccessToken) =>
        val fulfilmentDatesFetcher = FulfilmentDatesFetcher(fetchFromS3, Stage())
        List(
          NewspaperHomeDelivery,
          NewspaperVoucherBook,
          GuardianWeekly,
        )
        .map { productType =>
          Processor.processProduct(
            config,
            Salesforce.holidayStopRequests(config.sfConfig),
            fulfilmentDatesFetcher,
            processDateOverride,
            productType,
            Zuora.subscriptionGetResponse(config, zuoraAccessToken, backend),
            Zuora.subscriptionUpdateResponse(config, zuoraAccessToken, backend),
            ZuoraCreditAddResult.forHolidayStop,
            Salesforce.holidayStopUpdateResponse(config.sfConfig)
          )
        }
    }
}
