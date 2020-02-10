package com.gu.deliveryproblemcreditprocessor

import java.time.LocalDate

import com.gu.salesforce.RecordsWrapperCaseClass
import io.circe.generic.auto._
import io.circe.parser._
import org.scalactic.TypeCheckedTripleEquals
import org.scalatest.{EitherValues, FlatSpec, Matchers}

import scala.io.Source

class DeliveryCreditRequestTest
  extends FlatSpec
  with Matchers
  with EitherValues
  with TypeCheckedTripleEquals {

  "Json decode" should "decode SF response correctly" in {
    val json = Source.fromResource("sf-credit-request.json").mkString
    decode[RecordsWrapperCaseClass[DeliveryCreditRequest]](json).right.value should ===(
      RecordsWrapperCaseClass(List(
        DeliveryCreditRequest(
          Id = "r1",
          SF_Subscription__r = DeliveryCreditSubscription(Name = "A-S00001"),
          Delivery_Date__c = LocalDate.of(2019, 12, 6),
          Charge_Code__c = None
        ),
        DeliveryCreditRequest(
          Id = "r2",
          SF_Subscription__r = DeliveryCreditSubscription(Name = "A-S00002"),
          Delivery_Date__c = LocalDate.of(2019, 12, 13),
          Charge_Code__c = Some("C12345")
        )
      ))
    )
  }
}
