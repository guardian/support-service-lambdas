package com.gu.contact_us_api

import com.gu.contact_us_api.models.{ContactUsError, ContactUsRequest, SFCompositeRequest}
import com.gu.contact_us_api.ParserUtils._
import io.circe.generic.auto._

object ContactUs {

  def processReq(json: String, handle: SFCompositeRequest => Either[ContactUsError, Unit]): Either[ContactUsError, Unit] = {
    for {
      req <- decode[ContactUsRequest](json, Some("ContactUsRequest"), "Input")
      resp <- handle(req.asSFCompositeRequest)
    } yield resp
  }

}
