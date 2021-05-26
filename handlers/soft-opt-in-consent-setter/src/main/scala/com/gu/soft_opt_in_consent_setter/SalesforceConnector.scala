package com.gu.soft_opt_in_consent_setter

import com.gu.salesforce.{SFAuthConfig, SalesforceAuth}
import com.gu.soft_opt_in_consent_setter.models.{SFAssociatedSubRecord, SFAssociatedSubResponse, SFCompositeResponse, SFResponse, SFSubRecordResponse, SoftOptInError}
import com.typesafe.scalalogging.LazyLogging
import io.circe.Decoder
import io.circe.generic.auto._
import io.circe.parser.decode
import scalaj.http.{Http, HttpOptions, HttpRequest, HttpResponse}

import scala.util.Try

class SalesforceConnector(sfAuthDetails: SalesforceAuth, sfApiVersion: String) extends LazyLogging {

  def getSubsToProcess(): Either[SoftOptInError, SFSubRecordResponse] = {
    handleQueryResp[SFSubRecordResponse](
      sendQueryReq(SfQueries.getSubsToProcessQuery),
      errorDesc = "Could not decode SFSubscription.Response"
    )
  }

  def getActiveSubs(identityIds: Seq[String]): Either[SoftOptInError, SFAssociatedSubResponse] = {
    if (identityIds.nonEmpty)
      handleQueryResp[SFAssociatedSubResponse](
        sendQueryReq(SfQueries.getActiveSubsQuery(identityIds)),
        errorDesc = "Could not decode AssociatedSFSubscription.Response"
      )
    else
      Right(SFAssociatedSubResponse(0, done = true, Seq[SFAssociatedSubRecord]()))
  }

  def updateSubs(body: String): Either[SoftOptInError, Unit] = {
    handleCompositeUpdateResp(
      sendCompositeUpdateReq(body),
      Metrics.put
    )
  }

  private def sfHttp(url: String): HttpRequest = {
    Http(url)
      .option(HttpOptions.readTimeout(30000))
      .header("Authorization", s"Bearer ${sfAuthDetails.access_token}")
      .header("Content-Type", "application/json")
  }

  def sendQueryReq(query: String): Either[Throwable, HttpResponse[String]] = {
    Try(
      sfHttp(url = s"${sfAuthDetails.instance_url}/services/data/$sfApiVersion/query/")
        .param("q", query)
        .method("GET")
        .asString
    )
      .toEither
  }

  def sendCompositeUpdateReq(body: String): Either[Throwable, HttpResponse[String]] = {
    Try(
      sfHttp(url = s"${sfAuthDetails.instance_url}/services/data/$sfApiVersion/composite/sobjects")
        .postData(body)
        .method("PATCH")
        .asString
    )
      .toEither
  }

  def handleQueryResp[T: Decoder](response: Either[Throwable, HttpResponse[String]], errorDesc: String = "Decode error"): Either[SoftOptInError, T] = {
    response
      .left.map(error => SoftOptInError("SalesforceConnector", s"Salesforce query request failed: $error"))
      .flatMap { result =>
        decode[T](result.body)
          .left.map(decodeError => SoftOptInError("SalesforceConnector", s"$errorDesc:$decodeError. String to decode ${result.body}"))
      }
  }

  def handleCompositeUpdateResp(response: Either[Throwable, HttpResponse[String]], putMetric: (String, Double) => Unit): Either[SoftOptInError, Unit] = {
    response
      .left.map(i => SoftOptInError("SalesforceConnector", s"Salesforce composite request failed: $i"))
      .flatMap { result =>
        decode[List[SFResponse]](result.body) match {
          case Right(compositeResponse) =>
            SFCompositeResponse(compositeResponse).errorsAsString
              .foreach(logger.warn(_))

            // Output metrics before returning
            putMetric("successful_salesforce_update", compositeResponse.filter(_.success).size)
            putMetric("failed_salesforce_update", compositeResponse.filter(!_.success).size)

            Right(())
          case Left(decodeError) =>
            Left(SoftOptInError("SalesforceConnector", s"Could not decode SfCompositeRequest.Response: $decodeError. String to decode: ${result.body}"))
        }
      }
  }

}

object SalesforceConnector {
  def apply(sfConfig: SFAuthConfig, sfApiVersion: String): Either[SoftOptInError, SalesforceConnector] = {
    auth(sfConfig)
      .map(new SalesforceConnector(_, sfApiVersion))
  }

  def auth(sfConfig: SFAuthConfig): Either[SoftOptInError, SalesforceAuth] = {
    handleAuthResp(
      sendAuthReq(sfConfig)
    )
  }

  def sendAuthReq(sfConfig: SFAuthConfig): Either[Throwable, HttpResponse[String]] = {
    Try(
      Http(s"${sfConfig.url}/services/oauth2/token")
        .postForm(
          Seq(
            "grant_type" -> "password",
            "client_id" -> sfConfig.client_id,
            "client_secret" -> sfConfig.client_secret,
            "username" -> sfConfig.username,
            "password" -> s"${sfConfig.password}${sfConfig.token}"
          )
        )
        .asString
    ).toEither
  }

  def handleAuthResp(response: Either[Throwable, HttpResponse[String]]): Either[SoftOptInError, SalesforceAuth] = {
    response
      .left.map(i => SoftOptInError("SalesforceConnector", s"Salesforce authentication failed: $i"))
      .flatMap { result =>
        decode[SalesforceAuth](result.body)
          .left
          .map(i => SoftOptInError("SalesforceConnector", s"Could not decode SfAuthDetails: $i. String to decode: ${result.body}"))
      }
  }

}
