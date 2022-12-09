package com.gu.identityBackfill.salesforce.getContact

import com.gu.identityBackfill.salesforce.ContactSyncCheck
import com.gu.identityBackfill.salesforce.ContactSyncCheck.RecordTypeId
import com.gu.identityBackfill.salesforce.GetSFContactSyncCheckFields.ContactSyncCheckFields
import com.gu.salesforce.TypesForSFEffectsData.SFContactId
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class ContactSyncCheckTest extends AnyFlatSpec with Matchers {

  it should "should return right contact if contact is valid for update" in {
    val areFieldsValid: List[ContactSyncCheckFields] => Either[String, SFContactId] =
      ContactSyncCheck(RecordTypeId("correctId"))
    val actual = areFieldsValid(
      List(
        ContactSyncCheckFields(
          "ContactId1",
          Some("wrong"),
          "last",
          "first",
          Some("United Kingdom"),
          Some("foo@bar.com"),
        ),
        ContactSyncCheckFields(
          "ContactId2",
          Some("correctId"),
          "last",
          "first",
          Some("United Kingdom"),
          Some("foo@bar.com"),
        ),
        ContactSyncCheckFields(
          "ContactId3",
          Some("wrong2"),
          "last",
          "first",
          Some("United Kingdom"),
          Some("foo@bar.com"),
        ),
      ),
    )
    actual shouldBe Right(SFContactId("ContactId2"))
  }

  it should "no record type gives left error message" in {
    val areFieldsValid: List[ContactSyncCheckFields] => Either[String, SFContactId] =
      ContactSyncCheck(RecordTypeId("correctId"))
    val actual = areFieldsValid(
      List(ContactSyncCheckFields("ContactId", None, "last", "first", Some("United Kingdom"), Some("foo@bar.com"))),
    )
    actual shouldBe Left("There are no syncable SF Contacts within the customer's account: ContactId")
  }

  it should "wrong record type gives left error message" in {
    val areFieldsValid: List[ContactSyncCheckFields] => Either[String, SFContactId] =
      ContactSyncCheck(RecordTypeId("correctId"))
    val actual = areFieldsValid(
      List(
        ContactSyncCheckFields("ContactId", Some("wrong"), "last", "first", Some("United Kingdom"), Some("foo@bar.com")),
      ),
    )
    actual shouldBe Left("There are no syncable SF Contacts within the customer's account: ContactId")
  }

  it should "all wrong record type gives left error message" in {
    val areFieldsValid: List[ContactSyncCheckFields] => Either[String, SFContactId] =
      ContactSyncCheck(RecordTypeId("correctId"))
    val actual = areFieldsValid(
      List(
        ContactSyncCheckFields(
          "ContactId1",
          Some("wrong"),
          "last",
          "first",
          Some("United Kingdom"),
          Some("foo@bar.com"),
        ),
        ContactSyncCheckFields(
          "ContactId2",
          Some("wrong2"),
          "last",
          "first",
          Some("United Kingdom"),
          Some("foo@bar.com"),
        ),
      ),
    )
    actual shouldBe Left("There are no syncable SF Contacts within the customer's account: ContactId1, ContactId2")
  }

  it should "no last name gives left error message" in {
    val areFieldsValid: List[ContactSyncCheckFields] => Either[String, SFContactId] =
      ContactSyncCheck(RecordTypeId("correctId"))
    val actual = areFieldsValid(
      List(
        ContactSyncCheckFields("ContactId", Some("correctId"), "", "first", Some("United Kingdom"), Some("foo@bar.com")),
      ),
    )
    actual shouldBe Left("Contact ContactId is not syncable - does not have a last name")
  }

  it should "no first name gives left error message" in {
    val areFieldsValid: List[ContactSyncCheckFields] => Either[String, SFContactId] =
      ContactSyncCheck(RecordTypeId("correctId"))
    val actual = areFieldsValid(
      List(
        ContactSyncCheckFields("ContactId", Some("correctId"), "last", "", Some("United Kingdom"), Some("foo@bar.com")),
      ),
    )
    actual shouldBe Left("Contact ContactId is not syncable - does not have a first name")
  }

  it should "no country gives left error message" in {
    val areFieldsValid: List[ContactSyncCheckFields] => Either[String, SFContactId] =
      ContactSyncCheck(RecordTypeId("correctId"))
    val actual = areFieldsValid(
      List(ContactSyncCheckFields("ContactId", Some("correctId"), "last", "first", Some(""), Some("foo@bar.com"))),
    )
    actual shouldBe Left("Contact ContactId is not syncable - does not have a valid country: ")
  }

  it should "none country gives left error message" in {
    val areFieldsValid: List[ContactSyncCheckFields] => Either[String, SFContactId] =
      ContactSyncCheck(RecordTypeId("correctId"))
    val actual = areFieldsValid(
      List(ContactSyncCheckFields("ContactId", Some("correctId"), "last", "first", None, Some("foo@bar.com"))),
    )
    actual shouldBe Left("Contact ContactId is not syncable - does not have a valid country: ")
  }

  it should "wrong country gives left error message" in {
    val areFieldsValid: List[ContactSyncCheckFields] => Either[String, SFContactId] =
      ContactSyncCheck(RecordTypeId("correctId"))
    val actual = areFieldsValid(
      List(
        ContactSyncCheckFields("ContactId", Some("correctId"), "last", "first", Some("flurble"), Some("foo@bar.com")),
      ),
    )
    actual shouldBe Left("Contact ContactId is not syncable - does not have a valid country: flurble")
  }

  it should "invalid email gives left error message" in {
    val areFieldsValid: List[ContactSyncCheckFields] => Either[String, SFContactId] =
      ContactSyncCheck(RecordTypeId("correctId"))
    val actual = areFieldsValid(
      List(
        ContactSyncCheckFields(
          "ContactId",
          Some("correctId"),
          "last",
          "first",
          Some("United Kingdom"),
          Some("foobar.com"),
        ),
      ),
    )
    actual shouldBe Left("Contact ContactId is not syncable - does not have a valid email address: foobar.com")
  }

  it should "empty email gives left error message" in {
    val areFieldsValid: List[ContactSyncCheckFields] => Either[String, SFContactId] =
      ContactSyncCheck(RecordTypeId("correctId"))
    val actual = areFieldsValid(
      List(ContactSyncCheckFields("ContactId", Some("correctId"), "last", "first", Some("United Kingdom"), Some(""))),
    )
    actual shouldBe Left("Contact ContactId is not syncable - does not have a valid email address: ")
  }

  it should "none email gives left error message" in {
    val areFieldsValid: List[ContactSyncCheckFields] => Either[String, SFContactId] =
      ContactSyncCheck(RecordTypeId("correctId"))
    val actual = areFieldsValid(
      List(ContactSyncCheckFields("ContactId", Some("correctId"), "last", "first", Some("United Kingdom"), None)),
    )
    actual shouldBe Left("Contact ContactId is not syncable - does not have a valid email address: ")
  }

  it should "No contact found in query gives left error message" in {
    val areFieldsValid: List[ContactSyncCheckFields] => Either[String, SFContactId] =
      ContactSyncCheck(RecordTypeId("correctId"))
    val actual = areFieldsValid(List.empty)
    actual shouldBe Left("There are no SF Contacts within the customer's account")
  }
}
