import java.time.LocalDate

import com.gu.newProductApi.addSubscription.AddSubscriptionRequest
import org.scalatest.{FlatSpec, Matchers}
import play.api.libs.json.{JsError, Json}

class AddSubscriptionRequestTest extends FlatSpec with Matchers {
  it should "deserialize correctly" in {
    val input =
      """{
        |   "accountKey":"accountkeyValue",
        |   "contractEffectiveDate":"2018-07-11",
        |   "productRatePlanId":"rateplanId",
        |   "productRatePlanChargeId":"rateplanChargeId",
        |   "acquisitionSource":"CSR",
        |   "createdByCSR":"CSRName",
        |   "price": 220
        |}
      """.stripMargin

    val actual = Json.parse(input).as[AddSubscriptionRequest]

    actual shouldBe AddSubscriptionRequest(
      accountKey = "accountkeyValue",
      contractEffectiveDate = LocalDate.of(2018, 7, 11),
      productRatePlanId = "rateplanId",
      productRatePlanChargeId = "rateplanChargeId",
      acquisitionSource = "CSR",
      createdByCSR = "CSRName",
      priceInCents = 220
    )
  }

  it should "fail if wrong date format" in {
    val input =
      """{
        |   "accountKey":"accountkeyValue",
        |   "contractEffectiveDate":"december 7, 2018",
        |   "productRatePlanId":"rateplanId",
        |   "productRatePlanChargeId":"rateplanChargeId",
        |   "acquisitionSource":"CSR",
        |   "createdByCSR":"CSRName",
        |   "price": 220
        |}
      """.stripMargin

    Json.parse(input).validate[AddSubscriptionRequest] shouldBe JsError("invalid date format")

  }
}

