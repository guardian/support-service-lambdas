package com.gu.deliveryproblemcreditprocessor

import com.gu.salesforce.RecordsWrapperCaseClass
import com.softwaremill.diffx.generic.auto._
import com.softwaremill.diffx.scalatest.DiffShouldMatcher
import io.circe.generic.auto._
import io.circe.parser._
import org.scalatest.EitherValues
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

import java.time.LocalDate
import scala.io.Source

class DeliveryCreditRequestTest extends AnyFlatSpec with Matchers with DiffShouldMatcher with EitherValues {

  "Json decode" should "decode SF response correctly" in {
    val json = Source.fromResource("sf-credit-request.json").mkString
    decode[RecordsWrapperCaseClass[DeliveryCreditRequest]](json).value shouldMatchTo(
      RecordsWrapperCaseClass(
        List(
          DeliveryCreditRequest(
            Id = "r1",
            SF_Subscription__r = DeliveryCreditSubscription(Name = "A-S00001"),
            Delivery_Date__c = LocalDate.of(2019, 12, 6),
            Charge_Code__c = None,
            Invoice_Date__c = Some(LocalDate.of(2020, 2, 10)),
          ),
          DeliveryCreditRequest(
            Id = "r2",
            SF_Subscription__r = DeliveryCreditSubscription(Name = "A-S00002"),
            Delivery_Date__c = LocalDate.of(2019, 12, 13),
            Charge_Code__c = Some("C12345"),
            Invoice_Date__c = Some(LocalDate.of(2020, 3, 1)),
          ),
        ),
      ),
    )
  }
}
