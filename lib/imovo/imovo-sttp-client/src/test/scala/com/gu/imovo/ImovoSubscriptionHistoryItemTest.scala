package com.gu.imovo

import io.circe.generic.auto._
import io.circe.parser.decode
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class ImovoSubscriptionHistoryItemTest extends AnyFlatSpec with Matchers {

  "Json decode" should "decode successful redemption" in {
    val json = """{
                 |  "voucherType": "Card",
                 |  "date": "2020-11-23T13:10:17",
                 |  "activityType": "Redemption",
                 |  "address": "1 High Street, London",
                 |  "postCode": "N1 9GU ",
                 |  "reason": "Success",
                 |  "voucherCode": "0123456789",
                 |  "value": 2.20
                 |}
                 |""".stripMargin
    decode[ImovoSubscriptionHistoryItem](json) shouldBe
      Right(
        ImovoSubscriptionHistoryItem(
          voucherCode = "0123456789",
          voucherType = "Card",
          date = "2020-11-23T13:10:17",
          activityType = "Redemption",
          address = Some("1 High Street, London"),
          postCode = Some("N1 9GU "),
          reason = "Success",
          value = 2.2,
        ),
      )
  }

  it should "decode failed redemption" in {
    val json = """{
                 |  "voucherType": "Card",
                 |  "date": "2020-11-22T12:44:50",
                 |  "activityType": "Redemption",
                 |  "address": null,
                 |  "postCode": null,
                 |  "reason": "Redemption rejected - the voucher cannot be used today",
                 |  "voucherCode": "9876543210",
                 |  "value": 0
                 |}
                 |""".stripMargin
    decode[ImovoSubscriptionHistoryItem](json) shouldBe
      Right(
        ImovoSubscriptionHistoryItem(
          voucherCode = "9876543210",
          voucherType = "Card",
          date = "2020-11-22T12:44:50",
          activityType = "Redemption",
          address = None,
          postCode = None,
          reason = "Redemption rejected - the voucher cannot be used today",
          value = 0,
        ),
      )
  }
}
