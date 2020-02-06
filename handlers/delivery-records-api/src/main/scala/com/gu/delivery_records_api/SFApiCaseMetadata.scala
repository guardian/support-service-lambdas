package com.gu.delivery_records_api

import java.util.Base64

object PicklistEntry {
  private val base64 = Base64.getDecoder

  private def bitToBoolean(byte: Byte)(bit: Int): Boolean = ((byte >> bit) & 1) == 1
  def byteToBooleanArray(byte: Byte): Seq[Boolean] =
    ((0 to 7) map bitToBoolean(byte)).reverse // reversed because reading is right-to-left, but needed left-to-right

}

case class PicklistEntry(
  active: Boolean,
  value: String,
  validFor: Option[String]
) {
  // https://salesforce.stackexchange.com/questions/201775/picklists-validfor-attribute - WTF 🤯
  val validIndexesInTheControllingField: Array[Int] = validFor
    .map(PicklistEntry.base64.decode)
    .fold(Array.emptyIntArray) {
      _.flatMap(PicklistEntry.byteToBooleanArray)
        .zipWithIndex
        .collect {
          case (isValid, index) if isValid => index
        }
    }

}
case class Field(
  controllerName: Option[String], // api name of the field which controls the valid picklist values
  label: String, // display name e.g Case Sub-Category
  name: String, // api name e.g. Case_Closure_Reason__c
  picklistValues: Option[List[PicklistEntry]]
)

case class SFApiCaseMetadata(fields: List[Field]) {

  private val indexOfDeliveryIssuesEntryInCaseCategory =
    fields
      .find(_.name == "Enquiry_Type__c").get // get the 'Case Category' field
      .picklistValues.get
      .indexWhere(_.value == "Delivery issues")

  def extractAvailableProblemTypes: List[String] =
    fields
      .find(_.name == "Case_Closure_Reason__c").get // get the 'Case Sub-Category' field
      .picklistValues.get
      .filter(_.validIndexesInTheControllingField.contains(indexOfDeliveryIssuesEntryInCaseCategory))
      .map(_.value)

}
