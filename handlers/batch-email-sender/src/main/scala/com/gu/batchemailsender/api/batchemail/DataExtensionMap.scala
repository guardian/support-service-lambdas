package com.gu.batchemailsender.api.batchemail

/**
 * Right now SqsSendBatch is hard coding card expiry, but a future PR will use this map and a request body that submits
 * an unknown object name will get a bad request (? tbd)
 */
object DataExtensionMap {

  private val objectNameToDataExtension = Map(
    "Card_Expiry__c" -> "expired-card"
  )

  def getDataExtension(objectName: String): Option[String] = objectNameToDataExtension.get(objectName)
}
