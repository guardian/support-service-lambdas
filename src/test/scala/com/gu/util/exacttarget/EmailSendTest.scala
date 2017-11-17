package com.gu.util.exacttarget

import com.gu.autoCancel.WithDependenciesFailableOp
import com.gu.effects.RawEffects
import com.gu.util.ETConfig
import com.gu.util.ETConfig.{ ETSendId, ETSendIds }
import com.gu.util.exacttarget.EmailSend.{ ETS, HUDeps }
import com.gu.util.exacttarget.SalesforceAuthenticate.SalesforceAuth
import com.gu.util.reader.Types._
import okhttp3._
import org.scalatest.{ FlatSpec, Matchers }

import scala.util.Success
import scalaz.{ Reader, \/- }

class EmailSendTest extends FlatSpec with Matchers {

  def makeMessage(recipient: String): Message = {
    Message(
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

  private val guardian = "john.duffell@guardian.co.uk"
  private val public = "john.duffell@gutools.co.uk" // non gu

  def tryEmail(isProd: Boolean, email: String, expectedEmail: Boolean) = {
    def requestBuilder(attempt: Int) = new Request.Builder()
      .url(s"http://$attempt")
      .post(RequestBody.create(MediaType.parse("text/plain"), s"$attempt"))

    val req = EmailRequest(
      etSendId = ETSendId("etSendId"),
      makeMessage(email)
    )
    val env = new TestingRawEffectsET(isProd)
    var varAttempted: Boolean = false
    EmailSend(HUDeps(
      sendEmail = (attempt, message) => {
      varAttempted = true
      WithDependenciesFailableOp.liftT(())
    }
    ))(req).run.run(env.configHttp)

    varAttempted should be(expectedEmail)
  }

  "emailer" should "send an email to any address in prod" in {

    tryEmail(isProd = true, email = public, expectedEmail = true)
    tryEmail(isProd = false, email = public, expectedEmail = false)
    tryEmail(isProd = false, email = guardian, expectedEmail = true)
  }

}

class TestingRawEffectsET(val isProd: Boolean) {

  var result: Option[Request] = None // !

  val stage = if (isProd) "PROD" else "CODE"

  def response: Request => Response = {
    req =>
      result = Some(req)
      new Response.Builder().request(req).protocol(Protocol.HTTP_1_1).code(1).body(ResponseBody.create(MediaType.parse("text/plain"), "body result test")).build()
  }

  val rawEffects = RawEffects(response, () => stage, _ => Success(""))

  val fakeETConfig = ETConfig(etSendIDs = ETSendIds(ETSendId("11"), ETSendId("22"), ETSendId("33"), ETSendId("44"), ETSendId("can")), clientId = "jjj", clientSecret = "kkk")

  val configHttp = ETS(response, stage, fakeETConfig)

}
