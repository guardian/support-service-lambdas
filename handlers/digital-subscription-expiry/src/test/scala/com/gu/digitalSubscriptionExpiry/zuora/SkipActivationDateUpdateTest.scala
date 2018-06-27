package com.gu.digitalSubscriptionExpiry.zuora

import java.time.LocalDate

import com.gu.digitalSubscriptionExpiry.UrlParams
import com.gu.digitalSubscriptionExpiry.zuora.GetAccountSummary.AccountId
import com.gu.digitalSubscriptionExpiry.zuora.GetSubscription._
import org.scalatest.FlatSpec
import org.scalatest.Matchers._

class SkipActivationDateUpdateTest extends FlatSpec {

  val testDate = LocalDate.now()
  def testSubscriptionResult(casActivationDate: Option[String]) = SubscriptionResult(
    id = SubscriptionId("testId"),
    name = SubscriptionName("testName"),
    accountId = AccountId("testAccountId"),
    casActivationDate = casActivationDate,
    customerAcceptanceDate = testDate,
    startDate = testDate,
    endDate = testDate,
    ratePlans = Nil
  )

  val subWithActivationDateNotSet = testSubscriptionResult(None)
  val subWithActivationDateSet = testSubscriptionResult(Some(testDate.toString))

  "SkipActivationUpdate" should "be true if the parameter noActivation is provided in the request and set to true" in {

    val skipActivation = SkipActivationDateUpdate(queryStringParameters = UrlParams(true), subWithActivationDateNotSet)

    skipActivation should be(true)
  }

  it should "be false if the parameter noActivation is false" in {

    val skipActivation = SkipActivationDateUpdate(queryStringParameters = UrlParams(false), subWithActivationDateNotSet)

    skipActivation should be(false)

  }

  it should "be true if there is already an activation date on the subscription" in {
    val skipActivation = SkipActivationDateUpdate(queryStringParameters = UrlParams(false), subWithActivationDateSet)

    skipActivation should be(true)
  }

}
