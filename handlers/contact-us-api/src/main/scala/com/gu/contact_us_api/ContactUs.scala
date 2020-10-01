package com.gu.contact_us_api

import com.gu.contact_us_api.models.{ContactUsError, ContactUsRequest, SFConnector}
import com.gu.contact_us_api.ParserUtils._
import io.circe.generic.auto._

class ContactUs(SFConnector: SFConnector) {

  def processReq(json: String): Either[ContactUsError, Unit] = {
    for {
      req <- decode[ContactUsRequest](json, Some("ContactUsRequest"), "Input")
      resp <- SFConnector.handle(req.asSFCompositeRequest)
    } yield resp
  }

}
