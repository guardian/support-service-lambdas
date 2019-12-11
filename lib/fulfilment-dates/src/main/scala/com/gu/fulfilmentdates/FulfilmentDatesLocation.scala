package com.gu.fulfilmentdates

import java.time.LocalDate
import java.time.format.DateTimeFormatter

import com.gu.effects.S3Location
import com.gu.fulfilmentdates.ZuoraProductTypes.ZuoraProductType
import com.gu.util.config.Stage

object FulfilmentDatesLocation {
  def fulfilmentDatesFileLocation(stage: Stage, zuoraProductType: ZuoraProductType, date: LocalDate) = {
    val formattedDate = date.format(DateTimeFormatter.ofPattern("yyyy-MM-dd"))
    val path = s"${zuoraProductType.name}/${formattedDate}_${zuoraProductType.name}.json"
    val bucket = s"fulfilment-date-calculator-${stage.value}"
    S3Location(bucket, path)
  }
}
