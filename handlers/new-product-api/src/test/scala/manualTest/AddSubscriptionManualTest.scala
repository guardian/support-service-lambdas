package manualTest

import java.io.{ByteArrayInputStream, ByteArrayOutputStream}

import com.gu.newproduct.api.addsubscription.Handler
import play.api.libs.json.{JsString, Json}

//This is just a way to locally run the addSubscription lambda in dev
object AddSubscriptionManualTest extends App {
  val requestBody =
    """{
      |   "zuoraAccountId":"2c92c0f967640caa016764f73a0d22d3",
      |   "startDate":"2019-03-04",
      |   "acquisitionSource":"CSR",
      |   "createdByCSR":"someone testingsadasd",
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
