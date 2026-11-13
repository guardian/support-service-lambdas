package com.gu.soft_opt_in_consent_setter

import com.gu.soft_opt_in_consent_setter.models.SoftOptInError
import io.circe.parser.parse
import org.scalatest.funsuite.AnyFunSuite
import org.scalatest.matchers.should.Matchers

class SecondaryUserConsentPublisherTests extends AnyFunSuite with Matchers {
  test("publishes a secondary user cancellation message") {
    var sentMessage: Option[String] = None
    val publisher = new SecondaryUserConsentPublisher(message => {
      sentMessage = Some(message)
      Right(())
    })

    publisher.sendCancellation("identity-123", "A-S123") shouldBe Right(())
    sentMessage.flatMap(parse(_).toOption) shouldBe parse(
      """{"identityId":"identity-123","subscriptionId":"A-S123","eventType":"Cancellation","productName":"SECONDARY_USER"}""",
    ).toOption
  }

  test("propagates queue failures") {
    val publisher = new SecondaryUserConsentPublisher(_ => Left(SoftOptInError("queue unavailable")))

    val error = publisher.sendCancellation("identity-123", "A-S123").left.toOption.get
    error.getMessage should include("identity-123")
    error.getMessage should include("A-S123")
  }
}
