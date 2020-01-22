package com.gu.deliveryproblemcreditprocessor

import java.time.{DayOfWeek, LocalDate}

import cats.implicits._
import com.amazonaws.services.lambda.runtime.Context
import com.gu.creditprocessor.Processor
import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.fulfilmentdates.{FulfilmentDates, FulfilmentDatesFetcher}
import com.gu.salesforce.SalesforceConstants.soqlQueryBaseUrl
import com.gu.salesforce.{RecordsWrapperCaseClass, SFAuthConfig, SalesforceClient}
import com.gu.util.Logging
import com.gu.util.config.ConfigReads.ConfigFailure
import com.gu.util.config.{ConfigLocation, LoadConfigModule, Stage}
import com.gu.util.resthttp.RestOp._
import com.gu.util.resthttp.RestRequestMaker.{RelativePath, UrlParams}
import com.gu.util.resthttp.Types.ClientFailableOp
import com.gu.util.resthttp.{HttpOp, JsonHttp, RestRequestMaker}
import com.gu.zuora.{AccessToken, Zuora, ZuoraConfig}
import com.gu.zuora.ZuoraProductTypes.{GuardianWeekly, NewspaperHomeDelivery, ZuoraProductType}
import com.gu.zuora.subscription.{Price, RatePlanChargeCode, _}
import com.softwaremill.sttp.HttpURLConnectionBackend
import io.circe.generic.auto._
import io.github.mkotsur.aws.handler.Lambda
import io.github.mkotsur.aws.handler.Lambda._
import play.api.libs.json.JsValue
import scalaz.{-\/, \/-}
import zio.{DefaultRuntime, Task}

object Handler extends Lambda[None.type, List[DeliveryCreditResult]] with Logging {

  private val runtime = new DefaultRuntime {}

  private val sttpBackend = HttpURLConnectionBackend()

  override protected def handle(unused: None.type, context: Context): Either[Throwable, List[DeliveryCreditResult]] =
    runtime.unsafeRun {
      program.either
    }

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

  val program: Task[List[DeliveryCreditResult]] = {
    val productTypes = List(NewspaperHomeDelivery, GuardianWeekly)
    for {
      sfAuthConfig <- sfConfig
      zConfig <- zuoraConfig
      zAccessToken <- zuoraAccessToken(zConfig)
      results <- Task.foreach(productTypes)(processProduct(sfAuthConfig, zConfig, zAccessToken))
    } yield {
      results.flatten
    }
  }

  def processProduct(sfAuthConfig: SFAuthConfig, zuoraConfig: ZuoraConfig, zuoraAccessToken: AccessToken)(productType: ZuoraProductType): Task[List[DeliveryCreditResult]] =
    for {
      results <- Task.effect(
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
            writeCreditResultsToSalesforce
          )
          .creditResults
      )
    } yield {
      val (_, successes) = results.separate
      successes
    }

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
    SubscriptionUpdate.forDeliveryProblemCredit(creditProduct, subscription, deliveryDate)

  def resultOfZuoraCreditAdd(
    request: DeliveryCreditRequest,
    addedCharge: RatePlanCharge
  ): DeliveryCreditResult = DeliveryCreditResult(
    chargeCode = RatePlanChargeCode(addedCharge.number),
    amountCredited = Price(addedCharge.price)
  )

  // TODO: delivery dates not used - can requests from SF be left to client as val?
  def getCreditRequestsFromSalesforce[S](sfAuthConfig: SFAuthConfig)(
    productType: ZuoraProductType,
    unused: List[LocalDate]
  ): SalesforceApiResponse[List[DeliveryCreditRequest]] = {

    def soqlQuery(productType: ZuoraProductType) =
      s"""
         |SELECT SF_Subscription__r.Name, Delivery_Date__c, Charge_Code__c
         |FROM Delivery__c
         |WHERE SF_Subscription__r.Product_Type__c = '$productType'
         |AND Credit_Requested__c = true
         |AND Is_Actioned__c = false
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

  def writeCreditResultsToSalesforce(
    results: List[DeliveryCreditResult]
  ): SalesforceApiResponse[Unit] = {
    //TODO
    println("=== results ===")
    results.foreach(println)
    println("+++++++++++++++")
    Right(())
  }
}
