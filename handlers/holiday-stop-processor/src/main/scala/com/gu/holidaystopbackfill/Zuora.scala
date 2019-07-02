package com.gu.holidaystopbackfill

import com.softwaremill.sttp._
import com.softwaremill.sttp.circe._
import io.circe.generic.auto._

object Zuora {

  implicit val backend: SttpBackend[Id, Nothing] = HttpURLConnectionBackend()

  private def baseUrl(config: ZuoraConfig): String = config.baseUrl.stripSuffix("/v1")

  def accessTokenGetResponse(config: ZuoraConfig): Response[String] = {
    val request = sttp.post(uri"${baseUrl(config)}/oauth/token")
      .body(
        "grant_type" -> "client_credentials",
        "client_id" -> s"${config.holidayStopProcessor.oauth.clientId}",
        "client_secret" -> s"${config.holidayStopProcessor.oauth.clientSecret}"
      )
    val response = request.send()
    response
  }

  def queryGetResponse(config: ZuoraConfig, accessToken: AccessToken)(sql: String): Response[String] = {
    case class Output(target: String)
    case class Query(query: String, outputFormat: String, compression: String, output: Output)
    val request = sttp.post(uri"${baseUrl(config)}/query/jobs")
      .header("Authorization", s"Bearer ${accessToken.access_token}")
      .body(Query(
        query = sql,
        outputFormat = "JSON",
        compression = "NONE",
        output = Output(target = "API_RESPONSE")
      ))
    val response = request.send()
    response
  }
}
