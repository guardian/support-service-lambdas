package com.gu.contact_us_api

import com.gu.contact_us_api.models.{ContactUsError, ContactUsRequest}
import io.circe.parser._
import io.circe.generic.auto._

class ContactUs(SFConnector: SalesforceConnector) {
  def processReq(json: String): Either[ContactUsError, Unit] = {
    for {
      req <- decode[ContactUsRequest](json)
        .left
        .map(i => ContactUsError("Input", s"Failed to decode request body into ContactUsRequest: ${i.getMessage}"))
      resp <- SFConnector.handle(req.asSFCompositeRequest)
    } yield resp
  }
}
