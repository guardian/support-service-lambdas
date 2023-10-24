package com.gu.sf_gocardless_sync.salesforce

import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.salesforce.SFAuthConfig
import com.gu.salesforce.SalesforceClient
import com.gu.salesforce.SalesforceReads._
import com.gu.sf_gocardless_sync.SyncSharedObjects.{
  BankAccountNumberEnding,
  BankName,
  GoCardlessMandateID,
  MandateCreatedAt,
  Reference,
}
import com.gu.sf_gocardless_sync.salesforce.SalesforceDDMandate.Create.WireNewMandate
import com.gu.sf_gocardless_sync.salesforce.SalesforceDDMandate.Update.WirePatchMandate
import com.gu.sf_gocardless_sync.salesforce.SalesforceDDMandate.{BillingAccountSfId, PaymentMethodSfId}
import com.gu.sf_gocardless_sync.salesforce.SalesforceSharedObjects.{MandateSfId, MandateEventSfId}
import com.gu.test.EffectsTest
import com.gu.util.config.{LoadConfigModule, Stage}
import com.gu.util.resthttp.JsonHttp
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class SalesforceDDMandateEffectsTest extends AnyFlatSpec with Matchers {

  it should "create a 'DD Mandate' in salesforce" taggedAs EffectsTest in {

    val actual = for {
      sfConfig <- LoadConfigModule(Stage("CODE"), GetFromS3.fetchString).load[SFAuthConfig]
      response = RawEffects.response
      sfAuth <- SalesforceClient(response, sfConfig).value.toDisjunction
      wiredOp = SalesforceDDMandate.Create(sfAuth.wrapWith(JsonHttp.post))
      result = wiredOp(
        WireNewMandate(
          GoCardless_Mandate_ID__c = GoCardlessMandateID("MD0004D28YHWH2"),
          Reference__c = Reference("9RNF2YN"),
          Mandate_Created_At__c = MandateCreatedAt("2018-10-22T09:02:00.000+0000"),
          Billing_Account__c = Some(BillingAccountSfId("a026E000003P1VH")),
          Payment_Method__c = Some(PaymentMethodSfId("a066E000006Egzb")),
          Bank_Name__c = BankName("BARCLAYS BANK PLC"),
          Account_Number_Ending__c = BankAccountNumberEnding("11"),
        ),
      )
    } yield result

    System.err.println()
    System.err.println(actual)
    System.err.println()

  }

  it should "event an existing 'DD Mandate' in salesforce" taggedAs EffectsTest in {

    val actual = for {
      sfConfig <- LoadConfigModule(Stage("CODE"), GetFromS3.fetchString).load[SFAuthConfig]
      response = RawEffects.response
      sfAuth <- SalesforceClient(response, sfConfig).value.toDisjunction
      wiredOp = SalesforceDDMandate.Update(sfAuth.wrapWith(JsonHttp.patch))(MandateSfId("a2q6E0000007XgS"))
      result = wiredOp(
        WirePatchMandate(
          Last_Mandate_Event__c = MandateEventSfId("a2r6E000000754r"),
          Payment_Method__c = None,
          Billing_Account__c = None,
        ),
      )
    } yield result

    System.err.println()
    System.err.println(actual)
    System.err.println()

  }

  it should "fetch the PaymentMethod and BillingAccount IDs from salesforce given a list of GoCardless References" taggedAs EffectsTest in {

    val actual = for {
      sfConfig <- LoadConfigModule(Stage("CODE"), GetFromS3.fetchString).load[SFAuthConfig]
      response = RawEffects.response
      sfAuth <- SalesforceClient(response, sfConfig).value.toDisjunction
      wiredOp = SalesforceDDMandate.GetPaymentMethodsEtc(sfAuth.wrapWith(JsonHttp.get))
      shouldBeFound = wiredOp(List(Reference("9RNF2YN")))
      shouldBeNotFound = wiredOp(List(Reference("idontexist")))
    } yield (shouldBeFound, shouldBeNotFound)

    System.err.println()
    System.err.println(actual)
    System.err.println()

  }

  it should "fetch the DD Mandate from salesforce given a GoCardless mandate ID" taggedAs EffectsTest in {

    val actual = for {
      sfConfig <- LoadConfigModule(Stage("CODE"), GetFromS3.fetchString).load[SFAuthConfig]
      response = RawEffects.response
      sfAuth <- SalesforceClient(response, sfConfig).value.toDisjunction
      wiredOp = SalesforceDDMandate.LookupAll(sfAuth.wrapWith(JsonHttp.get))
      shouldBeFound = wiredOp(List(GoCardlessMandateID("MD0004D28YHWH2")))
      shouldBeNotFound = wiredOp(List(GoCardlessMandateID("idontexist")))
    } yield (shouldBeFound, shouldBeNotFound)

    System.err.println()
    System.err.println(actual)
    System.err.println()

  }

}
