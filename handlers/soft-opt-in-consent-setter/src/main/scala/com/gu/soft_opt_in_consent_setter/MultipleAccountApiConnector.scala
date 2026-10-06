package com.gu.soft_opt_in_consent_setter

import com.gu.soft_opt_in_consent_setter.models.SoftOptInError
import com.typesafe.scalalogging.LazyLogging
import io.circe.Decoder
import io.circe.generic.semiauto.deriveDecoder
import io.circe.parser.decode
import scalaj.http.{Http, HttpResponse}
import software.amazon.awssdk.regions.Region
import software.amazon.awssdk.services.apigateway.ApiGatewayClient
import software.amazon.awssdk.services.apigateway.model.GetApiKeyRequest
import software.amazon.awssdk.services.cloudformation.CloudFormationClient
import software.amazon.awssdk.services.cloudformation.model.{ListStackResourcesRequest, StackResourceSummary}

import java.net.URLEncoder
import java.nio.charset.StandardCharsets
import scala.jdk.CollectionConverters._
import scala.util.Try

// client for the multiple-account-api, used to find the subscriptions a user has active secondary access to
class MultipleAccountApiConnector(
    baseUrl: String,
    sendReq: String => Either[Throwable, HttpResponse[String]],
) extends LazyLogging {
  def this(baseUrl: String, apiKey: String) =
    this(baseUrl, (url: String) => MultipleAccountApiConnector.sendReq(url, apiKey))

  import MultipleAccountApiConnector._

  def activeSecondarySubscriptionNames(identityId: String): Either[SoftOptInError, Set[String]] = {
    val encodedId = URLEncoder.encode(identityId, StandardCharsets.UTF_8)
    val result = get[SecondaryUserDetailsResponse](s"$baseUrl/secondary-user/$encodedId")
      .map(_.subscriptions.map(_.subscriptionName).toSet)
    result.foreach(secondarySubscriptions =>
      logger.info(s"MultipleAccountApiConnector: Successfully fetched secondary subs $secondarySubscriptions"),
    )
    result
  }

  private def get[T: Decoder](url: String): Either[SoftOptInError, T] = {
    val result = for {
      resp <- sendReq(url).left.map(error =>
        SoftOptInError(s"MultipleAccountApiConnector: request failed for $url", error),
      )
      body <- Either.cond(
        resp.isSuccess,
        resp.body,
        SoftOptInError(
          s"MultipleAccountApiConnector: returned status ${resp.code} for $url",
          null,
          Some(resp.code),
        ),
      )
      decoded <- decode[T](body).left.map(error =>
        SoftOptInError(s"MultipleAccountApiConnector: invalid response for $url", error),
      )
    } yield decoded

    result match {
      case Left(e) => logger.warn(s"Request to multiple-account-api failed for $url: $e")
      case Right(decoded) => logger.info(s"Request to multiple-account-api successful for $url: $decoded")
    }
    result
  }
}

object MultipleAccountApiConnector extends LazyLogging {
  private case class SecondarySubscription(subscriptionName: String)
  private case class SecondaryUserDetailsResponse(subscriptions: List[SecondarySubscription])

  private implicit val secondarySubscriptionDecoder: Decoder[SecondarySubscription] = deriveDecoder
  private implicit val secondaryUserDetailsResponseDecoder: Decoder[SecondaryUserDetailsResponse] = deriveDecoder

  private val baseUrls = Map(
    "CODE" -> "https://multiple-account-api-code.support.guardianapis.com",
    "PROD" -> "https://multiple-account-api.support.guardianapis.com",
  )

  def create(stage: String): Either[SoftOptInError, MultipleAccountApiConnector] =
    for {
      baseUrl <- baseUrls
        .get(stage)
        .toRight(
          SoftOptInError(s"MultipleAccountApiConnector: unsupported stage $stage"),
        )
      credentials <- AwsCredentialsBuilder.buildCredentials
      apiKey <- Try {
        val cloudFormation =
          CloudFormationClient.builder().region(Region.EU_WEST_1).credentialsProvider(credentials).build()
        val apiGateway = ApiGatewayClient.builder().region(Region.EU_WEST_1).credentialsProvider(credentials).build()
        try {
          val stackName = s"support-$stage-multiple-account-api"
          val resources = cloudFormation
            .listStackResourcesPaginator(ListStackResourcesRequest.builder().stackName(stackName).build())
            .asScala
            .flatMap(_.stackResourceSummaries().asScala)
            .toList
          val apiKeyId = findApiKeyId(resources, stackName)
          apiGateway.getApiKey(GetApiKeyRequest.builder().apiKey(apiKeyId).includeValue(true).build()).value()
        } finally {
          cloudFormation.close()
          apiGateway.close()
        }
      }.toEither.left.map(error =>
        SoftOptInError(s"MultipleAccountApiConnector: could not discover API key for $stage", error),
      )
      _ <- Either.cond(
        Option(apiKey).exists(_.nonEmpty),
        (),
        SoftOptInError(s"MultipleAccountApiConnector: API key is empty for $stage"),
      )
    } yield new MultipleAccountApiConnector(baseUrl, apiKey)

  private[soft_opt_in_consent_setter] def findApiKeyId(
      resources: List[StackResourceSummary],
      stackName: String,
  ): String =
    resources.filter(_.resourceType() == "AWS::ApiGateway::ApiKey").map(_.physicalResourceId()) match {
      case List(apiKeyId) if apiKeyId.nonEmpty => apiKeyId
      case ids => throw new IllegalStateException(s"Expected one API key in $stackName, found ${ids.size}")
    }


  private def sendReq(url: String, apiKey: String): Either[Throwable, HttpResponse[String]] = {
    logger.info(s"Making request to multiple-account-api: $url")
    Try(Http(url).header("x-api-key", apiKey).timeout(3000, 15000).asString).toEither
  }
}
