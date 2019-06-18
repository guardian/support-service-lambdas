package com.gu.util

import java.time.LocalDate

import org.joda.time.{LocalDate => JodaLocalDate}

object Time {

  def toJavaDate(joda: JodaLocalDate): LocalDate =
    LocalDate.of(joda.getYear, joda.getMonthOfYear, joda.getDayOfMonth)

  def toJodaDate(date: LocalDate): JodaLocalDate =
    new JodaLocalDate(date.getYear, date.getMonth.getValue, date.getDayOfMonth)
}
