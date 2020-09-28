package com.gu.contact_us_api

import com.gu.contact_us_api.models.{ContactUsFailureResponse, ContactUsRequest, ContactUsSuccessfulResponse}
import com.gu.util.Logging
import io.circe.parser._
import io.circe.generic.auto._

class ContactUs(SFConnector: SalesforceConnector) extends Logging {
  def processReq(json: String): Either[ContactUsFailureResponse, ContactUsSuccessfulResponse] = {
    val result = for {
      req <- decode[ContactUsRequest](json)
      resp <- SFConnector.handle(req.asSFCompositeRequest)
    } yield resp

    buildResponse(result)
  }

  def buildResponse(result: Either[Throwable, Unit]): Either[ContactUsFailureResponse, ContactUsSuccessfulResponse] = {
    result match {
      case Left(error) => {
        // TODO: Move the logging elsewhere to be more descriptive.
        logger.error(error.getMessage)
        Left(ContactUsFailureResponse(error.getMessage))
      }
      case Right(_) => Right(ContactUsSuccessfulResponse())
    }
  }
}
