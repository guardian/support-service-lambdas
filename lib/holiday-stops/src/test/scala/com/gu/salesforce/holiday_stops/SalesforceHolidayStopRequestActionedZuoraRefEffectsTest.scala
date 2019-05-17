package com.gu.salesforce.holiday_stops

import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.salesforce.SalesforceAuthenticate.SFAuthConfig
import com.gu.salesforce.SalesforceClient
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequest.HolidayStopRequestId
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestActionedZuoraRef.{HolidayStopRequestActionedZuoraAmendmentCode, HolidayStopRequestActionedZuoraAmendmentPrice, HolidayStopRequestActionedZuoraRef}
import com.gu.test.EffectsTest
import com.gu.util.config.{LoadConfigModule, Stage}
import com.gu.util.resthttp.JsonHttp
import org.scalatest.{FlatSpec, Matchers}

class SalesforceHolidayStopRequestActionedZuoraRefEffectsTest extends FlatSpec with Matchers {

  it should "create a Holiday Stop Request Actioned Zuora Ref" taggedAs EffectsTest in {

    val actual = for {
      sfConfig <- LoadConfigModule(Stage("DEV"), GetFromS3.fetchString)[SFAuthConfig]
      response = RawEffects.response
      sfAuth <- SalesforceClient(response, sfConfig).value.toDisjunction
      wiredOp = SalesforceHolidayStopRequestActionedZuoraRef.CreateHolidayStopRequestActionedZuoraRef(sfAuth.wrapWith(JsonHttp.post))
      result = wiredOp(HolidayStopRequestActionedZuoraRef(
        Holiday_Stop_Request__c = HolidayStopRequestId("a2y6E000000Hy38"),
        Amendment_Code__c = HolidayStopRequestActionedZuoraAmendmentCode("AM1234567"),
        Price__c = Some(HolidayStopRequestActionedZuoraAmendmentPrice(-12.34))
      ))
    } yield result

    System.err.println()
    System.err.println(actual)
    System.err.println()

  }

}
