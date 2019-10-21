package com.gu

package object holiday_stops {
  type ZuoraHolidayResponse[T] = Either[ZuoraHolidayError, T]
  type SalesforceHolidayResponse[T] = Either[SalesforceHolidayError, T]
}
