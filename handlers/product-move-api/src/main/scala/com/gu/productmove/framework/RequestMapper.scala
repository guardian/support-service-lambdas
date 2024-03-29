package com.gu.productmove.framework

import com.amazonaws.services.lambda.runtime.events.APIGatewayV2WebSocketEvent
import sttp.model.Uri
import sttp.tapir.serverless.aws.lambda.{AwsHttp, AwsRequest, AwsRequestContext}

import scala.jdk.CollectionConverters.*

object RequestMapper {

  /*
  API gateway parses the query parameters to k/v pairs, but tapir needs the raw query string, so we
  need to re-encode it again.
   */
  def queryParamsToEncodedString(queryStringParams: Map[String, String]): String = {
    val querySegments = queryStringParams.toSeq.map {
      case (key, "") => Uri.QuerySegment.Value(key)
      case (key, value) => Uri.QuerySegment.KeyValue(key, value)
    }
    val uri = Uri(None, None, Uri.EmptyPath, querySegments, None)
    val rawQueryString: String = uri.toString
    if (rawQueryString.startsWith("?"))
      rawQueryString.substring(1)
    else
      rawQueryString
  }

  def updatePath(path: String): String = {
    val newEndpointPattern = "^/product-move/([^/]+)/(.*)$".r
    val oldEndpointPattern = "^/product-move/(.*)$".r

    path match {
      case newEndpointPattern(switchType, subscriptionName) =>
        s"/product-move/$switchType/$subscriptionName"
      case oldEndpointPattern(subscriptionName) =>
        s"/product-move/recurring-contribution-to-supporter-plus/$subscriptionName"
      case _ => path
    }
  }

  def convertJavaRequestToTapirRequest(javaRequest: APIGatewayV2WebSocketEvent): AwsRequest = {
    import javaRequest.*
    AwsRequest(
      updatePath(getPath), // Update the path
      Option(getQueryStringParameters).map(_.asScala.toMap).map(queryParamsToEncodedString).getOrElse(""),
      getHeaders.asScala.toMap,
      AwsRequestContext(
        Option(getRequestContext.getDomainName),
        AwsHttp(
          getHttpMethod,
          updatePath(getPath),
          "$.requestContext.protocol", // this is unused and not parsed from the API gateway JSON by the java SDK
          getRequestContext.getIdentity.getSourceIp, // nullable?
          getRequestContext.getIdentity.getUserAgent, // nullable?
        ),
      ),
      Option(getBody),
      isIsBase64Encoded,
    )
  }

}
