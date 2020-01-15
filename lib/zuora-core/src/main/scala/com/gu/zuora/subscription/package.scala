package com.gu.zuora

package object subscription {
  type ZuoraApiResponse[T] = Either[ZuoraApiFailure, T]
  type SalesforceApiResponse[T] = Either[SalesforceApiFailure, T]
}
