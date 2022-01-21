package com.gu.sf_emails_to_s3_exporter

import com.amazonaws.services.lambda.runtime.events.{APIGatewayProxyRequestEvent, APIGatewayProxyResponseEvent}
import com.typesafe.scalalogging.LazyLogging

object Handler2 extends LazyLogging {

  def standloneHandler(request: APIGatewayProxyRequestEvent): APIGatewayProxyResponseEvent  = {
    val pathValue = request.getPath
    println("pathValue:"+pathValue)
    new APIGatewayProxyResponseEvent().withStatusCode(200).withBody("Hello world")
  }
}
