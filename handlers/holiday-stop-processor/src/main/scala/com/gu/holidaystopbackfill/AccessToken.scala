package com.gu.holidaystopbackfill

import com.softwaremill.sttp.Response
import io.circe.generic.auto._
import io.circe.parser.decode

case class AccessToken(access_token: String)

object AccessToken {

  def fromZuoraResponse(response: Response[String]): Either[ZuoraFetchFailure, AccessToken] =
    for {
      body <- response.body.left.map(ZuoraFetchFailure)
      token <- decode[AccessToken](body).left.map(e => ZuoraFetchFailure(e.getMessage))
    } yield token
}
