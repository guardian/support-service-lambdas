package com.gu.digitalSubscriptionExpiry.zuora

import com.gu.digitalSubscriptionExpiry._
import com.gu.digitalSubscriptionExpiry.zuora.GetAccountSummary.AccountSummaryResult
import com.gu.digitalSubscriptionExpiry.zuora.GetSubscription.SubscriptionResult
import com.gu.util.reader.Types.FailableOp
import org.joda.time.LocalDate
import com.gu.digitalSubscriptionExpiry.common.CommonApiResponses._

import scalaz.-\/

object GetSubscriptionExpiry {
  def apply(subscriptionService: SubscriptionService)(providedPassword: String, subscription: SubscriptionResult, accountSummary: AccountSummaryResult, date: LocalDate = LocalDate.now()): FailableOp[Unit] =
    if (!subscriptionService.validPassword(accountSummary, providedPassword)) {
      -\/(notFoundResponse) //todo this should probably return unauthorised or something but cas returns not found
    } else {
      val maybeSubscriptionEndDate = subscriptionService.getExpiryDateForValidSubscription(subscription, accountSummary, date)
      maybeSubscriptionEndDate.map {
        subscriptionEndDate =>
          val res = SuccessResponse(Expiry(
            expiryDate = subscriptionEndDate,
            expiryType = ExpiryType.SUB,
            subscriptionCode = None,
            provider = None
          ))
          -\/(apiResponse(res, "200"))
      }.getOrElse(-\/(notFoundResponse))
    }
}
