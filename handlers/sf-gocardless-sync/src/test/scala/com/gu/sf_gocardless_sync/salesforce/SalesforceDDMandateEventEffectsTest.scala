package com.gu.sf_gocardless_sync.salesforce

import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.salesforce.SFAuthConfig
import com.gu.salesforce.SalesforceClient
import com.gu.salesforce.SalesforceReads._
import com.gu.sf_gocardless_sync.SyncSharedObjects.{Cause, Description, GoCardlessMandateEventID, Status}
import com.gu.sf_gocardless_sync.salesforce.SalesforceDDMandateEvent.Create.WireNewMandateEvent
import com.gu.sf_gocardless_sync.salesforce.SalesforceSharedObjects.{MandateSfId, EventHappenedAt}
import com.gu.test.EffectsTest
import com.gu.util.config.{LoadConfigModule, Stage}
import com.gu.util.resthttp.JsonHttp
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class SalesforceDDMandateEventEffectsTest extends AnyFlatSpec with Matchers {

  it should "create a 'DD Mandate Event' in salesforce" taggedAs EffectsTest in {

    val actual = for {
      sfConfig <- LoadConfigModule(Stage("CODE"), GetFromS3.fetchString)[SFAuthConfig]
      response = RawEffects.response
      sfAuth <- SalesforceClient(response, sfConfig).value.toDisjunction
      wiredOp = SalesforceDDMandateEvent.Create(sfAuth.wrapWith(JsonHttp.post))
      result = wiredOp(
        WireNewMandateEvent(
          GoCardless_Mandate_Event_ID__c = GoCardlessMandateEventID("EV001ZY8E579T6"),
          DD_Mandate__c = MandateSfId("a2q6E0000007XgSQAU"),
          Event_Happened_At__c = EventHappenedAt("2018-10-22T09:02:00.000+0000"),
          Status__c = Status("active"),
          Cause__c = Cause("mandate_activated"),
          Description__c = Description(
            "The time window after submission for the banks to refuse a mandate has ended without any errors being received, so this mandate is now active.",
          ),
          Reason_Code__c = None,
        ),
      )
    } yield result

    System.err.println()
    System.err.println(actual)
    System.err.println()

  }

  it should "fetch the GoCardlessID of the last successfully processed 'DD Mandate Event' from salesforce" taggedAs EffectsTest in {

    val actual = for {
      sfConfig <- LoadConfigModule(Stage("CODE"), GetFromS3.fetchString)[SFAuthConfig]
      response = RawEffects.response
      sfAuth <- SalesforceClient(response, sfConfig).value.toDisjunction
      wiredOp = SalesforceDDMandateEvent.GetGoCardlessIdOfLastProcessed(sfAuth.wrapWith(JsonHttp.get))
      result = wiredOp()
    } yield result

    System.err.println()
    System.err.println(actual)
    System.err.println()

  }

}
