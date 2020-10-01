package com.gu.contact_us_api.models

trait SFConnector {
  def handle(req: SFCompositeRequest): Either[ContactUsError, Unit]
}
