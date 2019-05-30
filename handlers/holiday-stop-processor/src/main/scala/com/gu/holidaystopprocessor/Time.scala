package com.gu.holidaystopprocessor

import java.time.LocalDate
import org.joda.time.{LocalDate => JodaLocalDate}

object Time {

  def toJavaDate(joda: JodaLocalDate): LocalDate =
    LocalDate.of(joda.getYear, joda.getMonthOfYear, joda.getDayOfMonth)
}
