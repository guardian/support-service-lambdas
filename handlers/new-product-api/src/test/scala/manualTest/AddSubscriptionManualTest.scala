package manualTest

import java.io.{ByteArrayInputStream, ByteArrayOutputStream}

import com.gu.newproduct.api.addsubscription.Handler
import play.api.libs.json.{JsString, Json}

//This is just a way to locally run the addSubscription lambda in code
object AddSubscriptionManualTest extends App {
  val requestBody =
    """{
      |	"zuoraAccountId":"8ad09b7d83634b880183698ea4ff27cc",
      |	"startDate":"2022-09-23",
      |	"productRatePlanChargeId":"monthly_supporter_plus",
      |	"planId":"monthly_supporter_plus",
      |	"createdByCSR":"David Pepper",
      |	"amountMinorUnits":2000,
      |	"acquisitionSource":"CSR",
      |	"acquisitionCase":"5009E00000Lyy3T"
      |}
    """.stripMargin

  val bodyAsJsString = JsString(requestBody)
  case class ApiRequest(body: String)
  implicit val writes = Json.writes[ApiRequest]
  val requestText = Json.prettyPrint(Json.toJson(ApiRequest(requestBody)))

  println(s"sending request..")
  println(requestText)

  val testInputStream = new ByteArrayInputStream(requestText.getBytes)
  val testOutput = new ByteArrayOutputStream()
  Handler(testInputStream, testOutput, null)

  val response = new String(testOutput.toByteArray)
  println(response)
}
