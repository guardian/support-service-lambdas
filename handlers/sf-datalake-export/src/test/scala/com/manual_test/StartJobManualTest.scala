package manualTest

import java.io.{ByteArrayInputStream, ByteArrayOutputStream}

import com.gu.sf_datalake_export.StartJob
import com.gu.sf_datalake_export.salesforce_bulk_api.SfQueries

//This is just a way to locally run the lambda in dev
object StartJobManualTest extends App {

  val queryStr = SfQueries.contactQuery.replace("\n", " ")

  val request =
    s"""{
      |"objectName" : "Contact"
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
