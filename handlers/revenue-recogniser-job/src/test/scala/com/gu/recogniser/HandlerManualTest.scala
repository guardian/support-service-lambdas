package com.gu.recogniser

import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.util.config.{LoadConfigModule, Stage}
import com.gu.util.resthttp.RestRequestMaker
import com.gu.util.resthttp.RestRequestMaker.{Requests, WithoutCheck}
import com.gu.util.resthttp.Types.{ClientFailableOp, ClientSuccess}
import com.gu.util.zuora.{ZuoraRestConfig, ZuoraRestRequestMaker}
import com.gu.zuora.reports.Querier
import com.gu.zuora.reports.aqua.ZuoraAquaRequestMaker
import okhttp3.{Request, Response}
import play.api.libs.json.{JsValue, Json, Reads, __}

import java.time.LocalDate

/*
Run this in order to set up data in dev so that you can run the job and it will find some data
 */
object CreateExpiredGiftTestSubscriptionManualTest {

  def main(args: Array[String]): Unit = {

    val startDate = LocalDate.of(2020, 2, 9)

    val actual = for {
      zuoraRestConfig <- LoadConfigModule(Stage("CODE"), GetFromS3.fetchString)[ZuoraRestConfig]
      zuoraDeps = ZuoraRestRequestMaker(RawEffects.response, zuoraRestConfig)
      subNumber <- ZuoraGiftSubscribe
        .subscribe(zuoraDeps, startDate)
        .toDisjunction
        .left
        .map(httpError => new RuntimeException(httpError.toString))
    } yield subNumber
    println("result: " + actual)
    println("****\nNOTE: wait a while as the revenue schedule isn't created straight away\n****")

  }
}

object CreateRefundedBeforeRedemptionTestSubscriptionManualTest {

  def main(args: Array[String]): Unit = {

    val startDate = LocalDate.now().minusWeeks(2) // arbitrary recent but not expired

    val actual = for {
      zuoraRestConfig <- LoadConfigModule(Stage("CODE"), GetFromS3.fetchString)[ZuoraRestConfig]
      zuoraDeps = ZuoraRestRequestMaker(RawEffects.response, zuoraRestConfig)
      subNumber <- ZuoraGiftSubscribe
        .subscribe(zuoraDeps, startDate)
        .toDisjunction
        .left
        .map(httpError => new RuntimeException(httpError.toString))
    } yield subNumber
    println("result: " + actual)
    println("****\nNOTE: wait a while as the revenue schedule isn't created straight away\n****")

  }
}

object RunQueryManualTest {

  def main(args: Array[String]): Unit = {

    val actual = for {
      zuoraRestConfig <- LoadConfigModule(Stage("CODE"), GetFromS3.fetchString)[ZuoraRestConfig]
      downloadRequests = ZuoraAquaRequestMaker(RawEffects.downloadResponse, zuoraRestConfig)
      aquaQuerier = Querier.lowLevel(downloadRequests) _
      schedules <- new RevenueSchedulesQuerier(
        println,
        new BlockingAquaQueryImpl(aquaQuerier, downloadRequests, println),
        GetSubscription(ZuoraRestRequestMaker(RawEffects.response, zuoraRestConfig)),
      ).execute()
    } yield schedules
    println("result: " + actual.map(_.mkString("\n")))

  }

}

object RunQueryAndPartitionManualTest {

  def main(args: Array[String]): Unit = {

    val actual = for {
      zuoraRestConfig <- LoadConfigModule(Stage("PROD"), GetFromS3.fetchString)[ZuoraRestConfig]
      downloadRequests = ZuoraAquaRequestMaker(RawEffects.downloadResponse, zuoraRestConfig)
      aquaQuerier = Querier.lowLevel(downloadRequests) _
      schedules <- new RevenueSchedulesQuerier(
        println,
        new BlockingAquaQueryImpl(aquaQuerier, downloadRequests, println),
        GetSubscription(ZuoraRestRequestMaker(RawEffects.response, zuoraRestConfig)),
      ).execute()
    } yield new PartitionSchedules(() => LocalDate.now(), println, println).partition(schedules)
    println("\n\nresult1:\n" + actual.map(_._1.mkString("\n")))
    println("\n\nresult2:\n" + actual.map(_._2.mkString("\n")))

  }

}

object RunLambdaManualTest {

  def main(args: Array[String]): Unit = {

    val actual = for {
      zuoraRestConfig <- LoadConfigModule(Stage("PROD"), GetFromS3.fetchString)[ZuoraRestConfig]
      _ <- fakeSteps(
        println,
        RawEffects.downloadResponse,
        RawEffects.response,
        zuoraRestConfig,
        () => LocalDate.now(),
      ).execute()
    } yield ()
    println("result: " + actual)

  }

  def fakeSteps(
      log: String => Unit,
      downloadResponse: Request => Response,
      response: Request => Response,
      zuoraRestConfig: ZuoraRestConfig,
      today: () => LocalDate,
  ): Steps = {
    val downloadRequests = ZuoraAquaRequestMaker(downloadResponse, zuoraRestConfig)
    val requests = ZuoraRestRequestMaker(response, zuoraRestConfig)
    val aquaQuerier = Querier.lowLevel(downloadRequests) _
    val fakeDistributeRevenueOnSpecificDate = new DistributeRevenueOnSpecificDate(null) {
      override def distribute(revenueScheduleNumber: String, dateToDistribute: LocalDate): ClientFailableOp[Unit] = {
        log(s"trying to distribute $revenueScheduleNumber on $dateToDistribute")
        ClientSuccess(())
      }
    }
    val fakeDistributeRevenueWithDateRange = new DistributeRevenueWithDateRange(null) {
      override def distribute(
          revenueScheduleNumber: String,
          startDate: LocalDate,
          endDate: LocalDate,
      ): ClientFailableOp[Unit] = {
        log(s"trying to distribute $revenueScheduleNumber across dates $startDate - $endDate")
        ClientSuccess(())
      }
    }
    new Steps(
      log,
      today,
      log,
      new RevenueSchedulesQuerier(
        log,
        new BlockingAquaQueryImpl(aquaQuerier, downloadRequests, log),
        GetSubscription(requests),
      ),
      fakeDistributeRevenueOnSpecificDate,
      fakeDistributeRevenueWithDateRange,
    )
  }

}

object GetSubscriptionChargeId {

  case class SubscriptionResult(chargeId: String)

  implicit val reads: Reads[SubscriptionResult] =
    (((__ \ "ratePlans")(0) \ "ratePlanCharges")(0) \ "id").read[String].map(SubscriptionResult)

  def apply(requests: Requests, subscriptionName: String): ClientFailableOp[String] =
    requests.get[SubscriptionResult](s"subscriptions/$subscriptionName").map(_.chargeId)

}

object CreateRevenueSchedule {

  case class RevenueEvent(
      eventType: String = "Digital Subscription Gift Redeemed",
      eventTypeSystemId: String = "DigitalSubscriptionGiftRedeemed",
  )

  case class RevenueDistribution(
      newAmount: String,
      accountingPeriodName: String = "Open-Ended",
  )

  case class CreateRevenueScheduleRequest(
      amount: String,
      revenueScheduleDate: LocalDate,
      revenueDistributions: List[RevenueDistribution],
      revenueEvent: RevenueEvent = RevenueEvent(),
  )

  implicit val eventWrites = Json.writes[RevenueEvent]
  implicit val revenueDistributionWrites = Json.writes[RevenueDistribution]
  implicit val writes = Json.writes[CreateRevenueScheduleRequest]

  case class CreateRevenueScheduleResult(number: String)

  implicit val reads: Reads[CreateRevenueScheduleResult] =
    ((__ \ "revenueScheduleNumber").read[String]).map(CreateRevenueScheduleResult.apply _)

}
case class CreateRevenueSchedule(restRequestMaker: RestRequestMaker.Requests) {

  import CreateRevenueSchedule._

  // https://www.zuora.com/developer/api-reference/#operation/POST_RSforSubscCharge
  def create(
      chargeId: String,
      today: LocalDate,
  ) = {
    restRequestMaker
      .post[CreateRevenueScheduleRequest, CreateRevenueScheduleResult](
        CreateRevenueScheduleRequest("10.01", today, List(RevenueDistribution("0.00"))),
        s"revenue-schedules/subscription-charges/${chargeId}",
      )
      .map(_.number)
  }
}

object GetRevenueSchedule {

  case class SubscriptionResult(undistributedUnrecognizedRevenueInPence: Int)

  implicit val reads: Reads[SubscriptionResult] =
    (((__ \ "revenueSchedules")(0) \ "undistributedUnrecognizedRevenue")
      .read[Double]
      .map(amount => (amount * 100).toInt))
      .map(SubscriptionResult.apply _)

  def apply(requests: Requests, chargeId: String): ClientFailableOp[Int] =
    requests
      .get[SubscriptionResult](s"revenue-schedules/subscription-charges/$chargeId")
      .map(_.undistributedUnrecognizedRevenueInPence)

}

object ZuoraGiftSubscribe {

  case class SubscribeResult(SubscriptionNumber: String)

  implicit val reads: Reads[SubscribeResult] =
    (__(0) \ "SubscriptionNumber").read[String].map(SubscribeResult)

  def subscribe(requests: Requests, startDate: LocalDate): ClientFailableOp[String] =
    requests
      .post[JsValue, SubscribeResult](requestJson(startDate), s"action/subscribe", WithoutCheck)
      .map(_.SubscriptionNumber)

  def requestJson(startDate: LocalDate) = Json.parse(
    s"""{
      |    "subscribes": [
      |        {
      |            "Account": {
      |                "Name": "revenue-recogniser-job",
      |                "Currency": "GBP",
      |                "CrmId": "001g000001gOR06AAG",
      |                "sfContactId__c": "003g000001UnFItAAN",
      |                "IdentityId__c": "9999999",
      |                "PaymentGateway": "PayPal Express",
      |                "CreatedRequestId__c": "e18f6418-45f2-11e7-8bfa-8faac2182601",
      |                "BillCycleDay": 0,
      |                "AutoPay": true,
      |                "PaymentTerm": "Due Upon Receipt",
      |                "BcdSettingOption": "AutoSet",
      |                "Batch": "Batch1"
      |            },
      |            "BillToContact": {
      |                "FirstName": "revenue-recogniser-job",
      |                "LastName": "support-service-lambdas",
      |                "WorkEmail": "test@gu.com",
      |                "Country": "GB"
      |            },
      |            "PaymentMethod": {
      |                "PaypalBaid": "B-23637766K5365543J",
      |                "PaypalEmail": "test@paypal.com",
      |                "PaypalType": "ExpressCheckout",
      |                "Type": "PayPal"
      |            },
      |            "SubscriptionData": {
      |                "RatePlanData": [
      |                    {
      |                        "RatePlan": {
      |                            "ProductRatePlanId": "2c92c0f8778bf8f60177915b477714aa"
      |                        },
      |                        "RatePlanChargeData": [],
      |                        "SubscriptionProductFeatureList": []
      |                    }
      |                ],
      |                "Subscription": {
      |                    "ContractEffectiveDate": "$startDate",
      |                    "ContractAcceptanceDate": "$startDate",
      |                    "TermStartDate": "$startDate",
      |                    "AutoRenew": false,
      |                    "InitialTerm": 13,
      |                    "RenewalTerm": 12,
      |                    "TermType": "TERMED"
      |                }
      |            },
      |            "SubscribeOptions": {
      |                "GenerateInvoice": true,
      |                "ProcessPayments": true
      |            }
      |        }
      |    ]
      |}""".stripMargin,
  )
}
