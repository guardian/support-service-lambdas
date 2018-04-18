package com.gu.digitalSubscriptionExpiry.zuora

import java.time.{LocalDate, LocalDateTime}

import com.gu.digitalSubscriptionExpiry._
import com.gu.digitalSubscriptionExpiry.common.CommonApiResponses._
import com.gu.digitalSubscriptionExpiry.zuora.GetAccountSummary.AccountSummaryResult
import com.gu.digitalSubscriptionExpiry.zuora.GetSubscription.{RatePlanCharge, SubscriptionResult}
import com.gu.util.reader.Types.FailableOp
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

  private val digipackChargeNamePrefixes = List("DIGIPACK", "DIGITAL PACK", "DIGITALPACK")

  private def isDigipackName(chargeName: String) = {
    val upperCaseName = chargeName.toUpperCase
    digipackChargeNamePrefixes.exists(upperCaseName.contains(_))
  }

  private def getExpiryDateForValidSubscription(subscription: SubscriptionResult, accountSummary: AccountSummaryResult, date: LocalDate): Option[LocalDate] = {

    val dateToCheck = if (!subscription.startDate.isAfter(date) && subscription.customerAcceptanceDate.isAfter(date)) subscription.customerAcceptanceDate else date

    def isActiveDigipack(charge: RatePlanCharge) = isDigipackName(charge.name) && !charge.effectiveEndDate.isBefore(dateToCheck) && !charge.effectiveStartDate.isAfter(dateToCheck)

    val activeDigipackCharges = subscription.ratePlans.map(_.ratePlanCharges).flatten.filter(isActiveDigipack)

    if (activeDigipackCharges.isEmpty) None else Some(activeDigipackCharges.map(_.effectiveEndDate).max)
  }

  def apply(now: () => LocalDateTime)(providedPassword: String, subscription: SubscriptionResult, accountSummary: AccountSummaryResult): FailableOp[Unit] =
    if (!validPassword(accountSummary, providedPassword)) {
      -\/(notFoundResponse)
    } else {
      val maybeSubscriptionEndDate = getExpiryDateForValidSubscription(subscription, accountSummary, now().toLocalDate)
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
