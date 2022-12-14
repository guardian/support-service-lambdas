package com.gu.batchemailsender.api.batchemail

import java.time.LocalDate
import java.time.format.DateTimeFormatter
import scala.util.{Failure, Success, Try}

object SalesforceToBrazeTransformations {
  def fromSfDateToDisplayDate(sfDate: String): String = {
    val formattedDate: Try[String] = Try {
      val asDateTime = LocalDate.parse(sfDate, DateTimeFormatter.ofPattern("yyyy-MM-dd"))
      asDateTime.format(DateTimeFormatter.ofPattern("d MMMM yyyy"))
    }

    formattedDate match {
      case Success(date) => date
      case Failure(_) => sfDate
    }
  }

  /** Salesforce mailingStreet field concatenates on a single line (line1,line), whilst MMA has it over two separate
    * lines
    */
  private val sfStreetPattern = """([^,]+),(.*)""".r

  def sfStreetToLine1(in: String): Option[String] =
    in match {
      case sfStreetPattern(line1, _) if line1.nonEmpty => Some(line1)
      case _ => None
    }

  def sfStreetToLine2(in: String): Option[String] =
    in match {
      case sfStreetPattern(_, line2) if line2.nonEmpty => Some(line2)
      case _ => None
    }

  /** CSRs sometimes remove names or replace them with dot */
  def atLeastSupporter(firstName: Option[String]): String = {
    firstName.map(_.trim) match {
      case None | Some(".") => "Supporter"
      case Some(v) => v
    }
  }
  def atLeastEmptyString(lastName: Option[String]): String = {
    lastName.map(_.trim) match {
      case None | Some(".") => ""
      case Some(v) => v
    }
  }
}
