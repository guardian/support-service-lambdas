package manualTest

import java.io.{ByteArrayInputStream, ByteArrayOutputStream}

import com.gu.newproduct.api.addsubscription.Handler
import play.api.libs.json.{JsString, Json}

//This is just a way to locally run the addSubscription lambda in dev
object AddSubscriptionManualTest extends App {
  val requestBody =
    """{
      |   "zuoraAccountId":"2c92c0f9661ff980016633b4200228af",
      |   "startDate":"2018-11-12",
      |   "acquisitionSource":"CSR",
      |   "createdByCSR":"CSRName",
      |   "amountMinorUnits": 500,
      |   "acquisitionCase": "caseID",
      |   "planId": "voucher_everyday"
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
