package com.gu.digitalSubscriptionExpiry

import com.gu.digitalSubscriptionExpiry.zuora.GetAccountSummary.AccountSummaryResult
import com.gu.digitalSubscriptionExpiry.zuora.GetSubscription.{RatePlanCharge, SubscriptionResult}
import com.gu.util.Logging
import org.joda.time.LocalDate

class SubscriptionService extends Logging {

  def validPassword(accountSummary: AccountSummaryResult, password: String): Boolean = {
    //TODO DO WE NEED TO FILTER OUT NON NUMBER OR LETTER CHARS BEFORE COMPARING HERE OR NOT?
    val candidates = Seq(
      accountSummary.billToPostcode,
      accountSummary.billToLastName,
      accountSummary.soldToLastName,
      accountSummary.soldToPostcode
    )

    candidates.exists { _.equalsIgnoreCase(password) }
  }

  implicit def dateOrdering: Ordering[LocalDate] = Ordering.fromLessThan(_ isAfter _)

  //todo are we using date as a parameter anywhere
  def getExpiryDateForValidSubscription(subscription: SubscriptionResult, accountSummary: AccountSummaryResult, date: LocalDate = LocalDate.now()): Option[LocalDate] = {
    //TODO SEE IF THERE IS A SAFER WAY OF RECOGNIZING DIGIPACK RATEPLANS. Maybe we could check productName instead of rateplan name
    val digipackRateplanNames = Seq("Digital Pack Monthly", "Digital Pack Annual", "Digital Pack Quarterly")
    val digipackRateplans = subscription.ratePlans.filter(ratePlan => digipackRateplanNames.contains(ratePlan.ratePlanName))

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
