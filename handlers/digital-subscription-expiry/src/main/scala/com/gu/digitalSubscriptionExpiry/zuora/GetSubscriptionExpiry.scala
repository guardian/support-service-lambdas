package com.gu.digitalSubscriptionExpiry.zuora

import com.gu.digitalSubscriptionExpiry._
import com.gu.digitalSubscriptionExpiry.zuora.GetAccountSummary.AccountSummaryResult
import com.gu.digitalSubscriptionExpiry.zuora.GetSubscription.{SubscriptionId, SubscriptionResult}
import com.gu.util.reader.Types.FailableOp
import org.joda.time.LocalDate
import com.gu.digitalSubscriptionExpiry.common.CommonApiResponses._
import com.gu.util.apigateway.ResponseModels.ApiResponse
import com.gu.util.reader.Types._
import scalaz.-\/

object GetSubscriptionExpiry {
  def apply(subscriptionService: SubscriptionService)(providedPassword: String, subscription: SubscriptionResult, accountSummary: AccountSummaryResult, date: LocalDate = LocalDate.now()): FailableOp[ApiResponse] =
    if (subscriptionService.passwordCheck(accountSummary, providedPassword)) {
      -\/(badRequest)
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
          apiResponse(res, "200")
      }.toFailableOp(notFoundResponse)
    }
}
