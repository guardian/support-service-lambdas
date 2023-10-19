package com.gu.paperround.client

import com.gu.util.resthttp.Types.{ClientFailableOp, ClientSuccess, GenericError}
import com.typesafe.scalalogging.LazyLogging
import okhttp3.{FormBody, Request, Response}
import play.api.libs.json.{Json, Reads}

class FormRequestMaker(getResponse: Request => Response, headers: Map[String, String], baseUrl: String)
    extends LazyLogging {

  private val formType = "application/x-www-form-urlencoded"

  def post[RESP: Reads](formdata: Map[String, String], path: String): ClientFailableOp[RESP] = {
    val requestBody = formdata
      .foldLeft(new FormBody.Builder())({ case (builder, (key, value)) =>
        builder.add(key, value)
      })
      .build()
    val request = headers
      .foldLeft(new Request.Builder())({ case (builder, (header, value)) =>
        builder.addHeader(header, value)
      })
      .url(baseUrl + path)
      .addHeader("Content-type", formType)
      .addHeader("Accept", "application/json")
      .post(requestBody)
      .build()
    val response = getResponse(request)
    val code = response.code()
    val responseBody = response.body().string()
    logger.info("response body: " + responseBody)
    (code / 100) match {
      case 2 => ClientSuccess(Json.parse(responseBody).as[RESP])
      case _ =>
        logger.warn(s"request failed with status $code: $responseBody")
        GenericError("failed to successfully call out to API")
    }
  }

}
