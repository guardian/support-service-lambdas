package com.gu.util.exacttarget

import java.util.concurrent.TimeUnit

import com.gu.effects.{ SalesforceRequestWiring, StateHttp }
import okhttp3._
import org.scalatest.{ FlatSpec, Matchers }

import scalaz.{ \/, \/- }

class EmailSendTest extends FlatSpec with Matchers {

  def makeMessage(recipient: String): Message = {
    Message(
      DataExtensionName = "first-failed-payment-email",
      To = ToDef(
        Address = recipient,
        SubscriberKey = recipient,
        ContactAttributes = ContactAttributesDef(
          SubscriberAttributes = SubscriberAttributesDef(
            SubscriberKey = recipient,
            EmailAddress = recipient,
            subscriber_id = "subIdValue",
            product = "productValue",
            payment_method = "paymentMethodValue",
            card_type = "cardTypeValue",
            card_expiry_date = "cardExpiryValue",
            first_name = "firstNameValue",
            last_name = "lastNameValue",
            paymentId = "paymentId",
            price = "49.0 GBP",
            serviceStartDate = "31 January 2016",
            serviceEndDate = "31 January 2017"
          )
        )
      )
    )
  }

  class TestingStateHttp(val isProd: Boolean, var result: Option[Int] = None) extends StateHttp {

    def buildRequestET(attempt: Int): \/[String, Request.Builder] = {

      result = Some(attempt)

      \/-(new Request.Builder()
        .url(s"https://www.theguardian.com/"))

    }

    val response: Request => Response = {
      req => new Response.Builder().request(req).protocol(Protocol.HTTP_1_1).code(1).body(ResponseBody.create(MediaType.parse("text/plain"), "body result test")).build()
    }

    def buildRequest(route: String): Request.Builder =
      new Request.Builder()
        .url(s"https://www.theguardian.com/")

  }

  private val guardian = "john.duffell@guardian.co.uk"
  private val public = "john.duffell@gutools.co.uk" // non gu

  def tryEmail(isProd: Boolean, email: String, expectedEmail: Boolean) = {
    val req = EmailRequest(1, makeMessage(email))
    var env = new TestingStateHttp(isProd)
    EmailClient.sendEmail(req).run.run(env)

    env.result should be(if (expectedEmail) Some(1) else None)
  }

  "emailer" should "send an email to any address in prod" in {

    tryEmail(isProd = true, email = public, expectedEmail = true)
    tryEmail(isProd = false, email = public, expectedEmail = false)
    tryEmail(isProd = false, email = guardian, expectedEmail = true)
  }

}
