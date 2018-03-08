package com.gu.effects

import java.time.LocalDate

import com.gu.effects.TestingRawEffects._
import com.gu.util.Stage
import okhttp3._
import okhttp3.internal.Util.UTF_8
import okio.Buffer

import scala.util.Success

class TestingRawEffects(val isProd: Boolean = false, val defaultCode: Int = 1, responses: Map[String, (Int, String)] = Map()) {

  var result: List[Request] = Nil // !

  val stage = Stage(if (isProd) "PROD" else "DEV")

  def requestsAttempted = result.map { request =>
    val buffer = new Buffer()
    Option(request.body()).foreach(_.writeTo(buffer))
    val body = buffer.readString(UTF_8)
    val url = request.url
    BasicResult(request.method(), url.encodedPath(), body)
  }

  val response: Request => Response = {
    req =>
      result = req :: result
      val (code, response) = responses.getOrElse(req.url().encodedPath(), (defaultCode, """{"success": true}"""))
      println(s"request for: ${req.url().encodedPath()} so returning $response")
      new Response.Builder()
        .request(req)
        .protocol(Protocol.HTTP_1_1)
        .code(code)
        .body(ResponseBody.create(MediaType.parse("text/plain"), response))
        .message("message??")
        .build()
  }

  // TODO nicer type than tuple
  def resultMap: Map[(String, String), Option[String]] = {
    //verify
    def body(b: RequestBody): String = {
      val buffer = new Buffer()
      b.writeTo(buffer)
      buffer.readString(UTF_8)
    }

    result.map(req => (req.method, req.url.encodedPath) -> Option(req.body).map(body)).toMap
  }
  val rawEffects = RawEffects(response, stage, _ => Success(codeConfig), () => LocalDate.of(2017, 11, 19))

}

object TestingRawEffects {

  case class BasicResult(method: String, path: String, body: String)

  val codeConfig: String =
    """
      |{ "stage": "DEV",
      |  "trustedApiConfig": {
      |    "apiClientId": "a",
      |    "apiToken": "b",
      |    "tenantId": "c"
      |  },
      |  "zuoraRestConfig": {
      |    "baseUrl": "https://ddd",
      |    "username": "e@f.com",
      |    "password": "ggg"
      |  },
      |  "etConfig": {
      |    "etSendIDs":
      |    {
      |      "pf1": "111",
      |      "pf2": "222",
      |      "pf3": "333",
      |      "pf4": "444",
      |      "cancelled": "ccc"
      |    },
      |    "clientId": "jjj",
      |    "clientSecret": "kkk"
      |  },
      |  "stripe": {
      |     "customerSourceUpdatedWebhook": {
      |       "api.key.secret": "abc",
      |       "au-membership.key.secret": "def"
      |     }
      |  }
      |}
    """.stripMargin

}