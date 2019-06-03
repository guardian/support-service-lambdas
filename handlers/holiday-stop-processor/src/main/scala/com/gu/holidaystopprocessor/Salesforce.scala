package com.gu.holidaystopprocessor

import com.gu.effects.RawEffects
import com.gu.salesforce.SalesforceClient
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequest
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequest.HolidayStopRequest
import com.gu.util.resthttp.JsonHttp
import org.joda.time.LocalDate
import scalaz.{-\/, \/-}

object Salesforce {

  private def thresholdDate: LocalDate = LocalDate.now.plusDays(14)

  def holidayStopRequests(
    config: Config,
    productNamePrefix: String
  ): Either[String, List[HolidayStopRequest]] =
    SalesforceClient(RawEffects.response, config.sfCredentials).value.flatMap { sfAuth =>
      val sfGet = sfAuth.wrapWith(JsonHttp.getWithParams)
      val fetchOp = SalesforceHolidayStopRequest.LookupByDateAndProductNamePrefix(sfGet)
      fetchOp(thresholdDate, SalesforceHolidayStopRequest.ProductName(productNamePrefix))
    }.toDisjunction match {
      case -\/(failure) => Left(failure.toString)
      case \/-(requests) => Right(requests)
    }
}
