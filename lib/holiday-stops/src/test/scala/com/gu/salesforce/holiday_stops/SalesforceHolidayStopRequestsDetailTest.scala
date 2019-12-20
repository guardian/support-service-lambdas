package com.gu.salesforce.holiday_stops

import java.time.LocalDate

import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestsDetail.FetchHolidayStopRequestsDetailsForProductType
import com.gu.zuora.ZuoraProductTypes
import org.scalatest.FlatSpec
import org.scalatest.Matchers._

class SalesforceHolidayStopRequestsDetailTest extends FlatSpec {
  "SalesforceHolidayStopRequestsDetail" should "generate correct soql" in {
    FetchHolidayStopRequestsDetailsForProductType.createSoql(
      List(LocalDate.parse("2019-12-20"), LocalDate.parse("2019-12-21")),
      ZuoraProductTypes.GuardianWeekly
    ).trim should ===(
        """SELECT Id, Subscription_Name__c, Product_Name__c, Stopped_Publication_Date__c,
        | Estimated_Price__c, Charge_Code__c, Actual_Price__c, Expected_Invoice_Date__c
        |
        | FROM Holiday_Stop_Requests_Detail__c
        | WHERE Holiday_Stop_Request__r.SF_Sub_c = 'Guardian Weekly'
        | AND
        | Stopped_Publication_Date__c IN (2019-12-20, 2019-12-21)
        | AND Subscription_Cancellation_Effective_Date__c = null
        | AND Is_Actioned__c = false
        | AND Is_Withdrawn__c = false
        |
        | ORDER BY Stopped_Publication_Date__c ASC""".stripMargin
      )
  }
}
