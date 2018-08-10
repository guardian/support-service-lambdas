package com.gu.identityBackfill.salesforce.getContact

import com.gu.effects.TestingRawEffects
import com.gu.effects.TestingRawEffects.HTTPResponse
import com.gu.identityBackfill.salesforce.GetSFContactSyncCheckFields
import com.gu.identityBackfill.salesforce.GetSFContactSyncCheckFields.ContactSyncCheckFields
import com.gu.salesforce.TypesForSFEffectsData.SFContactId
import com.gu.salesforce.auth.SalesforceAuthenticate.SalesforceAuth
import com.gu.salesforce.auth.SalesforceRestRequestMaker
import com.gu.util.resthttp.Types.ClientSuccess
import org.scalatest.{FlatSpec, Matchers}

class GetSFContactSyncCheckFieldsTest extends FlatSpec with Matchers {

  it should "send the right request for update identity id" in {
    val effects = new TestingRawEffects(responses = GetSFContactSyncCheckFieldsTest.responses)
    val auth = GetSFContactSyncCheckFields(SalesforceRestRequestMaker(
      SalesforceAuth("accesstokentoken", "https://urlsf.hi"),
      effects.response
    )) _
    val actual = auth(SFContactId("00110000011AABBAAB"))
    val expected = ClientSuccess(ContactSyncCheckFields(Some("STANDARD_TEST_DUMMY"), "123", "Testing", Some("United Kingdom")))
    actual should be(expected)

  }
}

object GetSFContactSyncCheckFieldsTest {

  def responses: Map[String, HTTPResponse] = {

    Map(

      "/services/data/v20.0/sobjects/Contact/00110000011AABBAAB"
        -> HTTPResponse(200, dummyContact)
    )
  }

  val dummyContact: String =
    """
      |{
      |    "attributes": {
      |        "type": "Contact",
      |        "url": "/services/data/v20.0/sobjects/Contact/003g000000LEwO6AAL"
      |    },
      |    "Id": "003g000000LEwO6AAL",
      |    "IsDeleted": false,
      |    "MasterRecordId": null,
      |    "AccountId": "001g000000XrQcaAAF",
      |    "LastName": "123",
      |    "FirstName": "Testing",
      |    "Salutation": null,
      |    "Name": "Testing 123",
      |    "RecordTypeId": "STANDARD_TEST_DUMMY",
      |    "OtherStreet": null,
      |    "OtherCity": null,
      |    "OtherState": null,
      |    "OtherPostalCode": null,
      |    "OtherCountry": "United Kingdom",
      |    "MailingStreet": "1 Test",
      |    "MailingCity": "Test",
      |    "MailingState": null,
      |    "MailingPostalCode": "SE18PZ",
      |    "MailingCountry": "GB",
      |    "Phone": "23456",
      |    "Fax": null,
      |    "MobilePhone": null,
      |    "HomePhone": null,
      |    "OtherPhone": null,
      |    "ReportsToId": null,
      |    "Email": "testing123@g.com",
      |    "Title": null,
      |    "Department": null,
      |    "Birthdate": null,
      |    "OwnerId": "00520000003DLCDAA4",
      |    "CreatedDate": "2015-05-05T09:34:16.000+0000",
      |    "CreatedById": "00520000003DLCDAA4",
      |    "LastModifiedDate": "2018-04-11T16:37:01.000+0000",
      |    "LastModifiedById": "005g0000001H9kvAAC",
      |    "SystemModstamp": "2018-04-11T16:37:01.000+0000",
      |    "LastActivityDate": null,
      |    "LastCURequestDate": null,
      |    "LastCUUpdateDate": null,
      |    "EmailBouncedReason": null,
      |    "EmailBouncedDate": null,
      |    "IdentityID__c": "1043",
      |    "Allow_3rd_Party_Mail__c": false,
      |    "Allow_Guardian_Related_Mail__c": false,
      |    "Allow_Membership_Mail__c": true,
      |    "Membership_Tier__c": "Partner",
      |    "Preferred_Email_format__c": null,
      |    "Social_Sign_In_type__c": "None",
      |    "Stripe_Customer_ID__c": "cus_6BPFi6sdMJ1EIM",
      |    "Stripe_Default_Card_ID__c": "card_6BPFmlEvTFgRpg",
      |    "SYS_Auto_Person_Account__c": true,
      |    "zqu__County__c": null,
      |    "Email_Address_Is_Verified__c": false,
      |    "Gender__c": "Prefer not to say",
      |    "SYS_Pending_Effective_Date__c": null,
      |    "SYS_Pending_Tier_Update_Product__c": null,
      |    "SYS_Pending_Tier__c": null,
      |    "SYS_Process_Pending_Tier__c": false,
      |    "Membership_Number__c": "319265",
      |    "Leaving_Membership__c": false,
      |    "tp_Acxiom_Data_Quality_Issues__c": false,
      |    "tp_Acxiom_Data_Quality_Warnings__c": null,
      |    "Import_Batch_Id__c": null,
      |    "Account_Owner__c": "This is the Account Owner",
      |    "Mandate_URL__c": null
      |}
    """.stripMargin

}

