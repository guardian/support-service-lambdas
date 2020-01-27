package com.gu.deliveryproblemcreditprocessor

import java.time.{DayOfWeek, LocalDate, LocalDateTime}

import com.gu.creditprocessor.{ProcessResult, Processor}
import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.fulfilmentdates.{FulfilmentDates, FulfilmentDatesFetcher}
import com.gu.salesforce.SalesforceConstants.{sfObjectsBaseUrl, soqlQueryBaseUrl}
import com.gu.salesforce.{RecordsWrapperCaseClass, SFAuthConfig, SalesforceClient}
import com.gu.util.Logging
import com.gu.util.config.ConfigReads.ConfigFailure
import com.gu.util.config.{ConfigLocation, LoadConfigModule, Stage}
import com.gu.util.resthttp.RestOp._
import com.gu.util.resthttp.RestRequestMaker.{PatchRequest, RelativePath, UrlParams}
import com.gu.util.resthttp.Types.ClientFailableOp
import com.gu.util.resthttp.{HttpOp, JsonHttp, RestRequestMaker}
import com.gu.zuora.ZuoraProductTypes.{GuardianWeekly, NewspaperHomeDelivery, ZuoraProductType}
import com.gu.zuora.subscription.{Price, RatePlanChargeCode, _}
import com.gu.zuora.{AccessToken, Zuora, ZuoraConfig}
import com.softwaremill.sttp.HttpURLConnectionBackend
import play.api.libs.json.{JsValue, Json, Writes}
import scalaz.{-\/, \/-}
import zio.{Task, ZIO}

object DeliveryCreditProcessor extends Logging {

  private val sttpBackend = HttpURLConnectionBackend()

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
    Task.effect(Zuora.accessTokenGetResponse(config, sttpBackend)).absolve.mapError {
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
      creditResults <- Task.foreach(processResults)(dealWithProcessResult)
    } yield creditResults.flatten
  }

  def dealWithProcessResult(processResult: ProcessResult[DeliveryCreditResult]): Task[List[DeliveryCreditResult]] =
    for {
      _ <- Task.effect(ProcessResult.log(processResult))
      _ <- dealWithOverallException(processResult.overallFailure)
      results <- Task.foreach(processResult.creditResults)(result => dealWithCreditResult(result))
    } yield results

  def dealWithOverallException(overallFailure: Option[OverallFailure]): Task[Unit] =
    Task.effect(overallFailure).flatMap {
      case None => Task.succeed(())
      case Some(e) => Task.fail(new RuntimeException(e.reason))
    }

  def dealWithCreditResult(result: Either[ZuoraApiFailure, DeliveryCreditResult]): Task[DeliveryCreditResult] =
    ZIO.fromEither(result).mapError(e => new RuntimeException(e.reason))

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
            sttpBackend,
            DeliveryCreditProduct.forStage(Stage()),
            getCreditRequestsFromSalesforce(sfAuthConfig),
            fulfilmentDatesFetcher,
            processOverrideDate = None,
            productType,
            updateToApply,
            resultOfZuoraCreditAdd,
            writeCreditResultsToSalesforce(sfAuthConfig)
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
    deliveryDate: AffectedPublicationDate
  ): ZuoraApiResponse[SubscriptionUpdate] =
    SubscriptionUpdate.apply(creditProduct, subscription, deliveryDate)

  def resultOfZuoraCreditAdd(
    request: DeliveryCreditRequest,
    addedCharge: RatePlanCharge
  ): DeliveryCreditResult = DeliveryCreditResult(
    deliveryId = request.Id,
    chargeCode = RatePlanChargeCode(addedCharge.number),
    amountCredited = Price(addedCharge.price)
  )

  // TODO use http4s solution
  def getCreditRequestsFromSalesforce[S](sfAuthConfig: SFAuthConfig)(
    productType: ZuoraProductType,
    unused: List[LocalDate]
  ): SalesforceApiResponse[List[DeliveryCreditRequest]] = {

    def soqlQuery(productType: ZuoraProductType) =
      s"""
         |SELECT Id, SF_Subscription__r.Name, Delivery_Date__c, Charge_Code__c
         |FROM Delivery__c
         |WHERE SF_Subscription__r.Product_Type__c = '${productType.name}'
         |AND Credit_Requested__c = true
         |AND Is_Actioned__c = false
         |ORDER BY SF_Subscription__r.Name, Delivery_Date__c
         |""".stripMargin

    def sfRequest(productType: ZuoraProductType) = {
      logger.info(s"using SF query : ${soqlQuery(productType)}")
      RestRequestMaker.GetRequestWithParams(RelativePath(soqlQueryBaseUrl), UrlParams(Map("q" -> soqlQuery(productType))))
    }

    def sfResponse(sfGet: HttpOp[RestRequestMaker.GetRequestWithParams, JsValue]): ZuoraProductType => ClientFailableOp[List[DeliveryCreditRequest]] =
      sfGet
        .setupRequest { sfRequest }
        .parse[RecordsWrapperCaseClass[DeliveryCreditRequest]]
        .map(_.records)
        .runRequest

    SalesforceClient(RawEffects.response, sfAuthConfig).value.flatMap { sfAuth =>
      val sfGet = sfAuth.wrapWith(JsonHttp.getWithParams)
      sfResponse(sfGet)(productType)
    }.toDisjunction match {
      case -\/(failure) => Left(SalesforceApiFailure(failure.toString))
      case \/-(details) => Right(details)
    }
  }

  case class DeliveryCreditActioned(
    Charge_Code__c: RatePlanChargeCode,
    Credit_Amount__c: Price,
    Actioned_On__c: LocalDateTime
  )

  implicit val deliveryCreditActionedWrites: Writes[DeliveryCreditActioned] =
    Json.writes[DeliveryCreditActioned]

  // TODO use http4s solution
  def writeCreditResultsToSalesforce(sfAuthConfig: SFAuthConfig)(
    results: List[DeliveryCreditResult]
  ): SalesforceApiResponse[Unit] = {

    val deliverySfObjectRef = "Delivery__c"

    SalesforceClient(RawEffects.response, sfAuthConfig).value.map { sfAuth =>
      results map { result =>
        val actioned = DeliveryCreditActioned(
          result.chargeCode,
          result.amountCredited,
          LocalDateTime.now
        )
        sfAuth.wrapWith(JsonHttp.patch).setupRequest[DeliveryCreditActioned] { actionedInfo =>
          PatchRequest(
            actionedInfo,
            RelativePath(s"$sfObjectsBaseUrl$deliverySfObjectRef/${result.deliveryId.value}")
          )
        }.runRequest(actioned)
      }
    }.toDisjunction match {
      case -\/(failure) => Left(SalesforceApiFailure(failure.toString))
      case _ => Right(())
    }
  }
}
