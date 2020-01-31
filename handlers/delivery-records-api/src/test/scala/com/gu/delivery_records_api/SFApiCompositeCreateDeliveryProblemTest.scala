package com.gu.delivery_records_api

import com.gu.salesforce.IdentityId
import org.scalatest.{FlatSpec, Matchers}

import io.circe.generic.auto._
import io.circe.syntax._

class SFApiCompositeCreateDeliveryProblemTest extends FlatSpec with Matchers {

  // because by default circe wraps the inner 'body' fields with the case class name (as a discriminator) - invalid for SF
  it should "encode a SFApiCompositeCreateDeliveryProblem to JSON correctly" in {

    SFApiCompositeCreateDeliveryProblem(
      subscriptionNumber = "A-S123456",
      contact = IdentityId("123456789"),
      productName = "Guardian Weekly",
      description = Some("description"),
      problemType = "No delivery",
      recordIds = List(
        "deliveryRecordIdA",
        "deliveryRecordIdB"
      )
    ).asJson.spaces2 should equal(
        s"""{
         |  "allOrNone" : true,
         |  "collateSubrequests" : false,
         |  "compositeRequest" : [
         |    {
         |      "referenceId" : "CaseCreation",
         |      "method" : "POST",
         |      "url" : "/services/data/v29.0/sobjects/Case",
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
         |        "Subject" : "[Self Service] Delivery Problem : No delivery (Guardian Weekly - A-S123456)",
         |        "Description" : "description",
         |        "Product__c" : "Guardian Weekly",
         |        "Journey__c" : "CS - Guardian Weekly Support",
         |        "Enquiry_Type__c" : "Delivery issues",
         |        "Case_Closure_Reason__c" : "No delivery"
         |      }
         |    },
         |    {
         |      "referenceId" : "LinkDeliveryRecord-deliveryRecordIdA",
         |      "method" : "PATCH",
         |      "url" : "/services/data/v29.0/sobjects/Delivery__c/deliveryRecordIdA",
         |      "body" : {
         |        "Case__c" : "@{CaseCreation.id}"
         |      }
         |    },
         |    {
         |      "referenceId" : "LinkDeliveryRecord-deliveryRecordIdB",
         |      "method" : "PATCH",
         |      "url" : "/services/data/v29.0/sobjects/Delivery__c/deliveryRecordIdB",
         |      "body" : {
         |        "Case__c" : "@{CaseCreation.id}"
         |      }
         |    }
         |  ]
         |}""".stripMargin
      )

  }

}
