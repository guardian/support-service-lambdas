package com.gu.zuora.subscription

import com.gu.zuora.subscription.GetBillingPreview.{BillingPreview, InvoiceItem}
import com.gu.zuora.subscription.GetBillingPreviewTest.rawBillingPreview
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers
import io.circe._
import io.circe.parser._
import org.scalatest.EitherValues

import java.time.LocalDate

class GetBillingPreviewTest
extends AnyFlatSpec
with Matchers
with EitherValues {

  "billing preview" should "deserialise some dev data ok" in {
    val actual = decode[BillingPreview](rawBillingPreview)
    val expectedItems = List(
      InvoiceItem(LocalDate.of(2024, 11, 20), LocalDate.of(2025, 11, 19), "2c92c0f975798642017594c219257799"),
      InvoiceItem(LocalDate.of(2025, 11, 20), LocalDate.of(2026, 11, 19), "2c92c0f975798642017594c219257799"),
    )
    actual.right.value should be(BillingPreview(expectedItems))
  }

}

object GetBillingPreviewTest {

  val rawBillingPreview =
    """
      |{
      |    "accountId": "2c92c0f975798642017594c2133e7741",
      |    "invoiceItems": [
      |        {
      |            "id": "f44cd6b4ab67496fb6132693f6b143c8",
      |            "subscriptionName": "A-S00105942",
      |            "subscriptionId": "71a1bdd636a92793374291f8d0aaa4e9",
      |            "subscriptionNumber": "A-S00105942",
      |            "serviceStartDate": "2024-11-20",
      |            "serviceEndDate": "2025-11-19",
      |            "chargeAmount": 99.170000000,
      |            "chargeDescription": "",
      |            "chargeName": "Digital Pack Annual",
      |            "chargeNumber": "C-00151724",
      |            "chargeId": "2c92c0f975798642017594c219257799",
      |            "productName": "Digital Pack",
      |            "quantity": 1,
      |            "taxAmount": 19.830000000,
      |            "unitOfMeasure": "",
      |            "chargeDate": "2024-10-15 21:57:35",
      |            "chargeType": "Recurring",
      |            "processingType": "Charge",
      |            "appliedToItemId": null,
      |            "numberOfDeliveries": 0.000000000
      |        },
      |        {
      |            "id": "7c5a1d2c082b45058f9c6a4d9499f3d2",
      |            "subscriptionName": "A-S00105942",
      |            "subscriptionId": "71a1bdd636a92793374291f8d0aaa4e9",
      |            "subscriptionNumber": "A-S00105942",
      |            "serviceStartDate": "2025-11-20",
      |            "serviceEndDate": "2026-11-19",
      |            "chargeAmount": 99.170000000,
      |            "chargeDescription": "",
      |            "chargeName": "Digital Pack Annual",
      |            "chargeNumber": "C-00151724",
      |            "chargeId": "2c92c0f975798642017594c219257799",
      |            "productName": "Digital Pack",
      |            "quantity": 1,
      |            "taxAmount": 19.830000000,
      |            "unitOfMeasure": "",
      |            "chargeDate": "2024-10-15 21:57:35",
      |            "chargeType": "Recurring",
      |            "processingType": "Charge",
      |            "appliedToItemId": null,
      |            "numberOfDeliveries": 0.000000000
      |        }
      |    ],
      |    "creditMemoItems": [],
      |    "success": true
      |}
      |""".stripMargin

}