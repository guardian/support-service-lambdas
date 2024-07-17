package com.gu.fulfilmentdates

import java.time.LocalDate
import java.time.format.DateTimeFormatter
import com.gu.effects.S3Location
import com.gu.util.config.Stage
import com.gu.zuora.ZuoraProductTypes
import com.gu.zuora.ZuoraProductTypes.ZuoraProductType

object FulfilmentDatesLocation {
  def fulfilmentDatesFileLocation(stage: Stage, zuoraProductType: ZuoraProductType, date: LocalDate) = {
    val formattedDate = date.format(DateTimeFormatter.ofPattern("yyyy-MM-dd"))
    val productTypeKey = getProductTypeKey(zuoraProductType)
    val path = s"$productTypeKey/${formattedDate}_$productTypeKey.json"
    val bucket = fulfilmentDatesBucket(stage)
    S3Location(bucket, path)
  }

  def getProductTypeKey(zuoraProductType: ZuoraProductType) = zuoraProductType match {
    case ZuoraProductTypes.TierThree => "Guardian Weekly" // Tier Three is a bundle product containing Guardian Weekly
    case _ => zuoraProductType.name
  }

  def fulfilmentDatesBucket(stage: Stage = Stage()) = {
    s"fulfilment-date-calculator-${stage.value.toLowerCase}"
  }
}
