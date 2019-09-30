package com.gu

import java.time.LocalDate

import com.gu.holiday_stops.subscription.Subscription

package object holiday_stops {
  type ZuoraHolidayResponse[T] = Either[ZuoraHolidayError, T]
  type SalesforceHolidayResponse[T] = Either[SalesforceHolidayError, T]
  type CreditCalculation = (LocalDate, Subscription) => Either[HolidayError, Double]
}
