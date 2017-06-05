package com.gu.paymentFailure

import com.gu.autoCancel.ZuoraModels.{ RatePlan, RatePlanCharge, Subscription }
import com.gu.paymentFailure.Lambda._
import org.joda.time.LocalDate
import org.scalatest.FlatSpec
import scalaz.\/-

class LambdaTest extends FlatSpec {

  val today = LocalDate.now()
  val activeSupporter = RatePlan("id123", "Supporter", "Annual", List(RatePlanCharge(effectiveStartDate = today, effectiveEndDate = today.plusDays(364))))
  val cancelledFriend = RatePlan("id123", "Friend", "Annual", List(RatePlanCharge(effectiveStartDate = today.minusDays(365), effectiveEndDate = today.minusDays(200))))
  val unstartedPartner = RatePlan("id123", "Partner", "Annual", List(RatePlanCharge(effectiveStartDate = today.plusDays(10), effectiveEndDate = today.plusDays(375))))
  val upgradedSub = Subscription("id123", "A-S123", List(cancelledFriend, activeSupporter))

  "currentlyActive" should "identify an active plan" in {
    assert(currentlyActive(activeSupporter) == true)
  }

  "currentlyActive" should "discard a plan which hasn't started yet" in {
    assert(currentlyActive(cancelledFriend) == false)
  }

  "currentlyActive" should "discard a plan which has ended" in {
    assert(currentlyActive(unstartedPartner) == false)
  }

  "currentPlansForSubscription" should "discard an old Friend plan on a Supporter sub" in {
    assert(currentPlansForSubscription(upgradedSub) == \/-(List(activeSupporter)))
  }

}
