package com.gu.digitalSubscriptionExpiry.zuora

import com.gu.digitalSubscriptionExpiry._
import com.gu.digitalSubscriptionExpiry.zuora.GetAccountSummary.AccountSummaryResult
import com.gu.digitalSubscriptionExpiry.zuora.GetSubscription.{RatePlanCharge, SubscriptionResult}
import com.gu.util.reader.Types.FailableOp
import org.joda.time.LocalDate
import com.gu.digitalSubscriptionExpiry.common.CommonApiResponses._
import scalaz.-\/

object GetSubscriptionExpiry {
  private def validPassword(accountSummary: AccountSummaryResult, password: String): Boolean = {

    def format(str: String): String = str.filter(_.isLetterOrDigit).toLowerCase

    val candidates = Seq(
      format(accountSummary.billToPostcode),
      format(accountSummary.billToLastName),
      format(accountSummary.soldToLastName),
      format(accountSummary.soldToPostcode)
    )
    val formattedPassword = format(password)

    candidates.contains(formattedPassword)
  }

  implicit def dateOrdering: Ordering[LocalDate] = Ordering.fromLessThan(_ isAfter _)

  private def getExpiryDateForValidSubscription(subscription: SubscriptionResult, accountSummary: AccountSummaryResult, date: LocalDate): Option[LocalDate] = {

    val digipackRateplans = subscription.ratePlans.filter(_.productName == "Digital Pack")

    val dateToCheck = if (subscription.startDate.isBefore(date) && subscription.customerAcceptanceDate.isAfter(date)) subscription.customerAcceptanceDate else date

    def isActive(charge: RatePlanCharge) = !charge.effectiveEndDate.isBefore(dateToCheck) && !charge.effectiveStartDate.isAfter(dateToCheck)

    val activeCharges = digipackRateplans.map(_.ratePlanCharges).flatten.filter(isActive)

    if (activeCharges.isEmpty) None else Some(activeCharges.map(_.effectiveEndDate).max)
  }

  def apply(providedPassword: String, subscription: SubscriptionResult, accountSummary: AccountSummaryResult, date: LocalDate = LocalDate.now()): FailableOp[Unit] =
    if (!validPassword(accountSummary, providedPassword)) {
      -\/(notFoundResponse) //todo this should probably return unauthorised or something but cas returns not found
    } else {
      val maybeSubscriptionEndDate = getExpiryDateForValidSubscription(subscription, accountSummary, date)
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
