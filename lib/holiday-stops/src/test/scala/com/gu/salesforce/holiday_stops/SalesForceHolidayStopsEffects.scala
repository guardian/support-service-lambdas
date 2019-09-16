package com.gu.salesforce.holiday_stops

import com.gu.effects.TestingRawEffects.HTTPResponse
import com.gu.salesforce.RecordsWrapperCaseClass
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequest.HolidayStopRequest
import play.api.libs.json.Json

object SalesForceHolidayStopsEffects {

  def listHolidayStopsResponseBody =
    """{
      | "records": []
      |}""".stripMargin

  def listHolidayRequestQuery(contactId: String, subscriptionName: String) =
    s"/services/data/v29.0/query/?q=%0A%20SELECT%20Id,%20Start_Date__c,%20End_Date__c,%20Subscription_Name__c," +
      s"%20Product_Name__c,%0A%20Actioned_Count__c,%20Pending_Count__c," +
      s"%20Total_Issues_Publications_Impacted_Count__c,%20(" +
      s"%0A%20%20%20%0A%20SELECT%20Id,%20Subscription_Name__c,%20Product_Name__c,%20Stopped_Publication_Date__c," +
      s"%0A%20Estimated_Price__c,%20Charge_Code__c,%20Actual_Price__c%0A%0A%20%20%20FROM" +
      s"%20Holiday_Stop_Request_Detail__r%0A%20%20%20ORDER%20BY%20Stopped_Publication_Date__c%20ASC%0A%20)" +
      s"%0A%20FROM%20Holiday_Stop_Request__c%0A%20%0AWHERE%20SF_Subscription__r.Buyer__r.Id%20%3D%20%27$contactId" +
      s"%27%20AND%20Subscription_Name__c%20%3D%20%27$subscriptionName%27"

  def listHolidayStops(contactId: String, subscriptionName: String, holidayStops: List[HolidayStopRequest]): (String, HTTPResponse) =
    listHolidayRequestQuery(
      contactId,
      subscriptionName
    ) -> HTTPResponse(200, Json.toJson(RecordsWrapperCaseClass(holidayStops)).toString())

}
