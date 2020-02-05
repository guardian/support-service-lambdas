package com.gu.deliveryproblemcreditprocessor

import java.time.{DayOfWeek, LocalDate, LocalDateTime}

import cats.data.EitherT
import cats.effect.IO
import cats.implicits._
import com.gu.creditprocessor.{ProcessResult, Processor}
import com.gu.effects.GetFromS3
import com.gu.fulfilmentdates.{FulfilmentDates, FulfilmentDatesFetcher}
import com.gu.salesforce.sttp.SalesforceClient
import com.gu.salesforce.{RecordsWrapperCaseClass, SFAuthConfig}
import com.gu.util.Logging
import com.gu.util.config.ConfigReads.ConfigFailure
import com.gu.util.config.{ConfigLocation, LoadConfigModule, Stage}
import com.gu.zuora.ZuoraProductTypes.{GuardianWeekly, NewspaperHomeDelivery, ZuoraProductType}
import com.gu.zuora.subscription._
import com.gu.zuora.{AccessToken, Zuora, ZuoraConfig}
import com.softwaremill.sttp.HttpURLConnectionBackend
import com.softwaremill.sttp.asynchttpclient.cats.AsyncHttpClientCatsBackend
import io.circe.generic.auto._
import zio.{Task, ZIO}

object DeliveryCreditProcessor extends Logging {

  private val zuoraSttpBackend = HttpURLConnectionBackend()
  private val sfSttpBackend = AsyncHttpClientCatsBackend[cats.effect.IO]()

  private lazy val stage = Stage()

  private lazy val sfConfig: Task[SFAuthConfig] =
    config(
      LoadConfigModule(stage, GetFromS3.fetchString)
        .apply[SFAuthConfig](ConfigLocation("sfAuth", 1), SFAuthConfig.reads)
        .toEither
    )

  private lazy val zuoraConfig: Task[ZuoraConfig] =
    config(
      LoadConfigModule(stage, GetFromS3.fetchString)
        .apply[ZuoraConfig](ConfigLocation("zuoraRest", 1), ZuoraConfig.reads)
        .toEither
    )

  private def config[A](a: Either[ConfigFailure, A]): Task[A] =
    Task.effect(a).absolve.mapError {
      case e: ConfigFailure => new RuntimeException(e.error)
      case e: Throwable => e
    }

  private def zuoraAccessToken(config: ZuoraConfig): Task[AccessToken] =
    Task.effect(Zuora.accessTokenGetResponse(config, zuoraSttpBackend)).absolve.mapError {
      case e: ZuoraApiFailure => new RuntimeException(e.reason)
      case e: Throwable => e
    }

  val processAllProducts: Task[List[DeliveryCreditResult]] = {
    val productTypes = List(NewspaperHomeDelivery, GuardianWeekly)
    for {
      sfAuthConfig <- sfConfig
      zConfig <- zuoraConfig
      zAccessToken <- zuoraAccessToken(zConfig)
      processResults <- Task.foreach(productTypes)(processProduct(sfAuthConfig, zConfig, zAccessToken))
      creditResults <- Task.foreach(processResults)(gatherCreditResults)
    } yield creditResults.flatten
  }

  def gatherCreditResults(processResult: ProcessResult[DeliveryCreditResult]): Task[List[DeliveryCreditResult]] =
    for {
      _ <- Task.effect(ProcessResult.log(processResult))
      _ <- Task.effect(processResult.overallFailure).flatMap {
        case None => Task.succeed(())
        case Some(e) => Task.fail(new RuntimeException(e.reason))
      }
      results <- Task.foreach(processResult.creditResults) { result =>
        ZIO.fromEither(result).mapError(e => new RuntimeException(e.reason))
      }
    } yield results

  def processProduct(
    sfAuthConfig: SFAuthConfig,
    zuoraConfig: ZuoraConfig,
    zuoraAccessToken: AccessToken
  )(productType: ZuoraProductType): Task[ProcessResult[DeliveryCreditResult]] =
    for {
      processResult <- Task.effect(
        Processor
          .processLiveProduct[DeliveryCreditRequest, DeliveryCreditResult](
            zuoraConfig,
            zuoraAccessToken,
            zuoraSttpBackend,
            DeliveryCreditProduct.forStage(Stage()),
            getCreditRequestsFromSalesforce(sfAuthConfig),
            fulfilmentDatesFetcher,
            processOverrideDate = None,
            productType,
            updateToApply,
            resultOfZuoraCreditAdd,
            writeCreditResultsToSalesforce(sfAuthConfig),
            Zuora.accountGetResponse(zuoraConfig, zuoraAccessToken, zuoraSttpBackend)
          )
      )
    } yield processResult

  // TODO: this isn't actually used so could be optional in the credit processor
  val fulfilmentDatesFetcher: FulfilmentDatesFetcher = (_, _) => {
    val tomorrow = LocalDate.now.plusDays(1)
    val fulfilmentDates = FulfilmentDates(
      today = LocalDate.now,
      deliveryAddressChangeEffectiveDate = None,
      holidayStopFirstAvailableDate = tomorrow,
      holidayStopProcessorTargetDate = Some(tomorrow),
      finalFulfilmentFileGenerationDate = None
    )
    Right(
      DayOfWeek
        .values()
        .map { _ -> fulfilmentDates }
        .toMap
    )
  }

  def updateToApply(
    creditProduct: CreditProduct,
    subscription: Subscription,
    account: ZuoraAccount,
    deliveryDate: AffectedPublicationDate
  ): ZuoraApiResponse[SubscriptionUpdate] =
    SubscriptionUpdate.apply(creditProduct, subscription, account, deliveryDate)

  def resultOfZuoraCreditAdd(
    request: DeliveryCreditRequest,
    addedCharge: RatePlanCharge
  ): DeliveryCreditResult = DeliveryCreditResult(
    deliveryId = request.Id,
    chargeCode = RatePlanChargeCode(addedCharge.number),
    amountCredited = Price(addedCharge.price)
  )

  def getCreditRequestsFromSalesforce(sfAuthConfig: SFAuthConfig)(
    productType: ZuoraProductType,
    unused: List[LocalDate]
  ): SalesforceApiResponse[List[DeliveryCreditRequest]] = {

    def queryForDeliveryRecords(
      salesforceClient: SalesforceClient[IO],
      productType: ZuoraProductType
    ): EitherT[IO, SalesforceApiFailure, RecordsWrapperCaseClass[DeliveryCreditRequest]] = {
      val qry = deliveryRecordsQuery(productType)
      logger.info(s"Running SF query:\n$qry")
      salesforceClient
        .query[DeliveryCreditRequest](qry)
        .leftMap { error =>
          SalesforceApiFailure(s"Exception querying SF for delivery records: ${error.toString}")
        }
    }

    def deliveryRecordsQuery(productType: ZuoraProductType) =
      s"""
         |SELECT Id, SF_Subscription__r.Name, Delivery_Date__c, Charge_Code__c
         |FROM Delivery__c
         |WHERE SF_Subscription__r.Product_Type__c = '${productType.name}'
         |AND Credit_Requested__c = true
         |AND Is_Actioned__c = false
         |ORDER BY SF_Subscription__r.Name, Delivery_Date__c
         |""".stripMargin

    val results = for {
      salesforceClient <- SalesforceClient(sfSttpBackend, sfAuthConfig).leftMap { e =>
        SalesforceApiFailure(e.message)
      }
      queryResult <- queryForDeliveryRecords(salesforceClient, productType)
    } yield queryResult.records

    /*
     * TODO: doing this at this level to avoid having to rewrite holiday-stop credit query as well.
     * But would be better to have common code in the credit-processor to run queries and just supply
     * the query and the return type.  Then effect could be run at a much higher level.
     * (Or converted to a Zio effect and run at a much higher level.)
     */
    results.value.unsafeRunSync()
  }

  case class DeliveryCreditActioned(
    Charge_Code__c: String,
    Credit_Amount__c: Double,
    Actioned_On__c: LocalDateTime
  )

  def writeCreditResultsToSalesforce(sfAuthConfig: SFAuthConfig)(
    results: List[DeliveryCreditResult]
  ): SalesforceApiResponse[_] = {

    val deliveryObject = "Delivery__c"

    val responses = SalesforceClient(sfSttpBackend, sfAuthConfig).leftMap { e =>
      SalesforceApiFailure(e.message)
    }.flatMap { salesforceClient =>
      results.map { result =>
        val actioned = DeliveryCreditActioned(
          result.chargeCode.value,
          result.amountCredited.value,
          LocalDateTime.now
        )
        salesforceClient.patch(
          deliveryObject,
          objectId = result.deliveryId,
          body = actioned
        ).leftMap { e =>
          SalesforceApiFailure(e.message)
        }
      }.sequence
    }

    /*
     * TODO: doing this at this level to avoid having to rewrite holiday-stop credit query as well.
     * But would be better to have common code in the credit-processor to run queries and just supply
     * the query and the return type.  Then effect could be run at a much higher level.
     * (Or converted to a Zio effect and run at a much higher level.)
     */
    responses.value.unsafeRunSync()
  }
}
