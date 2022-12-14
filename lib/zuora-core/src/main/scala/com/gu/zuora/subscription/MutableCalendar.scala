package com.gu.zuora.subscription

import java.time.LocalDate
import java.util.concurrent.atomic.AtomicReference

/** Enables simulating what is today for testing purposes. Inspired by DateTimeUtils.setCurrentMillisFixed() Joda's
  * https://stackoverflow.com/q/24491260/5205022
  */
object MutableCalendar {
  private val mutableDate: AtomicReference[Option[LocalDate]] = new AtomicReference(None)
  def setFakeToday(date: Option[LocalDate]): Unit = mutableDate.set(date)
  def today: LocalDate = mutableDate.get.getOrElse(LocalDate.now)
}
