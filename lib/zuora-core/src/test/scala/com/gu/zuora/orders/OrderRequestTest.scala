package com.gu.zuora.orders

import com.gu.zuora.subscription.{Add, ChargeOverride, Fixtures, SubscriptionUpdate}
import io.circe.generic.auto._
import io.circe.parser.parse
import io.circe.syntax._
import org.scalatest.EitherValues
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

import java.time.LocalDate
import java.time.temporal.ChronoUnit

class OrderRequestTest extends AnyFlatSpec with Matchers with EitherValues {
  private val publicationDate = LocalDate.parse("2026-08-08")
  private val creditDate = LocalDate.parse("2026-09-01")
  private val orderDate = LocalDate.parse("2026-08-11")
  private val subscription = Fixtures
    .mkGuardianWeeklySubscription(
      termStartDate = LocalDate.parse("2025-09-01"),
      termEndDate = creditDate,
      accountNumber = "A000001",
    )
    .copy(subscriptionNumber = "A-S000001")
  private val productToAdd = Add(
    productRatePlanId = "product-rate-plan-id",
    contractEffectiveDate = creditDate,
    customerAcceptanceDate = creditDate,
    serviceActivationDate = creditDate,
    chargeOverrides = List(
      ChargeOverride(
        productRatePlanChargeId = "product-rate-plan-charge-id",
        HolidayStart__c = publicationDate,
        HolidayEnd__c = publicationDate,
        price = -4.72,
      ),
    ),
  )

  "forCredit" should "build an AddProduct order for a one-time credit" in {
    val request = CreateOrderRequest
      .forCredit(
        subscription,
        SubscriptionUpdate(currentTerm = None, currentTermPeriodType = None, add = List(productToAdd)),
        orderDate,
      )
      .value

    request.asJson shouldBe parse(
      s"""
         |{
         |  "orderDate": "$orderDate",
         |  "existingAccountNumber": "A000001",
         |  "subscriptions": [{
         |    "subscriptionNumber": "A-S000001",
         |    "orderActions": [{
         |      "type": "AddProduct",
         |      "triggerDates": [
         |        {"name": "ContractEffective", "triggerDate": "$creditDate"},
         |        {"name": "ServiceActivation", "triggerDate": "$creditDate"},
         |        {"name": "CustomerAcceptance", "triggerDate": "$creditDate"}
         |      ],
         |      "addProduct": {
         |        "productRatePlanId": "product-rate-plan-id",
         |        "chargeOverrides": [{
         |          "productRatePlanChargeId": "product-rate-plan-charge-id",
         |          "customFields": {
         |            "HolidayStart__c": "$publicationDate",
         |            "HolidayEnd__c": "$publicationDate"
         |          },
         |          "pricing": {"oneTimeFlatFee": {"listPrice": -4.72}}
         |        }]
         |      }
         |    }]
         |  }],
         |  "processingOptions": {"runBilling": false, "collectPayment": false}
         |}
         |""".stripMargin,
    ).value
  }

  it should "extend the term before adding a credit beyond the current term end" in {
    val termStartDate = LocalDate.parse("2026-01-01")
    val extendedTermEndDate = LocalDate.parse("2026-09-01")
    val extendedTermInDays = ChronoUnit.DAYS.between(termStartDate, extendedTermEndDate).toInt
    val request = CreateOrderRequest
      .forCredit(
        subscription.copy(termStartDate = termStartDate, termEndDate = LocalDate.parse("2026-08-31")),
        SubscriptionUpdate(
          currentTerm = Some(extendedTermInDays),
          currentTermPeriodType = Some("Day"),
          add = List(productToAdd),
        ),
        orderDate,
      )
      .value

    val actions = request.subscriptions.head.orderActions
    actions should have length 2
    actions.head shouldBe TermsAndConditionsOrderAction(
      triggerDates = TriggerDate.allOn(orderDate),
      termsAndConditions = TermsAndConditions(
        lastTerm = LastTerm(termType = TermType.Termed, endDate = extendedTermEndDate),
      ),
    )
    actions.head.asJson shouldBe parse(
      s"""
         |{
         |  "type": "TermsAndConditions",
         |  "triggerDates": [
         |    {"name": "ContractEffective", "triggerDate": "$orderDate"},
         |    {"name": "ServiceActivation", "triggerDate": "$orderDate"},
         |    {"name": "CustomerAcceptance", "triggerDate": "$orderDate"}
         |  ],
         |  "termsAndConditions": {
         |    "lastTerm": {"termType": "TERMED", "endDate": "$extendedTermEndDate"}
         |  }
         |}
         |""".stripMargin,
    ).value
    actions(1) shouldBe a[AddProductOrderAction]
  }

  it should "reject a credit update with no product to add" in {
    val result = CreateOrderRequest.forCredit(
      subscription,
      SubscriptionUpdate(currentTerm = None, currentTermPeriodType = None, add = Nil),
      orderDate,
    )

    result.left.value.reason shouldBe "A credit order must add exactly one product rate plan"
  }

  it should "reject an add product action without exactly one price override" in {
    val result = CreateOrderRequest.forCredit(
      subscription,
      SubscriptionUpdate(
        currentTerm = None,
        currentTermPeriodType = None,
        add = List(productToAdd.copy(chargeOverrides = Nil)),
      ),
      orderDate,
    )

    result.left.value.reason shouldBe "A credit order must contain exactly one price override"
  }
}
