package com.gu.identityBackfill.salesforce.getContact

import com.gu.identityBackfill.salesforce.ContactSyncCheck
import com.gu.identityBackfill.salesforce.ContactSyncCheck.RecordTypeId
import com.gu.identityBackfill.salesforce.GetSFContactSyncCheckFields.ContactSyncCheckFields
import org.scalatest.{FlatSpec, Matchers}

class ContactSyncCheckTest extends FlatSpec with Matchers {

  it should "valid is true" in {
    val areFieldsValid: ContactSyncCheckFields => Boolean = ContactSyncCheck(RecordTypeId("correctId"))
    val actual = areFieldsValid(ContactSyncCheckFields(Some("correctId"), "last", "first", Some("United Kingdom")))
    actual should be(true)
  }

  it should "no record type false" in {
    val areFieldsValid: ContactSyncCheckFields => Boolean = ContactSyncCheck(RecordTypeId("correctId"))
    val actual = areFieldsValid(ContactSyncCheckFields(None, "last", "first", Some("United Kingdom")))
    actual should be(false)
  }

  it should "wrong record type false" in {
    val areFieldsValid: ContactSyncCheckFields => Boolean = ContactSyncCheck(RecordTypeId("correctId"))
    val actual = areFieldsValid(ContactSyncCheckFields(Some("wrong"), "last", "first", Some("United Kingdom")))
    actual should be(false)
  }

  it should "no last nameis false" in {
    val areFieldsValid: ContactSyncCheckFields => Boolean = ContactSyncCheck(RecordTypeId("correctId"))
    val actual = areFieldsValid(ContactSyncCheckFields(Some("correctId"), "", "first", Some("United Kingdom")))
    actual should be(false)
  }

  it should "no first name is false" in {
    val areFieldsValid: ContactSyncCheckFields => Boolean = ContactSyncCheck(RecordTypeId("correctId"))
    val actual = areFieldsValid(ContactSyncCheckFields(Some("correctId"), "last", "", Some("United Kingdom")))
    actual should be(false)
  }

  it should "no country is false" in {
    val areFieldsValid: ContactSyncCheckFields => Boolean = ContactSyncCheck(RecordTypeId("correctId"))
    val actual = areFieldsValid(ContactSyncCheckFields(Some("correctId"), "last", "first", Some("")))
    actual should be(false)
  }

  it should "none country is false" in {
    val areFieldsValid: ContactSyncCheckFields => Boolean = ContactSyncCheck(RecordTypeId("correctId"))
    val actual = areFieldsValid(ContactSyncCheckFields(Some("correctId"), "last", "first", None))
    actual should be(false)
  }

  it should "wrong country is false" in {
    val areFieldsValid: ContactSyncCheckFields => Boolean = ContactSyncCheck(RecordTypeId("correctId"))
    val actual = areFieldsValid(ContactSyncCheckFields(Some("correctId"), "last", "first", Some("flurble")))
    actual should be(false)
  }

}
