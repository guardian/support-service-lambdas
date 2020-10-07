package com.gu.holidaystopprocessor

import java.time.LocalDate

import com.gu.creditprocessor.Processor.CreditProductForSubscription
import com.gu.creditprocessor.{ProcessResult, Processor}
import com.gu.effects.S3Location
import com.gu.fulfilmentdates.FulfilmentDatesFetcher
import com.gu.holiday_stops.Config
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestsDetail.HolidayStopRequestsDetail
import com.gu.util.config.Stage
import com.gu.zuora.Zuora
import com.gu.zuora.ZuoraProductTypes._
import com.gu.zuora.subscription.{OverallFailure, Subscription, SubscriptionUpdate, ZuoraAccount}
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
          NewspaperDigitalVoucher,
          GuardianWeekly,
        )
        .map { productType => {

          def updateToApply(
             creditProduct: CreditProductForSubscription,
             subscription: Subscription,
             account: ZuoraAccount,
             request: HolidayStopRequestsDetail
          ) =
             SubscriptionUpdate(
              creditProduct(subscription),
              subscription,
              account,
              request.Stopped_Publication_Date__c,
              None
            )

          Processor.processLiveProduct(
            config.zuoraConfig,
            zuoraAccessToken,
            backend,
            HolidayCreditProduct.forStage(stage),
            Salesforce.holidayStopRequests(config.sfConfig),
            fulfilmentDatesFetcher,
            processDateOverride,
            productType,
            updateToApply,
            ZuoraHolidayCreditAddResult.apply,
            Salesforce.holidayStopUpdateResponse(config.sfConfig),
            Zuora.accountGetResponse(config.zuoraConfig, zuoraAccessToken, backend)
          )
        }
        }
    }
}
