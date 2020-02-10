package com.gu.delivery_records_api

case class SFApiContactPhoneNumbers(
  Phone: Option[String],
  HomePhone: Option[String],
  MobilePhone: Option[String],
  OtherPhone: Option[String]
) {

  def filterOutGarbage(): SFApiContactPhoneNumbers = SFApiContactPhoneNumbers(
    Phone = Phone.filter(SFApiContactPhoneNumbers.verifyIsNumber),
    HomePhone = HomePhone.filter(SFApiContactPhoneNumbers.verifyIsNumber),
    MobilePhone = MobilePhone.filter(SFApiContactPhoneNumbers.verifyIsNumber),
    OtherPhone = OtherPhone.filter(SFApiContactPhoneNumbers.verifyIsNumber)
  )

}

object SFApiContactPhoneNumbers {

  def verifyIsNumber(value: String) = true //TODO implement regex for only digit, + or space, and trimmed isNotEmprty

}
