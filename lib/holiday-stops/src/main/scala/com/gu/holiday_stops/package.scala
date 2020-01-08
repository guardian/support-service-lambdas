package com.gu

package object holiday_stops {
  type ZuoraApiResponse[T] = Either[ZuoraApiFailure, T]
  type SalesforceApiResponse[T] = Either[SalesforceApiFailure, T]
}
