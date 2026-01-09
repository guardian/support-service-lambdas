package com.gu.digitalSubscriptionExpiry.zuora

import java.time.LocalDate

import com.gu.digitalSubscriptionExpiry.responses.DigitalSubscriptionApiResponses._
import com.gu.digitalSubscriptionExpiry.responses.{Expiry, ExpiryType, SuccessResponse}
import com.gu.digitalSubscriptionExpiry.zuora.GetAccountSummary.AccountSummaryResult
import com.gu.digitalSubscriptionExpiry.zuora.GetSubscription.{RatePlan, RatePlanCharge, SubscriptionResult}
import com.gu.util.apigateway.ApiGatewayResponse
import com.gu.util.apigateway.ResponseModels.ApiResponse

object GetSubscriptionExpiry {
  private def validPassword(accountSummary: AccountSummaryResult, password: String): Boolean = {

    def format(str: String): String = str.filter(_.isLetterOrDigit).toLowerCase

    val candidates = Seq(
      accountSummary.billToPostcode,
      Some(accountSummary.billToLastName),
      Some(accountSummary.soldToLastName),
      accountSummary.soldToPostcode,
    ).flatten.map(format)

    val formattedPassword = format(password)

    candidates.contains(formattedPassword)
  }

  implicit def dateOrdering: Ordering[LocalDate] = Ordering.fromLessThan(_ isAfter _)

  private val digitalPlusChargeNamePrefixes = List("DIGIPACK", "DIGITAL PACK", "DIGITALPACK")

  private val supporterPlusChargeNamePrefixes = List("SUPPORTER PLUS") // includes Tier Three

  private def chargeProvisionsDigitalAccess(chargeName: String) = {
    val upperCaseName = chargeName.toUpperCase
    digitalPlusChargeNamePrefixes.exists(upperCaseName.startsWith) ||
      supporterPlusChargeNamePrefixes.exists(upperCaseName.startsWith)
  }

  private def getExpiryDateForValidSubscription(
      subscription: SubscriptionResult,
      accountSummary: AccountSummaryResult,
      date: LocalDate,
  ): Option[LocalDate] = {

    val dateToCheck =
      if (!subscription.startDate.isAfter(date) && subscription.customerAcceptanceDate.isAfter(date))
        subscription.customerAcceptanceDate
      else date

    def chargeSpansDate(charge: RatePlanCharge) =
      !charge.effectiveEndDate.isBefore(dateToCheck) &&
        !charge.effectiveStartDate.isAfter(dateToCheck)

    def chargeIsValidDigitalSub(charge: RatePlanCharge) = chargeProvisionsDigitalAccess(charge.name) && chargeSpansDate(charge)
    val isValidDigitalSub = subscription.ratePlans.flatMap(_.ratePlanCharges).exists(chargeIsValidDigitalSub)

    @deprecated(
      "should only exist during Coronavirus measures (where digipack access is expanded to cover paper customers)",
    ) // FIXME remove after Coronavirus
    def ratePlanIsNewspaper(ratePlan: RatePlan) = ratePlan.productName.toUpperCase.startsWith("NEWSPAPER")
    val isValidNewspaperSub =
      subscription.ratePlans.filter(ratePlanIsNewspaper).flatMap(_.ratePlanCharges).exists(chargeSpansDate)

    if (isValidDigitalSub || isValidNewspaperSub) {
      Some(subscription.endDate.plusDays(1))
    } else None
  }

  def apply(
      today: () => LocalDate,
  )(providedPassword: String, subscription: SubscriptionResult, accountSummary: AccountSummaryResult): ApiResponse =
    if (!validPassword(accountSummary, providedPassword)) {
      notFoundResponse
    } else {
      val maybeSubscriptionEndDate = getExpiryDateForValidSubscription(subscription, accountSummary, today())
      maybeSubscriptionEndDate
        .map { subscriptionEndDate =>
          val res = SuccessResponse(
            Expiry(
              expiryDate = subscriptionEndDate,
              expiryType = ExpiryType.SUB,
              subscriptionCode = None,
              provider = None,
            ),
          )
          ApiGatewayResponse("200", res)
        }
        .getOrElse(notFoundResponse)
    }
}
