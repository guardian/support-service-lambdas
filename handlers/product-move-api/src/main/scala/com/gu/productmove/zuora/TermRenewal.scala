package com.gu.productmove.zuora

import com.gu.productmove.zuora.model.SubscriptionName
import com.gu.productmove.zuora.rest.ZuoraGet
import com.gu.productmove.zuora.rest.ZuoraRestBody.ZuoraSuccessCheck
import sttp.client3.*
import zio.json.*
import zio.{Clock, Task, ZIO}

import java.time.LocalDate

trait TermRenewal:
  def renewSubscription(
      subscriptionName: SubscriptionName,
      runBilling: Boolean,
  ): Task[RenewalResponse]

class TermRenewalLive(zuoraGet: ZuoraGet) extends TermRenewal:
  /*
  Start a new term for this subscription from today.
  This is to avoid problems with charges not aligning correctly with the term and resulting in unpredictable
  billing dates and amounts.

  Uses https://www.zuora.com/developer/api-references/api/operation/PUT_RenewSubscription/
   */

  override def renewSubscription(
      subscriptionName: SubscriptionName,
      runBilling: Boolean,
  ): Task[RenewalResponse] = for {
    _ <- ZIO.log(s"Attempting to renew subscription $subscriptionName")
    today <- Clock.currentDateTime.map(_.toLocalDate)
    response <- renewSubscriptionFromDate(subscriptionName, today, runBilling)
    _ <- ZIO.log(s"Successfully renewed subscription $subscriptionName")
  } yield response

  private def renewSubscriptionFromDate(
      subscriptionName: SubscriptionName,
      contractEffectiveDate: LocalDate,
      runBilling: Boolean,
  ): Task[RenewalResponse] = {
    val requestBody = RenewalRequest(
      contractEffectiveDate,
      collect = None,
      runBilling = runBilling,
    )
    zuoraGet
      .put[RenewalRequest, RenewalResponse](
        relativeUrl = uri"subscriptions/${subscriptionName.value}/renew",
        input = requestBody,
        zuoraSuccessCheck = ZuoraSuccessCheck.SuccessCheckLowercase,
      )
  }

case class RenewalRequest(
    contractEffectiveDate: LocalDate,
    collect: Option[Boolean],
    runBilling: Boolean,
) derives JsonEncoder
case class RenewalResponse(success: Option[Boolean], invoiceId: Option[String]) derives JsonDecoder
