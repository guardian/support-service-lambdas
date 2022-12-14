package com.gu.delivery_records_api

import java.time.{LocalDate, LocalDateTime}
import com.gu.salesforce.IdentityId
import com.gu.salesforce.SalesforceConstants.salesforceApiVersion
import io.circe.generic.auto._
import io.circe.syntax._
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class SFApiCompositeCreateDeliveryProblemTest extends AnyFlatSpec with Matchers {

  // because by default circe wraps the inner 'body' fields with the case class name (as a discriminator) - invalid for SF
  it should "encode a SFApiCompositeCreateDeliveryProblem to JSON correctly (for composite request)" in {

    val now = LocalDateTime.now()

    SFApiCompositeCreateDeliveryProblem(
      subscriptionNumber = "A-S123456",
      contact = IdentityId("123456789"),
      detail = CreateDeliveryProblem(
        productName = "Guardian Weekly",
        description = Some("description"),
        problemType = "No delivery",
        deliveryRecords = List(
          DeliveryRecordToLink(
            id = "deliveryRecordIdA",
            creditAmount = Some(1.23),
            invoiceDate = Some(LocalDate.of(2019, 12, 10)),
          ),
          DeliveryRecordToLink(
            id = "deliveryRecordIdB",
            creditAmount = Some(3.21),
            invoiceDate = Some(LocalDate.of(2020, 1, 10)),
          ),
        ),
        newContactPhoneNumbers = Some(
          SFApiContactPhoneNumbers(
            Id = Some("id"),
            Phone = Some("1234567890"),
          ),
        ),
        repeatDeliveryProblem = Some(true),
      ),
      now,
    ).asJson.spaces2 should equal(
      s"""{
         |  "allOrNone" : true,
         |  "collateSubrequests" : false,
         |  "compositeRequest" : [
         |    {
         |      "referenceId" : "CaseCreation",
         |      "method" : "POST",
         |      "url" : "/services/data/v$salesforceApiVersion/sobjects/Case",
         |      "body" : {
         |        "Contact" : {
         |          "IdentityID__c" : "123456789"
         |        },
         |        "ContactId" : null,
         |        "SF_Subscription__r" : {
         |          "Name" : "A-S123456"
         |        },
         |        "Origin" : "Self Service",
         |        "Status" : "New",
         |        "Priority" : null,
         |        "Subject" : "[Self Service] Delivery Problem : No delivery (Guardian Weekly - A-S123456)",
         |        "Description" : "description",
         |        "Product__c" : "Guardian Weekly",
         |        "Journey__c" : "CS - Guardian Weekly Support",
         |        "Enquiry_Type__c" : "Delivery issues",
         |        "Case_Closure_Reason__c" : "No delivery",
         |        "Repeat_Delivery_Issue__c" : true
         |      }
         |    },
         |    {
         |      "referenceId" : "LinkDeliveryRecord_deliveryRecordIdA",
         |      "method" : "PATCH",
         |      "url" : "/services/data/v$salesforceApiVersion/sobjects/Delivery__c/deliveryRecordIdA",
         |      "body" : {
         |        "Case__c" : "@{CaseCreation.id}",
         |        "Credit_Amount__c" : 1.23,
         |        "Invoice_Date__c" : "2019-12-10",
         |        "Credit_Requested_On__c" : ${now.asJson.toString}
         |      }
         |    },
         |    {
         |      "referenceId" : "LinkDeliveryRecord_deliveryRecordIdB",
         |      "method" : "PATCH",
         |      "url" : "/services/data/v$salesforceApiVersion/sobjects/Delivery__c/deliveryRecordIdB",
         |      "body" : {
         |        "Case__c" : "@{CaseCreation.id}",
         |        "Credit_Amount__c" : 3.21,
         |        "Invoice_Date__c" : "2020-01-10",
         |        "Credit_Requested_On__c" : ${now.asJson.toString}
         |      }
         |    },
         |    {
         |      "referenceId" : "UpdateContactPhoneNumbers",
         |      "method" : "PATCH",
         |      "url" : "/services/data/v$salesforceApiVersion/sobjects/Contact/id",
         |      "body" : {
         |        "Id" : null,
         |        "Phone" : "1234567890",
         |        "HomePhone" : null,
         |        "MobilePhone" : null,
         |        "OtherPhone" : null
         |      }
         |    }
         |  ]
         |}""".stripMargin,
    )

  }

  "SFApiContactPhoneNumbers" should "filter out garbage" in {

    val baseContactNumbers = SFApiContactPhoneNumbers(Some("id"))

    baseContactNumbers
      .copy(
        Phone = Some("123456789"),
      )
      .filterOutGarbage() should equal(
      baseContactNumbers.copy(
        Phone = Some("123456789"),
      ),
    )

    baseContactNumbers
      .copy(
        Phone = Some("123456789"),
        HomePhone = Some("whats_an_email_address_doing_here@123.com"),
        OtherPhone = Some("some garbage text which shouldn't be in a phone field!!!"),
      )
      .filterOutGarbage() should equal(
      baseContactNumbers.copy(
        Phone = Some("123456789"),
      ),
    )

    baseContactNumbers
      .copy(
        Phone = Some("123456789"),
        OtherPhone = Some("123-456-789"),
      )
      .filterOutGarbage() should equal(
      baseContactNumbers.copy(
        Phone = Some("123456789"),
        OtherPhone = Some("123-456-789"),
      ),
    )

    baseContactNumbers
      .copy(
        Phone = Some("+44123456789"),
      )
      .filterOutGarbage() should equal(
      baseContactNumbers.copy(
        Phone = Some("+44123456789"),
      ),
    )

    baseContactNumbers
      .copy(
        Phone = Some("123 456 789"),
      )
      .filterOutGarbage() should equal(
      baseContactNumbers.copy(
        Phone = Some("123 456 789"),
      ),
    )

  }

}
