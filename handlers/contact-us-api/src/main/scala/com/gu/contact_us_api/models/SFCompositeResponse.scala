package com.gu.contact_us_api.models

case class SFCompositeResponse(compositeResponse: List[SFResponse]) {
  val isSuccess: Boolean = compositeResponse.forall(_.isSuccess)
  val errorsAsString: Option[String] =
    if (isSuccess) None else Some(compositeResponse.flatMap(_.errorsAsString).mkString(". "))
}
