package com.gu.salesforce.holiday_stops

import java.net.URLEncoder

import com.gu.effects.TestingRawEffects.HTTPResponse
import com.gu.salesforce.RecordsWrapperCaseClass
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequest.HolidayStopRequest
import play.api.libs.json.Json

object SalesForceHolidayStopsEffects {

  def listHolidayStopsResponseBody =
    """{
      | "records": []
      |}""".stripMargin

  def listHolidayQuery(contactId: String, subscriptionName: String) =
    "\n SELECT Id, Start_Date__c, End_Date__c, Subscription_Name__c, Product_Name__c," +
      "\n Actioned_Count__c, Pending_Count__c, Total_Issues_Publications_Impacted_Count__c, (\n" +
      "   \n" +
      " SELECT Id, Subscription_Name__c, " +
      "Product_Name__c, Stopped_Publication_Date__c,\n" +
      " Estimated_Price__c, Charge_Code__c, Actual_Price__c\n" +
      "\n   " +
      "FROM Holiday_Stop_Request_Detail__r\n   " +
      "ORDER BY Stopped_Publication_Date__c ASC\n" +
      " )\n " +
      "FROM Holiday_Stop_Request__c\n" +
      " \n" +
      s"WHERE SF_Subscription__r.Buyer__r.Id = '$contactId' AND Subscription_Name__c = '$subscriptionName'"

  def listHolidayRequestUrl(contactId: String, subscriptionName: String) = {
    s"/services/data/v29.0/query/?q=${escapeQueryStringValue(listHolidayQuery(contactId, subscriptionName))}"
  }

  def escapeQueryStringValue(value: String) = {
    URLEncoder
      .encode(value, "UTF-8")
      .replace("+", "%20")
      .replace("%2C", ",")
      .replace("%28", "(")
      .replace("%29", ")")
  }

  def listHolidayStops(contactId: String, subscriptionName: String, holidayStops: List[HolidayStopRequest]): (String, HTTPResponse) =
    listHolidayRequestUrl(
      contactId,
      subscriptionName
    ) -> HTTPResponse(200, Json.toJson(RecordsWrapperCaseClass(holidayStops)).toString())

}
