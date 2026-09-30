package com.gu.soft_opt_in_consent_setter

import com.gu.soft_opt_in_consent_setter.models.SecondarySubscription
import org.scalatest.funsuite.AnyFunSuite
import org.scalatest.matchers.should.Matchers
import software.amazon.awssdk.services.dynamodb.model.AttributeValue

import java.time.LocalDate
import scala.jdk.CollectionConverters._

class SecondarySubscriptionTests extends AnyFunSuite with Matchers {
  private val identityId = "someIdentityId"

  test("primary records are not secondary subscriptions") {
    val item = Map("termEndDate" -> AttributeValue.builder().s("2099-01-01").build()).asJava

    SecondarySubscription.from(identityId, item) shouldBe None
  }

  test("secondary subscription dates are inclusive") {
    val item = Map(
      "primarySubscriptionName" -> AttributeValue.builder().s("A-primary").build(),
      "termEndDate" -> AttributeValue.builder().s("2026-09-30").build(),
    ).asJava

    val subscription = SecondarySubscription.from(identityId, item).get.toOption.get
    subscription shouldBe SecondarySubscription("A-primary", LocalDate.parse("2026-09-30"))
    subscription.isActiveOn(LocalDate.parse("2026-09-30")) shouldBe true
    subscription.isActiveOn(LocalDate.parse("2026-10-01")) shouldBe false
  }

  test("malformed secondary subscription names fail instead of being ignored") {
    val item = Map(
      "primarySubscriptionName" -> AttributeValue.builder().n("123").build(),
      "termEndDate" -> AttributeValue.builder().s("2026-09-30").build(),
    ).asJava

    SecondarySubscription.from(identityId, item).get.left.toOption.map(_.getMessage) shouldBe Some(
      s"Secondary SupporterProductData item for identityId $identityId has invalid primarySubscriptionName",
    )
  }
}
