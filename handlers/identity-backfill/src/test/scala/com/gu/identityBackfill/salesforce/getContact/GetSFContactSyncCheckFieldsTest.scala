package com.gu.identityBackfill.salesforce.getContact

import com.gu.identityBackfill.salesforce.GetSFContactSyncCheckFields
import com.gu.identityBackfill.salesforce.GetSFContactSyncCheckFields.{ContactSyncCheckFields, ContactsByAccountIdQueryResponse}
import com.gu.salesforce.TypesForSFEffectsData.SFAccountId
import com.gu.util.resthttp.RestRequestMaker.{GetRequest, RelativePath}
import org.scalatest.{FlatSpec, Matchers}
import play.api.libs.json.{JsSuccess, Json}

class GetSFContactSyncCheckFieldsTest extends FlatSpec with Matchers {

  it should "send the right request for get the contact sync fields" in {
    val actual = GetSFContactSyncCheckFields.toRequest(SFAccountId("001g000000XrQcaAAF"))
    val expected = GetRequest(
      RelativePath(
        "/services/data/v43.0/query?q=SELECT Id, RecordTypeId, LastName, FirstName, OtherCountry, Email FROM Contact " +
          "WHERE AccountId = '001g000000XrQcaAAF'"
      )
    )
    actual should be(expected)
  }

  it should "parse the response" in {
    val actual = Json.parse(GetSFContactSyncCheckFieldsTest.dummyContact).validate[ContactsByAccountIdQueryResponse]
    val expected = JsSuccess(
      ContactsByAccountIdQueryResponse(
        totalSize = 1,
        done = true,
        records = List(
          ContactSyncCheckFields(
            "00110000011AABBAAB", Some("STANDARD_TEST_DUMMY"), "123", "Testing", Some("United Kingdom"), Some("testing123@g.com")
          )
        )
      )
    )
    actual should be(expected)
  }

}

object GetSFContactSyncCheckFieldsTest {

  val dummyContact: String =
    """
      |{
      |    "totalSize": 1,
      |    "done": true,
      |    "records": [
      |        {
      |            "attributes": {
      |                "type": "Contact",
      |                "url": "/services/data/v43.0/sobjects/Contact/00110000011AABBAAB"
      |            },
      |            "Id": "00110000011AABBAAB",
      |            "RecordTypeId": "STANDARD_TEST_DUMMY",
      |            "LastName": "123",
      |            "FirstName": "Testing",
      |            "OtherCountry": "United Kingdom",
      |            "Email": "testing123@g.com"
      |        }
      |    ]
      |}
    """.stripMargin

}

