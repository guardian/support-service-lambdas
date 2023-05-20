package com.gu.effects

import com.gu.effects.TestingRawEffects._
import com.gu.util.Logging
import okhttp3._
import okio.Buffer
import software.amazon.awssdk.core.sync.{RequestBody => S3RequestBody}
import software.amazon.awssdk.services.s3.model.{PutObjectRequest, PutObjectResponse}

import java.nio.charset.StandardCharsets.UTF_8
import scala.util.{Failure, Success}

class TestingRawEffects(
    val defaultCode: Int = 1,
    responses: Map[String, HTTPResponse] = Map(),
    postResponses: Map[POSTRequest, HTTPResponse] = Map(),
) extends Logging {

  var requests: List[Request] = Nil // !

  def requestsAttempted: List[BasicRequest] = requests.map { request =>
    val buffer = new Buffer()
    Option(request.body()).foreach(_.writeTo(buffer))
    val body = buffer.readString(UTF_8)
    BasicRequest(request.method(), getPathWithQueryString(request), body)
  }

  val response: Request => Response = { req =>
    requests = req :: requests
    val path = getPathWithQueryString(req)
    logger.info(s"HTTP ${req.method} request for: $path")
    val presetResponse =
      if (req.method() == "GET") {
        responses.get(
          path,
        ) // todo should change to have GETs and POSTs in one list using a Sum type, and have a getUnusedRequests or something at the end to assert they were "used" by the code
      } else {
        val reqBody = body(req.body)
        logger.info(s"HTTP ${req.method} body is $reqBody")
        val incomingRequest = POSTRequest(path, reqBody, req.method)
        postResponses.get(incomingRequest).orElse(responses.get(path)) // use get response
      }
    val HTTPResponse(code, response) = presetResponse.getOrElse(
      HTTPResponse(defaultCode, """{"success": true}"""),
    )
    logger.info(s"HTTP precanned response is: $code - $response")
    new Response.Builder()
      .request(req)
      .protocol(Protocol.HTTP_1_1)
      .code(code)
      .body(ResponseBody.create(response, MediaType.parse("text/plain")))
      .message("message??")
      .build()
  }

  private def getPathWithQueryString(req: Request) = {
    req.url().encodedPath() + Option( /*could be null*/ req.url().encodedQuery())
      .filter(_ != "")
      .map(query => s"?$query")
      .getOrElse("")
  }

  def body(b: RequestBody): String = {
    val buffer = new Buffer()
    b.writeTo(buffer)
    buffer.readString(UTF_8)
  }

  // TODO nicer type than tuple
  def resultMap: Map[(String, String), Option[String]] = {
    // verify
    requests.map(req => (req.method, req.url.encodedPath) -> Option(req.body).map(body)).toMap
  }

}

object TestingRawEffects {

  case class POSTRequest(urlPathAndQuery: String, postBody: String, method: String = "POST")
  case class HTTPResponse(code: Int, body: String)

  case class BasicRequest(method: String, path: String, body: String)

  val codeConfig: String =
    """
      |{ "stage": "CODE",
      |  "trustedApiConfig": {
      |    "apiClientId": "a",
      |    "apiToken": "b",
      |    "tenantId": "c"
      |  },
      |  "stepsConfig": {
      |    "zuoraRestConfig": {
      |      "baseUrl": "https://ddd",
      |      "username": "e@f.com",
      |      "password": "ggg"
      |    },
      |    "identityConfig": {
      |      "baseUrl": "https://ididbaseurl",
      |      "apiToken": "tokentokentokenidentity"
      |    },
      |    "sfConfig": {
      |      "url": "https://sfurl.haha",
      |      "client_id": "clientsfclient",
      |      "client_secret": "clientsecretsfsecret",
      |      "username": "usernamesf",
      |      "password": "passSFpassword",
      |      "token": "tokentokenSFtoken"
      |    }
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

  val successfulS3Upload: (PutObjectRequest, S3RequestBody) => Success[PutObjectResponse] = { case (_, _) =>
    Success(PutObjectResponse.builder.build())
  }

  val failedS3Upload: (PutObjectRequest, S3RequestBody) => Failure[Nothing] = { case (_, _) =>
    Failure(new RuntimeException("failure"))
  }
}
