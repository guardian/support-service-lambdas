package com.gu.digitalSubscriptionExpiry.zuora

import java.time.LocalDate

import com.gu.digitalSubscriptionExpiry.responses.DigitalSubscriptionApiResponses._
import com.gu.digitalSubscriptionExpiry.responses.{Expiry, ExpiryType, SuccessResponse}
import com.gu.digitalSubscriptionExpiry.zuora.GetAccountSummary.AccountSummaryResult
import com.gu.digitalSubscriptionExpiry.zuora.GetSubscription.{RatePlanCharge, SubscriptionResult}
import com.gu.util.apigateway.ResponseModels.ApiResponse

object GetSubscriptionExpiry {
  private def validPassword(accountSummary: AccountSummaryResult, password: String): Boolean = {

    def format(str: String): String = str.filter(_.isLetterOrDigit).toLowerCase

    val candidates = Seq(
      accountSummary.billToPostcode,
      Some(accountSummary.billToLastName),
      Some(accountSummary.soldToLastName),
      accountSummary.soldToPostcode
    ).flatten.map(format)

    val formattedPassword = format(password)

    candidates.contains(formattedPassword)
  }

  implicit def dateOrdering: Ordering[LocalDate] = Ordering.fromLessThan(_ isAfter _)

  private val digipackChargeNamePrefixes = List("DIGIPACK", "DIGITAL PACK", "DIGITALPACK")

  private def isDigipackName(chargeName: String) = {
    val upperCaseName = chargeName.toUpperCase
    digipackChargeNamePrefixes.exists(upperCaseName.contains(_))
  }

  private def getExpiryDateForValidSubscription(subscription: SubscriptionResult, accountSummary: AccountSummaryResult, date: LocalDate): Option[LocalDate] = {

    val dateToCheck = if (!subscription.startDate.isAfter(date) && subscription.customerAcceptanceDate.isAfter(date)) subscription.customerAcceptanceDate else date

    def isActiveDigipack(charge: RatePlanCharge) = isDigipackName(charge.name) && !charge.effectiveEndDate.isBefore(dateToCheck) && !charge.effectiveStartDate.isAfter(dateToCheck)

    val hasActiveDigipackCharges = subscription.ratePlans.map(_.ratePlanCharges).flatten.exists(isActiveDigipack)

    if (hasActiveDigipackCharges) {
      Some(subscription.endDate.plusDays(1))
    } else None
  }

  def apply(today: () => LocalDate)(providedPassword: String, subscription: SubscriptionResult, accountSummary: AccountSummaryResult): ApiResponse =
    if (!validPassword(accountSummary, providedPassword)) {
      notFoundResponse
    } else {
      val maybeSubscriptionEndDate = getExpiryDateForValidSubscription(subscription, accountSummary, today())
      maybeSubscriptionEndDate.map {
        subscriptionEndDate =>
          val res = SuccessResponse(Expiry(
            expiryDate = subscriptionEndDate,
            expiryType = ExpiryType.SUB,
            subscriptionCode = None,
            provider = None
          ))
          apiResponse(res, "200")
      }.getOrElse(notFoundResponse)
    }
}
