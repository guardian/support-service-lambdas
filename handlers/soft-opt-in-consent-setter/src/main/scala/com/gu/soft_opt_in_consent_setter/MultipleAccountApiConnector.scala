package com.gu.soft_opt_in_consent_setter

import com.gu.soft_opt_in_consent_setter.models.SoftOptInError
import io.circe.Json
import io.circe.parser.parse
import scalaj.http.{Http, HttpResponse}
import software.amazon.awssdk.regions.Region
import software.amazon.awssdk.services.ssm.SsmClient
import software.amazon.awssdk.services.ssm.model.GetParameterRequest

import java.net.URLEncoder
import java.nio.charset.StandardCharsets
import scala.util.Try

class MultipleAccountApiConnector(
    baseUrl: String,
    apiKey: String,
    sendReq: (String, String) => Either[Throwable, HttpResponse[String]] = MultipleAccountApiConnector.sendReq,
) {
  def hasActiveSecondaryUserAccess(identityId: String): Either[SoftOptInError, Boolean] = {
    val encodedId = URLEncoder.encode(identityId, StandardCharsets.UTF_8)
    val response = sendReq(s"$baseUrl/secondary-user/$encodedId", apiKey)
    response.left
      .map(error =>
        SoftOptInError(s"Multiple account API request failed for identityId $identityId", error, failRun = true),
      )
      .flatMap { result =>
        if (!result.isSuccess)
          Left(
            SoftOptInError(
              s"Multiple account API returned status ${result.code} for identityId $identityId",
              null,
              Some(result.code),
              failRun = result.code == 401 || result.code == 403 || result.code == 429 || result.code >= 500,
            ),
          )
        else
          parse(result.body).left
            .map(error =>
              SoftOptInError(s"Invalid multiple account API response for identityId $identityId", error, failRun = true),
            )
            .flatMap(json =>
              json.hcursor
                .get[Vector[Json]]("subscriptions")
                .left
                .map(error =>
                  SoftOptInError(
                    s"Invalid multiple account API response for identityId $identityId",
                    error,
                    failRun = true,
                  ),
                )
                .flatMap { subscriptions =>
                  Either.cond(
                    subscriptions.forall(_.hcursor.get[String]("subscriptionName").isRight),
                    subscriptions.nonEmpty,
                    SoftOptInError(
                      s"Invalid multiple account API response for identityId $identityId",
                      null,
                      failRun = true,
                    ),
                  )
                },
            )
      }
  }
}

object MultipleAccountApiConnector {
  private val baseUrls = Map(
    "CODE" -> "https://multiple-account-api-code.support.guardianapis.com",
    "PROD" -> "https://multiple-account-api.support.guardianapis.com",
  )

  def create(stage: String): Either[SoftOptInError, MultipleAccountApiConnector] =
    for {
      baseUrl <- baseUrls.get(stage).toRight(SoftOptInError(s"Unsupported stage for multiple account API: $stage"))
      credentials <- AwsCredentialsBuilder.buildCredentials
      apiKey <- Try {
        val client = SsmClient.builder().region(Region.EU_WEST_1).credentialsProvider(credentials).build()
        try {
          client
            .getParameter(
              GetParameterRequest
                .builder()
                .name(s"/$stage/membership/soft-opt-in-consent-setter/multiple-account-api-key")
                .withDecryption(true)
                .build(),
            )
            .parameter()
            .value()
        } finally client.close()
      }.toEither.left.map(error => SoftOptInError(s"Could not load multiple account API key for $stage", error))
      _ <- Either.cond(apiKey.nonEmpty, (), SoftOptInError(s"Multiple account API key is empty for $stage"))
    } yield new MultipleAccountApiConnector(baseUrl, apiKey)

  private def sendReq(url: String, apiKey: String): Either[Throwable, HttpResponse[String]] =
    Try(Http(url).header("x-api-key", apiKey).timeout(3000, 5000).asString).toEither
}
