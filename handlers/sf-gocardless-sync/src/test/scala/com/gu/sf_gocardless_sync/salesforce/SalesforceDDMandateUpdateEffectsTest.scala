package com.gu.sf_gocardless_sync.salesforce

import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.salesforce.SalesforceAuthenticate.SFAuthConfig
import com.gu.salesforce.SalesforceClient
import com.gu.sf_gocardless_sync.SyncSharedObjects.{Cause, Description, GoCardlessMandateUpdateID, Status}
import com.gu.sf_gocardless_sync.salesforce.SalesforceDDMandateUpdate.Create.WireNewMandateUpdate
import com.gu.sf_gocardless_sync.salesforce.SalesforceSharedObjects.{MandateSfId, UpdateHappenedAt}
import com.gu.test.EffectsTest
import com.gu.util.config.{LoadConfigModule, Stage}
import com.gu.util.resthttp.JsonHttp
import org.scalatest.{FlatSpec, Matchers}

class SalesforceDDMandateUpdateEffectsTest extends FlatSpec with Matchers {

  it should "create a 'DD Mandate Update' in salesforce" taggedAs EffectsTest in {

    val actual = for {
      sfConfig <- LoadConfigModule(Stage("DEV"), GetFromS3.fetchString)[SFAuthConfig]
      response = RawEffects.response
      sfAuth <- SalesforceClient(response, sfConfig).value.toDisjunction
      wiredOp = SalesforceDDMandateUpdate.Create(sfAuth.wrapWith(JsonHttp.post))
      result = wiredOp(WireNewMandateUpdate(
        GoCardless_Mandate_Update_ID__c = GoCardlessMandateUpdateID("EV001ZY8E579T6"),
        DD_Mandate__c = MandateSfId("a2q6E0000007XgSQAU"),
        Update_Happened_At__c = UpdateHappenedAt("2018-10-22T09:02:00.000+0000"),
        Status__c = Status("active"),
        Cause__c = Cause("mandate_activated"),
        Description__c = Description("The time window after submission for the banks to refuse a mandate has ended without any errors being received, so this mandate is now active."),
        Reason_Code__c = None
      ))
    } yield result

    System.err.println()
    System.err.println(actual)
    System.err.println()

  }

  it should "fetch the GoCardlessID of the last successfully processed 'DD Mandate Update' from salesforce" taggedAs EffectsTest in {

    val actual = for {
      sfConfig <- LoadConfigModule(Stage("DEV"), GetFromS3.fetchString)[SFAuthConfig]
      response = RawEffects.response
      sfAuth <- SalesforceClient(response, sfConfig).value.toDisjunction
      wiredOp = SalesforceDDMandateUpdate.GetGoCardlessIdOfLastProcessed(sfAuth.wrapWith(JsonHttp.get))
      result = wiredOp()
    } yield result

    System.err.println()
    System.err.println(actual)
    System.err.println()

  }

}
