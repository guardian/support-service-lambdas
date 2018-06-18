package com.gu.util.handlers

import java.io.InputStream

import play.api.libs.json.{Json, Reads}

import scala.io.Source
import scala.util.Try

object ParseRequest {
  def apply[REQUEST](inputStream: InputStream)(implicit r: Reads[REQUEST]): Try[REQUEST] = {
    for {
      jsonString <- Try(Source.fromInputStream(inputStream).mkString)
      request <- Try(Json.parse(jsonString).as[REQUEST])
    } yield request
  }
}
