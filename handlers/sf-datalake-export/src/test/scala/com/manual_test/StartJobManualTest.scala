package manualTest

import java.io.{ByteArrayInputStream, ByteArrayOutputStream}

import com.gu.sf_datalake_export.StartJob
import play.api.libs.json.{JsString, Json}

//This is just a way to locally run the addSubscription lambda in dev
object StartJobManualTest extends App {
  val request =
    """{
      |"objectType" : "Contact",
      |"query" : "SELECT id, Name FROM Contact limit 20",
      |"jobName" : "contacts"
      |}
    """.stripMargin

  println(s"sending request..")
  println(request)

  val testInputStream = new ByteArrayInputStream(request.getBytes)
  val testOutput = new ByteArrayOutputStream()
  StartJob(testInputStream, testOutput, null)

  val response = new String(testOutput.toByteArray)
  println(response)
}
