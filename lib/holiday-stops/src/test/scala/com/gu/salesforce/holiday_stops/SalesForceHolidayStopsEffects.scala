package com.gu.salesforce.holiday_stops

import java.net.URLEncoder
import java.time.LocalDate
import com.gu.effects.TestingRawEffects.HTTPResponse
import com.gu.salesforce.SalesforceConstants.salesforceApiVersion
import com.gu.salesforce.{RecordsWrapperCaseClass, SalesforceContactId}
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequest.{
  HolidayStopRequest,
  LookupByContactAndOptionalSubscriptionName,
}
import com.gu.zuora.subscription.SubscriptionName
import play.api.libs.json.Json

object SalesForceHolidayStopsEffects {

  def listHolidayStopsResponseBody =
    """{
      | "records": []
      |}""".stripMargin

  val listHolidayQuery = LookupByContactAndOptionalSubscriptionName.getSOQL _

  def listHolidayRequestUrl(
      contactId: String,
      subscriptionName: String,
      optionalHistoricalCutOff: Option[LocalDate],
  ) = {
    s"/services/data/v$salesforceApiVersion/query/?q=${escapeQueryStringValue(
        listHolidayQuery(
          SalesforceContactId(contactId),
          Some(SubscriptionName(subscriptionName)),
          optionalHistoricalCutOff,
        ),
      )}"
  }

  def escapeQueryStringValue(value: String) =
    URLEncoder.encode(value, "UTF-8").replace("+", "%20")

  def listHolidayStops(
      contactId: String,
      subscriptionName: String,
      holidayStops: List[HolidayStopRequest],
      optionalHistoricalCutOff: Option[LocalDate] = None,
  ): (String, HTTPResponse) =
    listHolidayRequestUrl(
      contactId,
      subscriptionName,
      optionalHistoricalCutOff,
    ) -> HTTPResponse(200, Json.toJson(RecordsWrapperCaseClass(holidayStops)).toString())

}
