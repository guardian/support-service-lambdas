package com.gu.paymentFailure

import java.io.ByteArrayOutputStream

import com.gu.autoCancel.ZuoraModels._
import com.gu.paymentFailure.Lambda._
import org.joda.time.{ DateTime, LocalDate }
import org.scalatest.FlatSpec
import org.scalatest._
import Matchers._
import com.amazonaws.services.sqs.model.SendMessageResult
import com.gu.autoCancel.ZuoraService
import org.scalatest.mockito.MockitoSugar
import play.api.libs.json.Json

import scalaz.\/-
import org.mockito.Mockito._
import org.mockito.Matchers.any

import scala.util.Success

class LambdaTest extends FlatSpec with MockitoSugar {

  val fakeZuoraService = mock[ZuoraService]
  val fakeQueueClient = mock[QueueClient]
  val today = LocalDate.now()
  val activeSupporter = RatePlan("id123", "Supporter", "Annual", List(RatePlanCharge(effectiveStartDate = today, effectiveEndDate = today.plusDays(364))))
  val cancelledFriend = RatePlan("id123", "Friend", "Annual", List(RatePlanCharge(effectiveStartDate = today.minusDays(365), effectiveEndDate = today.minusDays(200))))
  val unstartedPartner = RatePlan("id123", "Partner", "Annual", List(RatePlanCharge(effectiveStartDate = today.plusDays(10), effectiveEndDate = today.plusDays(375))))
  val upgradedSub = Subscription("id123", "A-S123", List(cancelledFriend, activeSupporter))

  val lambda = new PaymentFailureLambda {

    override def config: Config = new Config {
      override val user = "validUser"
      override val pass = "validPass"
    }
    override def zuoraService = fakeZuoraService
    override def queueClient: QueueClient = fakeQueueClient
    override def currentDate = new DateTime(2005, 6, 23, 12, 0, 0, 0)
  }
  "currentlyActive" should "identify an active plan" in {
    lambda.currentlyActive(activeSupporter) shouldBe true
  }

  "currentlyActive" should "discard a plan which hasn't started yet" in {
    lambda.currentlyActive(cancelledFriend) shouldBe false
  }

  "currentlyActive" should "discard a plan which has ended" in {
    lambda.currentlyActive(unstartedPartner) shouldBe false
  }

  "currentPlansForSubscription" should "discard an old Friend plan on a Supporter sub" in {
    lambda.currentPlansForSubscription(upgradedSub) shouldBe \/-(List(activeSupporter))
  }

  val missingCredentialsResponse = """{"statusCode":"401","headers":{"Content-Type":"application/json"},"body":"Credentials are missing or invalid"}"""
  val successfulResponse = """{"statusCode":"200","headers":{"Content-Type":"application/json"},"body":"Success"}"""

  "lambda" should "return error if credentials are missing" in {
    val stream = getClass.getResourceAsStream("/paymentFailure/missingCredentials.json")
    val output = new ByteArrayOutputStream

    val os = new ByteArrayOutputStream()
    lambda.handleRequest(stream, os, null)
    val responseString = new String(os.toByteArray(), "UTF-8");
    responseString jsonMatches missingCredentialsResponse
  }

  "lambda" should "return error if credentials don't match" in {
    val stream = getClass.getResourceAsStream("/paymentFailure/invalidCredentials.json")
    val output = new ByteArrayOutputStream

    val os = new ByteArrayOutputStream()
    lambda.handleRequest(stream, os, null)
    val responseString = new String(os.toByteArray(), "UTF-8");
    responseString jsonMatches missingCredentialsResponse
  }

  "lambda" should "return enqueue email and return success for a valid request" in {
    //set up
    val stream = getClass.getResourceAsStream("/paymentFailure/validRequest.json")
    val output = new ByteArrayOutputStream

    val basicInfo = BasicAccountInfo("accountId", 1)
    val subSum = SubscriptionSummary("subId", "subNumber", "Active")
    val accountSummary = AccountSummary(basicInfo, List(subSum), Nil)
    case class RatePlan(id: String, productName: String, ratePlanName: String, ratePlanCharges: List[RatePlanCharge])

    val subscription = Subscription("subId", "subNumber", List(activeSupporter))

    when(fakeZuoraService.getAccountSummary("accountId")).thenReturn(\/-(accountSummary))
    when(fakeZuoraService.getSubscription("subNumber")).thenReturn(\/-(subscription))

    when(fakeQueueClient.sendDataExtensionToQueue(any[Message])).thenReturn(Success(mock[SendMessageResult]))

    val os = new ByteArrayOutputStream()

    //execute
    lambda.handleRequest(stream, os, null)

    //verify
    val responseString = new String(os.toByteArray(), "UTF-8")

    val expectedMessage = Message(
      DataExtensionName = "first-failed-payment-email",
      To = ToDef(
        Address = "test.user123@guardian.co.uk",
        SubscriberKey = "test.user123@guardian.co.uk",
        ContactAttributes = ContactAttributesDef(
          SubscriberAttributes = SubscriberAttributesDef(
            SubscriberKey = "test.user123@guardian.co.uk",
            EmailAddress = "test.user123@guardian.co.uk",
            DateField = "23/06/2005",
            subscriber_id = "subNumber",
            product = "Supporter",
            payment_method = "CreditCard",
            card_type = "Visa",
            card_expiry_date = "12/2017",
            first_name = "Test",
            last_name = "User"
          )
        )
      )
    )

    verify(fakeQueueClient).sendDataExtensionToQueue(expectedMessage)
    responseString jsonMatches successfulResponse
  }

  implicit class StringMatcher(private val actual: String) {
    def jsonMatches(expected: String) = {
      val expectedJson = Json.parse(expected)
      val actualJson = Json.parse(actual)
      expectedJson should be(actualJson)
    }
  }

}
