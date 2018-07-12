import com.gu.newProductApi.addSubscription.{AddSubscriptionResponse, AddedSubscription}
import org.scalatest.{FlatSpec, Matchers}
import play.api.libs.json.Json

class AddSubscriptionResponseTest extends FlatSpec with Matchers {
  it should "serialise successful response" in {
    val success: AddSubscriptionResponse = AddedSubscription(subscriptionNumber = "someNumber")

    val expected =
      """
        |{
        | "subscriptionNumber" : "someNumber"
        |}
      """.stripMargin
    Json.toJson(success) shouldBe Json.parse(expected)
  }
}
