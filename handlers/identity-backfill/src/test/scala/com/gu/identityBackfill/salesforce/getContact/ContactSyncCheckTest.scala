package com.gu.identityBackfill.salesforce.getContact

import com.gu.identityBackfill.salesforce.ContactSyncCheck
import com.gu.identityBackfill.salesforce.ContactSyncCheck.RecordTypeId
import com.gu.identityBackfill.salesforce.GetSFContactSyncCheckFields.ContactSyncCheckFields
import com.gu.salesforce.TypesForSFEffectsData.SFContactId
import org.scalatest.{FlatSpec, Matchers}

class ContactSyncCheckTest extends FlatSpec with Matchers {

  it should "should return some contact if contact is valid for update" in {
    val areFieldsValid: List[ContactSyncCheckFields] => Option[SFContactId] = ContactSyncCheck(RecordTypeId("correctId"))
    val actual = areFieldsValid(
      List(ContactSyncCheckFields("ContactId", Some("correctId"), "last", "first", Some("United Kingdom"), Some("foo@bar.com")))
    )
    actual should be(Some(SFContactId("ContactId")))
  }

  it should "no record type gives None" in {
    val areFieldsValid: List[ContactSyncCheckFields] => Option[SFContactId] = ContactSyncCheck(RecordTypeId("correctId"))
    val actual = areFieldsValid(
      List(ContactSyncCheckFields("ContactId", None, "last", "first", Some("United Kingdom"), Some("foo@bar.com")))
    )
    actual should be(None)
  }

  it should "wrong record type gives None" in {
    val areFieldsValid: List[ContactSyncCheckFields] => Option[SFContactId] = ContactSyncCheck(RecordTypeId("correctId"))
    val actual = areFieldsValid(
      List(ContactSyncCheckFields("ContactId", Some("wrong"), "last", "first", Some("United Kingdom"), Some("foo@bar.com")))
    )
    actual should be(None)
  }

  it should "no last name gives None" in {
    val areFieldsValid: List[ContactSyncCheckFields] => Option[SFContactId] = ContactSyncCheck(RecordTypeId("correctId"))
    val actual = areFieldsValid(
      List(ContactSyncCheckFields("ContactId", Some("correctId"), "", "first", Some("United Kingdom"), Some("foo@bar.com")))
    )
    actual should be(None)
  }

  it should "no first name gives None" in {
    val areFieldsValid: List[ContactSyncCheckFields] => Option[SFContactId] = ContactSyncCheck(RecordTypeId("correctId"))
    val actual = areFieldsValid(
      List(ContactSyncCheckFields("ContactId", Some("correctId"), "last", "", Some("United Kingdom"), Some("foo@bar.com")))
    )
    actual should be(None)
  }

  it should "no country gives None" in {
    val areFieldsValid: List[ContactSyncCheckFields] => Option[SFContactId] = ContactSyncCheck(RecordTypeId("correctId"))
    val actual = areFieldsValid(
      List(ContactSyncCheckFields("ContactId", Some("correctId"), "last", "first", Some(""), Some("foo@bar.com")))
    )
    actual should be(None)
  }

  it should "none country gives None" in {
    val areFieldsValid: List[ContactSyncCheckFields] => Option[SFContactId] = ContactSyncCheck(RecordTypeId("correctId"))
    val actual = areFieldsValid(
      List(ContactSyncCheckFields("ContactId", Some("correctId"), "last", "first", None, Some("foo@bar.com")))
    )
    actual should be(None)
  }

  it should "wrong country gives None" in {
    val areFieldsValid: List[ContactSyncCheckFields] => Option[SFContactId] = ContactSyncCheck(RecordTypeId("correctId"))
    val actual = areFieldsValid(
      List(ContactSyncCheckFields("ContactId", Some("correctId"), "last", "first", Some("flurble"), Some("foo@bar.com")))
    )
    actual should be(None)
  }

  it should "invalid email gives None" in {
    val areFieldsValid: List[ContactSyncCheckFields] => Option[SFContactId] = ContactSyncCheck(RecordTypeId("correctId"))
    val actual = areFieldsValid(
      List(ContactSyncCheckFields("ContactId", Some("correctId"), "last", "first", Some("United Kingdom"), Some("foobar.com")))
    )
    actual should be(None)
  }

  it should "empty email is also None" in {
    val areFieldsValid: List[ContactSyncCheckFields] => Option[SFContactId] = ContactSyncCheck(RecordTypeId("correctId"))
    val actual = areFieldsValid(
      List(ContactSyncCheckFields("ContactId", Some("correctId"), "last", "first", Some("United Kingdom"), Some("")))
    )
    actual should be(None)
  }

  it should "none email is also None" in {
    val areFieldsValid: List[ContactSyncCheckFields] => Option[SFContactId] = ContactSyncCheck(RecordTypeId("correctId"))
    val actual = areFieldsValid(List(ContactSyncCheckFields("ContactId", Some("correctId"), "last", "first", Some("United Kingdom"), None)))
    actual should be(None)
  }

  it should "No contact found in query is also None" in {
    val areFieldsValid: List[ContactSyncCheckFields] => Option[SFContactId] = ContactSyncCheck(RecordTypeId("correctId"))
    val actual = areFieldsValid(List.empty)
    actual should be(None)
  }
}
