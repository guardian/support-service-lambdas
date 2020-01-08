package com.gu.holidaystopprocessor

import java.time.LocalDate

import cats.implicits._
import com.gu.effects.S3Location
import com.gu.fulfilmentdates.FulfilmentDatesFetcher
import com.gu.holiday_stops._
import com.gu.holiday_stops.subscription._
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestsDetail._
import com.gu.util.config.Stage
import com.gu.zuora.ZuoraProductTypes.{GuardianWeekly, NewspaperHomeDelivery, NewspaperVoucherBook, ZuoraProductType}
import com.softwaremill.sttp.{Id, SttpBackend}
import org.slf4j.LoggerFactory

import scala.util.Try


object Processor {
  private val logger = LoggerFactory.getLogger(this.getClass)

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
          processProduct(
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

  def processProduct[RequestType <: CreditRequest, ResultType <: ZuoraCreditAddResult](
    config: Config,
    getCreditRequestsFromSalesforce: (ZuoraProductType, List[LocalDate]) => SalesforceApiResponse[List[RequestType]],
    fulfilmentDatesFetcher: FulfilmentDatesFetcher,
    processOverrideDate: Option[LocalDate],
    productType: ZuoraProductType,
    getSubscription: SubscriptionName => ZuoraApiResponse[Subscription],
    updateSubscription: (Subscription, SubscriptionUpdate) => ZuoraApiResponse[Unit],
    resultOfZuoraCreditAdd: (RequestType, RatePlanCharge) => ResultType,
    writeCreditResultsToSalesforce: List[ResultType] => SalesforceApiResponse[Unit]
  ): ProcessResult = {
    val creditRequestsFromSalesforce = for {
      datesToProcess <- getDatesToProcess(fulfilmentDatesFetcher, productType, processOverrideDate, LocalDate.now())
      _ = logger.info(s"Processing holiday stops for $productType for issue dates ${datesToProcess.mkString(", ")}")
      salesforceCreditRequests <-
        if(datesToProcess.isEmpty) Nil.asRight else getCreditRequestsFromSalesforce(productType, datesToProcess)
    } yield salesforceCreditRequests

    creditRequestsFromSalesforce match {
      case Left(sfReadError) =>
        ProcessResult(Nil, Nil, Nil, Some(OverallFailure(sfReadError.reason)))

      case Right(creditRequestsFromSalesforce) =>
        val creditRequests = creditRequestsFromSalesforce.distinct
        val alreadyActionedCredits = creditRequestsFromSalesforce.flatMap(_.chargeCode).distinct
        val allZuoraCreditResponses = creditRequests.map(
          addCreditToSubscription(
            config,
            getSubscription,
            updateSubscription,
            resultOfZuoraCreditAdd
          )
        )
        val (failedZuoraResponses, successfulZuoraResponses) = allZuoraCreditResponses.separate
        val notAlreadyActionedCredits = successfulZuoraResponses.filterNot(v => alreadyActionedCredits.contains(v.chargeCode))
        val salesforceExportResult = writeCreditResultsToSalesforce(notAlreadyActionedCredits)
        ProcessResult(
          creditRequests,
          allZuoraCreditResponses,
          notAlreadyActionedCredits,
          OverallFailure(failedZuoraResponses, salesforceExportResult)
        )
    }
  }

  /**
   * This is the main business logic for adding a credit amendment to a subscription in Zuora
   */
  def addCreditToSubscription[RequestType <: CreditRequest, ResultType <: ZuoraCreditAddResult](
    config: Config,
    getSubscription: SubscriptionName => ZuoraApiResponse[Subscription],
    updateSubscription: (Subscription, SubscriptionUpdate) => ZuoraApiResponse[Unit],
    result: (RequestType, RatePlanCharge) => ResultType
  )(request: RequestType): ZuoraApiResponse[ResultType] = {
    for {
      subscription <- getSubscription(request.subscriptionName)
      subscriptionData <- SubscriptionData(subscription)
      issueData <- subscriptionData.issueDataForDate(request.publicationDate.value)
      _ <- if (subscription.status == "Cancelled") Left(ZuoraApiFailure(s"Cannot process cancelled subscription because Zuora does not allow amending cancelled subs (Code: 58730020). Apply manual refund ASAP! $request; ${ subscription.subscriptionNumber};")) else Right(())
      maybeExtendedTerm = ExtendedTerm(issueData.nextBillingPeriodStartDate, subscription)
      subscriptionUpdate <- SubscriptionUpdate.forHolidayStop(
        config.creditProduct,
        subscription,
        request.publicationDate.value,
        maybeExtendedTerm,
        HolidayStopCredit(issueData.credit, issueData.nextBillingPeriodStartDate)
      )
      _ <- if (subscription.hasCreditAmendment(request)) Right(()) else updateSubscription(subscription, subscriptionUpdate)
      updatedSubscription <- getSubscription(request.subscriptionName)
      addedCharge <- updatedSubscription.ratePlanCharge(request).toRight(ZuoraApiFailure(s"Failed to write holiday stop to Zuora: $request"))
    } yield result(request, addedCharge)
  }

  def getDatesToProcess(
    fulfilmentDatesFetcher: FulfilmentDatesFetcher,
    zuoraProductType: ZuoraProductType,
    processOverRideDate: Option[LocalDate],
    today: LocalDate
  ): Either[ZuoraApiFailure, List[LocalDate]] = {
    processOverRideDate
      .fold(
        fulfilmentDatesFetcher
          .getFulfilmentDates(zuoraProductType, today)
          .map( fulfilmentDates =>
            fulfilmentDates.values.flatMap(_.holidayStopProcessorTargetDate).toList
          )
          .leftMap(error => ZuoraApiFailure(s"Failed to fetch fulfilment dates: $error"))
      )(
        processOverRideDate => List(processOverRideDate).asRight
      )
  }
}

