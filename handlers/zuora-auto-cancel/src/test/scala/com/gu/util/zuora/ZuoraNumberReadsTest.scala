package com.gu.util.zuora

import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers
import play.api.libs.json.{JsBoolean, JsNull, JsNumber, JsString, JsSuccess, JsValue, Json}

class ZuoraNumberReadsTest extends AnyFlatSpec with Matchers {
  List("O-0", "O-001", "O-00005678").foreach { value =>
    "OrderNumber Reads" should s"accept $value" in {
      JsString(value).validate[OrderNumber] shouldBe JsSuccess(OrderNumber(value))
    }
  }

  List("", " ", "O-", "o-1", "O-abc", "O-12A", "O--1", "O-1-2", "order-id", "O-1 ", " O-1", "O-1\n")
    .foreach { value =>
      it should s"reject ${Json.stringify(JsString(value))}" in {
        JsString(value).validate[OrderNumber].isError shouldBe true
      }
    }

  List("A-S001", "s1", "legacy-123", "123", "ABC").foreach { value =>
    "SubscriptionNumber Reads" should s"accept $value without requiring a fixed prefix" in {
      JsString(value).validate[SubscriptionNumber] shouldBe JsSuccess(SubscriptionNumber(value))
    }
  }

  List("", " ", "A S001", "A/S001", "A_S001", "A.S001", "A-S001\n", "A-S001\t").foreach { value =>
    it should s"reject ${Json.stringify(JsString(value))}" in {
      JsString(value).validate[SubscriptionNumber].isError shouldBe true
    }
  }

  List[JsValue](JsNull, JsNumber(123), JsBoolean(true), Json.obj(), Json.arr()).foreach { value =>
    "Identifier Reads" should s"reject non-string JSON $value" in {
      value.validate[OrderNumber].isError shouldBe true
      value.validate[SubscriptionNumber].isError shouldBe true
    }
  }
}
