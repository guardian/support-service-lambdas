package com.gu.util.handlers

import java.io.{OutputStream, OutputStreamWriter}

import com.gu.util.Logging
import play.api.libs.json.{Json, Writes}

object SerialiseResponse extends Logging {
  def apply[RESPONSE](outputStream: OutputStream, response: RESPONSE)(implicit w: Writes[RESPONSE]): Unit = {
    val writer = new OutputStreamWriter(outputStream, "UTF-8")
    val jsonResponse = Json.toJson(response)
    logger.info(s"Response will be: \n ${jsonResponse.toString}")
    writer.write(Json.stringify(jsonResponse))
    writer.close()
  }
}
