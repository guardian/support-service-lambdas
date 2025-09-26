package com.gu.productmove.endpoint.cancel

import com.gu.productmove.endpoint.cancel.SubscriptionCancelEndpointSteps.getRefundDateIfEligibile
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

import java.time.LocalDate

class SubscriptionCancelEndpointStepsTest extends AnyFlatSpec with Matchers {

  "getRefundDateIfEligibile" should "return None when LastPlanAddedDate__c is empty" in {
    val today = LocalDate.of(2024, 1, 15)
    val lastPlanAddedDate = None

    val result = getRefundDateIfEligibile(today, lastPlanAddedDate)

    result shouldBe None
  }

  it should "return the LastPlanAddedDate__c when it is 14 days old" in {
    val today = LocalDate.of(2024, 1, 15)
    val lastPlanAddedDate = Some(LocalDate.of(2024, 1, 1)) // exactly 14 days ago

    val result = getRefundDateIfEligibile(today, lastPlanAddedDate)

    result shouldBe lastPlanAddedDate
  }

  it should "return None when LastPlanAddedDate__c is 15 days old" in {
    val today = LocalDate.of(2024, 1, 16)
    val lastPlanAddedDate = Some(LocalDate.of(2024, 1, 1)) // exactly 15 days ago

    val result = getRefundDateIfEligibile(today, lastPlanAddedDate)

    result shouldBe None
  }
}
