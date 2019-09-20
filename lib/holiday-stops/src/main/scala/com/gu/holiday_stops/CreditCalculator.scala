package com.gu.holiday_stops

import java.time.LocalDate

import cats.data.NonEmptyList
import cats.syntax.either._
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestsDetail.SubscriptionName
import com.softwaremill.sttp.{Id, SttpBackend}

object CreditCalculator {

  type PartiallyWiredCreditCalculator = (SubscriptionName, LocalDate) => Either[HolidayError, Double]

  def apply(
    config: Config,
    backend: SttpBackend[Id, Nothing]
  )(
    subscriptionName: SubscriptionName,
    stoppedPublicationDate: LocalDate
  ): Either[HolidayError, Double] =
    for {
      accessToken <- Zuora.accessTokenGetResponse(config.zuoraConfig, backend)
      subscription <- Zuora.subscriptionGetResponse(config, accessToken, backend)(subscriptionName)
      credit <- calculateCredit(
        config.guardianWeeklyConfig.productRatePlanIds,
        config.guardianWeeklyConfig.nForNProductRatePlanIds,
        config.sundayVoucherConfig.productRatePlanChargeId,
        stoppedPublicationDate
      )(subscription)
    } yield credit //TODO log failures

  def calculateCredit(
    guardianWeeklyProductRatePlanIds: List[String],
    gwNforNProductRatePlanIds: List[String],
    sundayVoucherRatePlanId: String,
    stoppedPublicationDate: LocalDate
  )(subscription: Subscription) = {
    val creditCalculatorFunctions = NonEmptyList.of(
      guardianWeeklyCredit(
        guardianWeeklyProductRatePlanIds,
        gwNforNProductRatePlanIds,
        stoppedPublicationDate
      ) _,
      sundayVoucherCredit(
        sundayVoucherRatePlanId,
        stoppedPublicationDate
      ) _
    )

    //Returns the result of the first function that returns a right
    creditCalculatorFunctions
      .tail
      .foldRight(creditCalculatorFunctions.head(subscription)) { (creditCalculatorFunction, result) =>
        result.recoverWith {
          case _ => creditCalculatorFunction(subscription)
        }
      }
  }

  def guardianWeeklyCredit(guardianWeeklyProductRatePlanIds: List[String], gwNforNProductRatePlanIds: List[String], stoppedPublicationDate: LocalDate)(subscription: Subscription): Either[ZuoraHolidayWriteError, Double] =
    CurrentGuardianWeeklySubscription(subscription, guardianWeeklyProductRatePlanIds, gwNforNProductRatePlanIds)
      .map(GuardianWeeklyHolidayCredit(_, stoppedPublicationDate))

  def sundayVoucherCredit(sundayVoucherRatePlanId: String, stoppedPublicationDate: LocalDate)(subscription: Subscription) = {
    CurrentSundayVoucherSubscription(subscription, sundayVoucherRatePlanId)
      .map(SundayVoucherHolidayCredit(_, stoppedPublicationDate))
  }
}
