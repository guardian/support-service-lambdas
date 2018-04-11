package com.gu.digitalSubscriptionExpiry

import com.gu.digitalSubscriptionExpiry.zuora.GetAccountSummary.AccountSummaryResult
import com.gu.digitalSubscriptionExpiry.zuora.GetSubscription.{RatePlan, RatePlanCharge, SubscriptionResult}
import com.gu.util.Logging
import org.joda.time.LocalDate

class SubscriptionService extends Logging {
  //todo make 'valid' more descriptive

  def passwordCheck(accountSummary: AccountSummaryResult, password: String): Boolean = {
    passwordMatches(accountSummary.billToPostcode, accountSummary.billToLastName, password) ||
      passwordMatches(accountSummary.billToPostcode, accountSummary.soldToLastName, password)
  }

  def passwordMatches(postalCode: String, lastName: String, password: String): Boolean = {
    def format(str: String): String = str.filter(_.isLetterOrDigit).toLowerCase

    val formattedPwd = format(password)

    Seq(postalCode, lastName).exists { candidate: String =>
      candidate.filter(_.isLetterOrDigit).toLowerCase.contains(formattedPwd)
    }
  }

  implicit def dateOrdering: Ordering[LocalDate] = Ordering.fromLessThan(_ isAfter _)

  //todo are we using date as a parameter anywhere
  def getExpiryDateForValidSubscription(subscription: SubscriptionResult, accountSummary: AccountSummaryResult, password: String, date: LocalDate = LocalDate.now()): Option[LocalDate] = {

    val digipackRateplans = subscription.ratePlans.filter(ratePlan => ratePlan.ratePlanName == "Digital Pack")

    val dateToCheck = if (subscription.startDate.isBefore(date) && subscription.customerAcceptanceDate.isAfter(date)) subscription.customerAcceptanceDate else date

    def isActive(charge: RatePlanCharge) = !charge.effectiveEndDate.isBefore(dateToCheck) && !charge.effectiveStartDate.isAfter(dateToCheck)

    val activeCharges = digipackRateplans.map(_.ratePlanCharges).flatten.filter(isActive)

    if (activeCharges.isEmpty) None else Some(activeCharges.map(_.effectiveEndDate).max)

  }

  //  def updateActivationDate(subscription: Subscription[Paid]): Unit = {
  //    val name = subscription.name
  //    subscription.casActivationDate.fold {
  //      zuoraService.updateActivationDate(subscription.id)
  //    } { date =>
  //      logger.debug(s"Activation date already present ($date) in subscription $name")
  //      Future.successful(())
  //    }
  //  }
}
