package com.gu.recogniser

import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.util.config.{LoadConfigModule, Stage}
import com.gu.util.resthttp.RestRequestMaker
import com.gu.util.resthttp.RestRequestMaker.{Requests, WithoutCheck}
import com.gu.util.resthttp.Types.ClientFailableOp
import com.gu.util.zuora.{ZuoraRestConfig, ZuoraRestRequestMaker}
import com.gu.zuora.reports.Querier
import com.gu.zuora.reports.aqua.ZuoraAquaRequestMaker
import play.api.libs.json.{JsValue, Json, Reads, __}

import java.time.LocalDate

/*
Run this in order to set up data in dev so that you can run the job and it will find some data
 */
object CreateTestSubscriptionManualTest {

  def main(args: Array[String]): Unit = {

    val actual = for {
      zuoraRestConfig <- LoadConfigModule(Stage("DEV"), GetFromS3.fetchString)[ZuoraRestConfig]
      zuoraDeps = ZuoraRestRequestMaker(RawEffects.response, zuoraRestConfig)
      subNumber <- ZuoraGiftSubscribe.subscribe(zuoraDeps).toDisjunction.left.map(httpError => new RuntimeException(httpError.toString))
    } yield subNumber
    println("result: " + actual)
    println("****\nNOTE: wait a while as the revenue schedule isn't created straight away\n****")

  }
}

object RunLambdaManualTest {

  def main(args: Array[String]): Unit = {

    val actual = for {
      zuoraRestConfig <- LoadConfigModule(Stage("DEV"), GetFromS3.fetchString)[ZuoraRestConfig]
      downloadRequests = ZuoraAquaRequestMaker(RawEffects.downloadResponse, zuoraRestConfig)
      aquaQuerier = Querier.lowLevel(downloadRequests) _
      _ <- Steps(
        println,
        RawEffects.downloadResponse,
        RawEffects.response,
        zuoraRestConfig,
        () => LocalDate.of(2021, 2, 10)
      ).execute()
    } yield ()
    println("result: " + actual)

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
    eventTypeSystemId: String = "DigitalSubscriptionGiftRedeemed"
  )

  case class RevenueDistribution(
    newAmount: String,
    accountingPeriodName: String = "Open-Ended"
  )

  case class CreateRevenueScheduleRequest(
    amount: String,
    revenueScheduleDate: LocalDate,
    revenueDistributions: List[RevenueDistribution],
    revenueEvent: RevenueEvent = RevenueEvent()
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
    today: LocalDate
  ) = {
    restRequestMaker.post[CreateRevenueScheduleRequest, CreateRevenueScheduleResult](
      CreateRevenueScheduleRequest("10.01", today, List(RevenueDistribution("0.00"))),
      s"revenue-schedules/subscription-charges/${chargeId}"
    ).map(_.number)
  }
}

object GetRevenueSchedule {

  case class SubscriptionResult(undistributedUnrecognizedRevenueInPence: Int)

  implicit val reads: Reads[SubscriptionResult] =
    (((__ \ "revenueSchedules")(0) \ "undistributedUnrecognizedRevenue").read[Double].map(amount => (amount * 100).toInt)).map(SubscriptionResult.apply _)

  def apply(requests: Requests, chargeId: String): ClientFailableOp[Int] =
    requests.get[SubscriptionResult](s"revenue-schedules/subscription-charges/$chargeId").map(_.undistributedUnrecognizedRevenueInPence)

}

object ZuoraGiftSubscribe {

  case class SubscribeResult(SubscriptionNumber: String)

  implicit val reads: Reads[SubscribeResult] =
    (__(0) \ "SubscriptionNumber").read[String].map(SubscribeResult)

  def subscribe(requests: Requests): ClientFailableOp[String] =
    requests.post[JsValue, SubscribeResult](requestJson, s"action/subscribe", WithoutCheck).map(_.SubscriptionNumber)

  val requestJson = Json.parse(
    """{
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
      |                    "ContractEffectiveDate": "2020-02-09",
      |                    "ContractAcceptanceDate": "2020-02-09",
      |                    "TermStartDate": "2020-02-09",
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
      |}""".stripMargin
  )
}
