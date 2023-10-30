package com.gu.singleContributionSalesforceWrites.services

import com.gu.singleContributionSalesforceWrites.models.JsonDecodeError
import io.circe.Decoder
import io.circe.parser.decode

object JsonDecoder {
  def decodeJson[T: Decoder](jsonString: String): Either[JsonDecodeError, T] = {
    decode[T](jsonString) match {
      case Right(decodedJson) => Right(decodedJson)
      case Left(error) => Left(JsonDecodeError(error.getMessage))
    }
  }
}
