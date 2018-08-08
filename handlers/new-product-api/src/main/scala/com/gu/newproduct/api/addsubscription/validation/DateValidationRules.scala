package com.gu.newproduct.api.addsubscription.validation

import java.time.temporal.TemporalAdjusters
import java.time.{DayOfWeek, LocalDate}

import com.gu.newproduct.api.addsubscription.validation.Validation._

case class Days(value: Int) extends AnyVal

trait DateRule {
  def isValid(d: LocalDate): ValidationResult[Unit]
}

object DateRule {

  implicit class OptionalRuleConverter(maybeRule: Option[DateRule]) {
    def alwaysValid(d: LocalDate) = Passed(())

    def isValid: LocalDate => ValidationResult[Unit] = maybeRule.map(rule => rule.isValid _).getOrElse(alwaysValid _)
  }

}

case class StartDateRules(
  daysOfWeekRule: Option[DaysOfWeekRule] = None,
  windowRule: Option[WindowRule] = None
) extends DateRule {
  override def isValid(d: LocalDate): ValidationResult[Unit] = for {
    _ <- windowRule.isValid(d)
    _ <- daysOfWeekRule.isValid(d)
  } yield ()
}

case class DaysOfWeekRule(allowedDays: List[DayOfWeek]) extends DateRule {

  override def isValid(requestedDate: LocalDate): ValidationResult[Unit] =
    allowedDays contains requestedDate.getDayOfWeek orFailWith errorMessage(requestedDate)

  private def errorMessage(date: LocalDate) = {
    val allowedDaysStr = allowedDays.mkString(",")
    val dateDayStr = date.getDayOfWeek.toString
    s"invalid day of the week: $date is a $dateDayStr. Allowed days are $allowedDaysStr"
  }
}

case class WindowRule(
  now: () => LocalDate,
  maybeCutOffDay: Option[DayOfWeek],
  maybeStartDelay: Option[Days],
  maybeSize: Option[Days]
) extends DateRule {

  override def isValid(dateToValidate: LocalDate): ValidationResult[Unit] = {

    val baseDate = maybeCutOffDay match {
      case Some(cutOffDayOfWeek) => now().minusDays(1) `with` TemporalAdjusters.next(cutOffDayOfWeek)
      case None => now()
    }

    val startDelay = maybeStartDelay.getOrElse(Days(0))
    val startDate = baseDate.plusDays(startDelay.value.toLong)
    val maybeWindowEnd = maybeSize.map { windowSize => startDate.plusDays(windowSize.value.toLong) }

    val isOnOrAfterWindowStart = dateToValidate.isAfter(startDate) || dateToValidate.isEqual(startDate)

    def isBeforeWindowEnd = maybeWindowEnd match {
      case None => true
      case Some(windowEnd) => dateToValidate.isBefore(windowEnd)
    }

    def errorMessage = s"$dateToValidate is out of the selectable range: [$startDate - ${maybeWindowEnd.map(_.toString).getOrElse("")})"

    (isOnOrAfterWindowStart && isBeforeWindowEnd) orFailWith errorMessage
  }

}

