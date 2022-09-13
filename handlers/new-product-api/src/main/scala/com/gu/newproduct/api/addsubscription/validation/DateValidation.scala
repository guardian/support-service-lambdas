package com.gu.newproduct.api.addsubscription.validation

import java.time.{DayOfWeek, LocalDate}

import com.gu.newproduct.api.addsubscription.validation.Validation._
import com.gu.newproduct.api.productcatalog._
import scala.language.postfixOps

case class SelectableWindow(start: LocalDate, maybeEndExclusive: Option[LocalDate]) {
  def contains(date: LocalDate) = {
    val isOnOrAfterWindowStart = date.isAfter(start) || date.isEqual(start)

    def isBeforeWindowEnd = maybeEndExclusive match {
      case None => true
      case Some(windowEnd) => date.isBefore(windowEnd)
    }

    isOnOrAfterWindowStart && isBeforeWindowEnd
  }
}

object SelectableWindow {
  def apply(
    now: () => LocalDate,
    windowRule: WindowRule
  ): SelectableWindow = {
    val maybeWindowEnd = windowRule.maybeSize.map {
      windowSize => windowRule.startDate.plusDays(windowSize.value.toLong)
    }
    SelectableWindow(windowRule.startDate, maybeWindowEnd)
  }
}

object StartDateValidator {
  def apply(
    isValidDayOfWeek: LocalDate => ValidationResult[Unit],
    isInSelectableWindow: LocalDate => ValidationResult[Unit],
    dateToValidate: LocalDate
  ): ValidationResult[Unit] = for {
    _ <- isInSelectableWindow(dateToValidate)
    _ <- isValidDayOfWeek(dateToValidate)
  } yield ()

  def fromRule(
    validatorFor: DateRule => LocalDate => ValidationResult[Unit],
    startDateRules: StartDateRules
  ): LocalDate => ValidationResult[Unit] = {
    val maybeDaysValidation = startDateRules.daysOfWeekRule.map(validatorFor)
    StartDateValidator(maybeDaysValidation orPass, validatorFor(startDateRules.windowRule), _)
  }

  implicit class OptionalRuleOps(maybeRule: Option[LocalDate => ValidationResult[Unit]]) {
    def orPass: LocalDate => ValidationResult[Unit] = maybeRule.getOrElse { (anyDate: LocalDate) => Passed(()) }
  }

}

object DateValidator {
  def validatorFor(now: () => LocalDate, dateRule: DateRule): LocalDate => ValidationResult[Unit] = dateRule match {
    case rule: DaysOfWeekRule => DayOfWeekValidator(rule.allowedDays, _)
    case rule: WindowRule => WindowValidator(SelectableWindow(now, rule), _)
  }
}

object DayOfWeekValidator {
  def apply(
    allowedDays: List[DayOfWeek],
    dateToValidate: LocalDate
  ): ValidationResult[Unit] = {

    def errorMessage(date: LocalDate) = {
      val allowedDaysStr = allowedDays.mkString(",")
      val dateDayStr = date.getDayOfWeek.toString
      s"invalid day of the week: $date is a $dateDayStr. Allowed days are $allowedDaysStr"
    }

    allowedDays contains dateToValidate.getDayOfWeek orFailWith errorMessage(dateToValidate)
  }
}

object WindowValidator {
  def apply(
    selectableWindow: SelectableWindow,
    dateToValidate: LocalDate
  ): ValidationResult[Unit] = {

    def errorMessage = {
      val windowEndStr = selectableWindow.maybeEndExclusive.map(_.toString).getOrElse("")
      s"$dateToValidate is out of the selectable range: [${selectableWindow.start} - $windowEndStr)"
    }

    selectableWindow contains dateToValidate orFailWith errorMessage
  }
}
