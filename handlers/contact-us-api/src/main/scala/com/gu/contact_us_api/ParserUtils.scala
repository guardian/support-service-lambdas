package com.gu.contact_us_api

import com.gu.contact_us_api.models.ContactUsError
import io.circe.Decoder
import io.circe.parser

object ParserUtils {

  // Decodes the input json string into class T using circe.
  // If decoding fails it replaces the Throwable with a ContactUsError containing
  // more detailed and human readable information from decodeTargetDesc and errorType
  def decode[T: Decoder](
      input: String,
      decodeTargetDesc: Option[String] = None,
      errorType: String = "Decode",
  ): Either[ContactUsError, T] = {
    val errorDetails = decodeTargetDesc.map(i => s" into $i").getOrElse("")
    parser
      .decode[T](input)
      .left
      .map(i => ContactUsError(s"$errorType", s"Failed to decode JSON string$errorDetails: $i"))
  }

}
