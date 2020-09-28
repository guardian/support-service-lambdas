package com.gu.contact_us_api

import com.gu.contact_us_api.SalesforceConnector
import com.gu.contact_us_api.models.{ContactUsFailureResponse, ContactUsRequest, ContactUsResponse, ContactUsSuccessfulResponse}
import io.circe.parser._
import io.circe.generic.auto._
import io.circe.syntax._

class ContactUs(SFConnector: SalesforceConnector) {
  def processReq(json: String): ContactUsResponse = {
    val result = for {
      req <- decode[ContactUsRequest](json)
      resp <- SFConnector.handle(req.asSFCompositeRequest)
    } yield resp

    buildResponse(result)
  }

  def buildResponse(result: Either[Throwable, Unit]): ContactUsResponse = {
    result match {
      case Left(error) => ContactUsFailureResponse(error.getMessage)
      case Right(_) => ContactUsSuccessfulResponse()
    }
  }
}
