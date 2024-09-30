package com.gu.creditprocessor

import cats.syntax.all._
import com.gu.fulfilmentdates.FulfilmentDatesFetcher
import com.gu.zuora.ZuoraLockingContention.retryLockingContention
import com.gu.zuora.ZuoraProductTypes.ZuoraProductType
import com.gu.zuora.subscription._
import com.gu.zuora.{AccessToken, HolidayStopProcessorZuoraConfig, Zuora}
import org.slf4j.LoggerFactory
import sttp.client3.{Identity, SttpBackend}

import java.time.LocalDate
import scala.collection.parallel.CollectionConverters.ImmutableSeqIsParallelizable
import scala.collection.parallel.ForkJoinTaskSupport

object Processor {

  type CreditProductForSubscription = Subscription => CreditProduct

  private val logger = LoggerFactory.getLogger(getClass)

  def processLiveProduct[Request <: CreditRequest, Result <: ZuoraCreditAddResult](
      config: HolidayStopProcessorZuoraConfig,
      zuoraAccessToken: AccessToken,
      sttpBackend: SttpBackend[Identity, Any],
      creditProduct: CreditProductForSubscription,
      getCreditRequestsFromSalesforce: (ZuoraProductType, List[LocalDate]) => SalesforceApiResponse[List[Request]],
      fulfilmentDatesFetcher: FulfilmentDatesFetcher,
      processOverrideDate: Option[LocalDate],
      productType: ZuoraProductType,
      updateToApply: (
          CreditProductForSubscription,
          Subscription,
          ZuoraAccount,
          Request,
      ) => ZuoraApiResponse[SubscriptionUpdate],
      resultOfZuoraCreditAdd: (Request, RatePlanCharge) => Result,
      writeCreditResultsToSalesforce: List[Result] => SalesforceApiResponse[_],
      getAccount: String => ZuoraApiResponse[ZuoraAccount],
      getNextInvoiceDate: String => ZuoraApiResponse[LocalDate] = null, // FIXME
  ): List[ProcessResult[Result]] = {

    def getSubscription(
        subscriptionName: SubscriptionName,
    ): ZuoraApiResponse[Subscription] =
      Zuora.subscriptionGetResponse(config, zuoraAccessToken, sttpBackend)(subscriptionName)

    def updateSubscription(
        subscription: Subscription,
        update: SubscriptionUpdate,
    ): ZuoraApiResponse[Unit] =
      retryLockingContention(2, subscription.subscriptionNumber) {
        Zuora.subscriptionUpdateResponse(config, zuoraAccessToken, sttpBackend)(subscription, update)
      }

    processProduct(
      creditProduct: CreditProductForSubscription,
      getCreditRequestsFromSalesforce: (ZuoraProductType, List[LocalDate]) => SalesforceApiResponse[List[Request]],
      fulfilmentDatesFetcher: FulfilmentDatesFetcher,
      processOverrideDate: Option[LocalDate],
      productType: ZuoraProductType,
      getSubscription: SubscriptionName => ZuoraApiResponse[Subscription],
      getAccount: String => ZuoraApiResponse[ZuoraAccount],
      updateToApply: (
          CreditProductForSubscription,
          Subscription,
          ZuoraAccount,
          Request,
      ) => ZuoraApiResponse[SubscriptionUpdate],
      updateSubscription: (Subscription, SubscriptionUpdate) => ZuoraApiResponse[Unit],
      resultOfZuoraCreditAdd: (Request, RatePlanCharge) => Result,
      writeCreditResultsToSalesforce: List[Result] => SalesforceApiResponse[_],
      getNextInvoiceDate: String => ZuoraApiResponse[LocalDate],
    )
  }

  def processProduct[Request <: CreditRequest, Result <: ZuoraCreditAddResult](
      creditProduct: CreditProductForSubscription,
      getCreditRequestsFromSalesforce: (ZuoraProductType, List[LocalDate]) => SalesforceApiResponse[List[Request]],
      fulfilmentDatesFetcher: FulfilmentDatesFetcher,
      processOverrideDate: Option[LocalDate],
      productType: ZuoraProductType,
      getSubscription: SubscriptionName => ZuoraApiResponse[Subscription],
      getAccount: String => ZuoraApiResponse[ZuoraAccount],
      updateToApply: (
          CreditProductForSubscription,
          Subscription,
          ZuoraAccount,
          Request,
      ) => ZuoraApiResponse[SubscriptionUpdate],
      updateSubscription: (Subscription, SubscriptionUpdate) => ZuoraApiResponse[Unit],
      resultOfZuoraCreditAdd: (Request, RatePlanCharge) => Result,
      writeCreditResultsToSalesforce: List[Result] => SalesforceApiResponse[_],
      getNextInvoiceDate: String => ZuoraApiResponse[LocalDate] = null, // FIXME,
  ): List[ProcessResult[Result]] = {

    val creditRequestsFromSalesforce = for {
      datesToProcess <- getDatesToProcess(fulfilmentDatesFetcher, productType, processOverrideDate, LocalDate.now())
      _ = logger.info(s"Processing credits for ${productType.name} for issue dates ${datesToProcess.mkString(", ")}")
      salesforceCreditRequests <-
        if (datesToProcess.isEmpty) Nil.asRight else getCreditRequestsFromSalesforce(productType, datesToProcess)
    } yield salesforceCreditRequests

    creditRequestsFromSalesforce match {
      case Left(sfReadError) =>
        List(ProcessResult(Nil, Nil, Nil, Some(OverallFailure(sfReadError.reason))))

      case Right(creditRequestsFromSalesforce) =>
        val creditRequests = creditRequestsFromSalesforce.distinct
        val alreadyActionedCredits = creditRequestsFromSalesforce.flatMap(_.chargeCode).distinct

        def updateSaleforce(
            creditRequests: List[Request],
            zuoraApiResponse: ZuoraApiResponse[Result],
            creditAddResult: Result,
        ) = {
          val notAlreadyActionedCredits =
            List(creditAddResult).filterNot(v => alreadyActionedCredits.contains(v.chargeCode))
          val salesForceResponse = writeCreditResultsToSalesforce(
            notAlreadyActionedCredits,
          )

          ProcessResult(
            creditRequests,
            List(zuoraApiResponse),
            notAlreadyActionedCredits,
            OverallFailure(List.empty, salesForceResponse),
          )
        }

        def updateInZuoraAndSf(creditRequests: List[Request]) = {
          creditRequests.map { creditRequest =>
            val zuoraApiResponse = addCreditToSubscription(
              creditProduct,
              getSubscription,
              getAccount,
              updateToApply,
              updateSubscription,
              resultOfZuoraCreditAdd,
              getNextInvoiceDate,
            )(creditRequest)

            val sfResult =
              zuoraApiResponse
                .map(ar => updateSaleforce(creditRequests, zuoraApiResponse, ar))
                .leftMap(failure =>
                  ProcessResult(
                    creditRequests,
                    List(zuoraApiResponse),
                    List.empty,
                    Some(OverallFailure(failure.reason)),
                  ),
                )

            sfResult
          }
        }

        logger.info(s"Processing ${creditRequests.length} credits in Zuora ...")

        // we group the creditRequests by subscription to make the requests to zuora in parallel
        // & avoid lock contention on the resource

        val creditRequestBatches =
          creditRequests
            .groupBy(_.subscriptionName)
            .values
            .toList
            .par

        val requestConcurrency = 20
        /*https://developer.zuora.com/docs/guides/rate-limits/#concurrent-request-limits
        Zuora supports up to 40 concurrent requests until migration to orders API which supports 200
         */
        val forkJoinPool = new java.util.concurrent.ForkJoinPool(requestConcurrency)
        creditRequestBatches.tasksupport = new ForkJoinTaskSupport(forkJoinPool)

        val processResults =
          creditRequestBatches
            .map(requests => updateInZuoraAndSf(requests))
            .toList
            .flatten

        forkJoinPool.shutdown()
        processResults.map(_.merge)
    }
  }

  // FIXME: Temporary test in production to validate migration to https://github.com/guardian/invoicing-api/pull/20
  import java.util.concurrent.Executors
  import scala.concurrent.{ExecutionContext, Future}

  private val ecForTestInProd = ExecutionContext.fromExecutor(Executors.newSingleThreadExecutor)
  private def testInProdNextInvoiceDate(
      subscription: Subscription,
      getNextInvoiceDate: String => ZuoraApiResponse[LocalDate],
      expected: SubscriptionUpdate,
  ): Future[_] = Future {
    (getNextInvoiceDate(subscription.subscriptionNumber)
      .map { actual =>
        if (expected.add.forall(_.contractEffectiveDate == actual)) {
          // logger.info("testInProdNextInvoiceDate OK")
        } else {
          logger.error(s"testInProdNextInvoiceDate failed because ${expected.add.head} =/= $actual")
        }
      })
      .left
      .map { e =>
        logger.error(s"testInProdNextInvoiceDate failed because invoicing-api error: $e")
      }
  }(ecForTestInProd)

  /** This is the main business logic for adding a credit amendment to a subscription in Zuora
    */
  def addCreditToSubscription[Request <: CreditRequest, Result <: ZuoraCreditAddResult](
      creditProduct: CreditProductForSubscription,
      getSubscription: SubscriptionName => ZuoraApiResponse[Subscription],
      getAccount: String => ZuoraApiResponse[ZuoraAccount],
      updateToApply: (
          CreditProductForSubscription,
          Subscription,
          ZuoraAccount,
          Request,
      ) => ZuoraApiResponse[SubscriptionUpdate],
      updateSubscription: (Subscription, SubscriptionUpdate) => ZuoraApiResponse[Unit],
      result: (Request, RatePlanCharge) => Result,
      getNextInvoiceDate: String => ZuoraApiResponse[LocalDate] = null, // FIXME
  )(request: Request): ZuoraApiResponse[Result] =
    for {
      subscription <- getSubscription(request.subscriptionName)
      account <- getAccount(subscription.accountNumber)
      _ <-
        if (subscription.status == "Cancelled")
          Left(
            ZuoraApiFailure(
              s"Cannot process cancelled subscription because Zuora does not allow amending cancelled subs (Code: 58730020). Apply manual refund ASAP! $request; ${subscription.subscriptionNumber};",
            ),
          )
        else Right(())
      subscriptionUpdate <- updateToApply(creditProduct, subscription, account, request) // FIXME: Deprecated
      _ = testInProdNextInvoiceDate(subscription, getNextInvoiceDate, subscriptionUpdate)
      // FIXME: nextInvoiceDate <- getNextInvoiceDate(subscription.subscriptionNumber)
      // FIXME: subscriptionUpdate <- SubscriptionUpdate(creditProduct(subscription), subscription, account, request.publicationDate, Some(InvoiceDate(nextInvoiceDate)))
      _ <-
        if (subscription.hasCreditAmendment(request)) Right(())
        else updateSubscription(subscription, subscriptionUpdate)
      updatedSubscription <- getSubscription(request.subscriptionName)
      addedCharge <- updatedSubscription
        .ratePlanCharge(request)
        .toRight(ZuoraApiFailure(s"Failed to write credit amendment to Zuora: $request"))
    } yield {
      logger.info(s"Added credit ${addedCharge.number} to ${subscription.subscriptionNumber}")
      result(request, addedCharge)
    }

  def getDatesToProcess(
      fulfilmentDatesFetcher: FulfilmentDatesFetcher,
      zuoraProductType: ZuoraProductType,
      processOverRideDate: Option[LocalDate],
      today: LocalDate,
  ): Either[ZuoraApiFailure, List[LocalDate]] = {
    processOverRideDate
      .fold(
        fulfilmentDatesFetcher
          .getFulfilmentDates(zuoraProductType, today)
          .map(fulfilmentDates => fulfilmentDates.values.flatMap(_.holidayStopProcessorTargetDate).toList)
          .left
          .map(error => ZuoraApiFailure(s"Failed to fetch fulfilment dates: $error")),
      )(processOverRideDate => List(processOverRideDate).asRight)
  }

}
