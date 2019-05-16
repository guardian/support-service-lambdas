package com.gu.salesforce.holiday_stops

import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.salesforce.SalesforceAuthenticate.SFAuthConfig
import com.gu.salesforce.SalesforceClient
import com.gu.test.EffectsTest
import com.gu.util.config.{LoadConfigModule, Stage}
import com.gu.util.resthttp.JsonHttp
import org.joda.time.LocalDate
import org.scalatest.{FlatSpec, Matchers}

class SalesforceHolidayStopRequestEffectsTest extends FlatSpec with Matchers {

  it should "fetch Holiday Stop Requests by DATE" taggedAs EffectsTest in {

    val actual = for {
      sfConfig <- LoadConfigModule(Stage("DEV"), GetFromS3.fetchString)[SFAuthConfig]
      response = RawEffects.response
      sfAuth <- SalesforceClient(response, sfConfig).value.toDisjunction
      wiredOp = SalesforceHolidayStopRequest.LookupByDate(sfAuth.wrapWith(JsonHttp.get))
      result = wiredOp(LocalDate.now())
    } yield result

    System.err.println()
    System.err.println(actual)
    System.err.println()

  }

}
