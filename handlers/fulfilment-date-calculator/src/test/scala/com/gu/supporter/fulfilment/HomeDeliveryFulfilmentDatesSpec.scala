package com.gu.supporter.fulfilment

import com.gu.supporter.fulfilment.HomeDeliveryFulfilmentDates.apply
import org.scalatest.{FlatSpec, Matchers}

class HomeDeliveryFulfilmentDatesSpec extends FlatSpec with Matchers with DateSupport {

  "MONDAY HomeDeliveryFulfilmentDates" should "have correct deliveryAddressChangeEffectiveDate" in {
    apply( /* Tuesday   */ "2019-12-03")("Monday").deliveryAddressChangeEffectiveDate should equalDate("2019-12-09")
    apply( /* Wednesday */ "2019-12-04")("Monday").deliveryAddressChangeEffectiveDate should equalDate("2019-12-09")
    apply( /* Thursday  */ "2019-12-05")("Monday").deliveryAddressChangeEffectiveDate should equalDate("2019-12-16")
    apply( /* Friday    */ "2019-12-06")("Monday").deliveryAddressChangeEffectiveDate should equalDate("2019-12-16")
    apply( /* Saturday  */ "2019-12-07")("Monday").deliveryAddressChangeEffectiveDate should equalDate("2019-12-16")
    apply( /* Sunday    */ "2019-12-08")("Monday").deliveryAddressChangeEffectiveDate should equalDate("2019-12-16")
    apply( /* Monday    */ "2019-12-09")("Monday").deliveryAddressChangeEffectiveDate should equalDate("2019-12-16")
    apply( /* Tuesday   */ "2019-12-10")("Monday").deliveryAddressChangeEffectiveDate should equalDate("2019-12-16")
    apply( /* Wednesday */ "2019-12-11")("Monday").deliveryAddressChangeEffectiveDate should equalDate("2019-12-16")
    apply( /* Thursday  */ "2019-12-12")("Monday").deliveryAddressChangeEffectiveDate should equalDate("2019-12-23")
    apply( /* Friday    */ "2019-12-13")("Monday").deliveryAddressChangeEffectiveDate should equalDate("2019-12-23")
  }

  "TUESDAY HomeDeliveryFulfilmentDates" should "have correct deliveryAddressChangeEffectiveDate" in {
    apply( /* Friday    */ "2019-12-06")("Tuesday").deliveryAddressChangeEffectiveDate should equalDate("2019-12-10")
    apply( /* Saturday  */ "2019-12-07")("Tuesday").deliveryAddressChangeEffectiveDate should equalDate("2019-12-10")
    apply( /* Sunday    */ "2019-12-08")("Tuesday").deliveryAddressChangeEffectiveDate should equalDate("2019-12-17")
    apply( /* Monday    */ "2019-12-09")("Tuesday").deliveryAddressChangeEffectiveDate should equalDate("2019-12-17")
    apply( /* Tuesday   */ "2019-12-10")("Tuesday").deliveryAddressChangeEffectiveDate should equalDate("2019-12-17")
    apply( /* Wednesday */ "2019-12-11")("Tuesday").deliveryAddressChangeEffectiveDate should equalDate("2019-12-17")
    apply( /* Thursday  */ "2019-12-12")("Tuesday").deliveryAddressChangeEffectiveDate should equalDate("2019-12-17")
    apply( /* Friday    */ "2019-12-13")("Tuesday").deliveryAddressChangeEffectiveDate should equalDate("2019-12-17")
    apply( /* Saturday  */ "2019-12-14")("Tuesday").deliveryAddressChangeEffectiveDate should equalDate("2019-12-17")
    apply( /* Sunday    */ "2019-12-15")("Tuesday").deliveryAddressChangeEffectiveDate should equalDate("2019-12-24")
    apply( /* Monday    */ "2019-12-16")("Tuesday").deliveryAddressChangeEffectiveDate should equalDate("2019-12-24")
  }

  "WEDNESDAY HomeDeliveryFulfilmentDates" should "have correct deliveryAddressChangeEffectiveDate" in {
    apply( /* Saturday  */ "2019-11-30")("Wednesday").deliveryAddressChangeEffectiveDate should equalDate("2019-12-04")
    apply( /* Sunday    */ "2019-12-01")("Wednesday").deliveryAddressChangeEffectiveDate should equalDate("2019-12-04")
    apply( /* Monday    */ "2019-12-02")("Wednesday").deliveryAddressChangeEffectiveDate should equalDate("2019-12-11")
    apply( /* Tuesday   */ "2019-12-03")("Wednesday").deliveryAddressChangeEffectiveDate should equalDate("2019-12-11")
    apply( /* Wednesday */ "2019-12-04")("Wednesday").deliveryAddressChangeEffectiveDate should equalDate("2019-12-11")
    apply( /* Thursday  */ "2019-12-05")("Wednesday").deliveryAddressChangeEffectiveDate should equalDate("2019-12-11")
    apply( /* Friday    */ "2019-12-06")("Wednesday").deliveryAddressChangeEffectiveDate should equalDate("2019-12-11")
    apply( /* Saturday  */ "2019-12-07")("Wednesday").deliveryAddressChangeEffectiveDate should equalDate("2019-12-11")
    apply( /* Sunday    */ "2019-12-08")("Wednesday").deliveryAddressChangeEffectiveDate should equalDate("2019-12-11")
    apply( /* Monday    */ "2019-12-09")("Wednesday").deliveryAddressChangeEffectiveDate should equalDate("2019-12-18")
    apply( /* Tuesday   */ "2019-12-10")("Wednesday").deliveryAddressChangeEffectiveDate should equalDate("2019-12-18")
  }

  "THURSDAY HomeDeliveryFulfilmentDates" should "have correct deliveryAddressChangeEffectiveDate" in {
    apply( /* Sunday    */ "2019-12-01")("Thursday").deliveryAddressChangeEffectiveDate should equalDate("2019-12-05")
    apply( /* Monday    */ "2019-12-02")("Thursday").deliveryAddressChangeEffectiveDate should equalDate("2019-12-05")
    apply( /* Tuesday   */ "2019-12-03")("Thursday").deliveryAddressChangeEffectiveDate should equalDate("2019-12-12")
    apply( /* Wednesday */ "2019-12-04")("Thursday").deliveryAddressChangeEffectiveDate should equalDate("2019-12-12")
    apply( /* Thursday  */ "2019-12-05")("Thursday").deliveryAddressChangeEffectiveDate should equalDate("2019-12-12")
    apply( /* Friday    */ "2019-12-06")("Thursday").deliveryAddressChangeEffectiveDate should equalDate("2019-12-12")
    apply( /* Saturday  */ "2019-12-07")("Thursday").deliveryAddressChangeEffectiveDate should equalDate("2019-12-12")
    apply( /* Sunday    */ "2019-12-08")("Thursday").deliveryAddressChangeEffectiveDate should equalDate("2019-12-12")
    apply( /* Monday    */ "2019-12-09")("Thursday").deliveryAddressChangeEffectiveDate should equalDate("2019-12-12")
    apply( /* Tuesday   */ "2019-12-10")("Thursday").deliveryAddressChangeEffectiveDate should equalDate("2019-12-19")
    apply( /* Wednesday */ "2019-12-11")("Thursday").deliveryAddressChangeEffectiveDate should equalDate("2019-12-19")
  }

  "FRIDAY HomeDeliveryFulfilmentDates" should "have correct deliveryAddressChangeEffectiveDate" in {
    apply( /* Sunday    */ "2019-12-01")("Friday").deliveryAddressChangeEffectiveDate should equalDate("2019-12-06")
    apply( /* Monday    */ "2019-12-02")("Friday").deliveryAddressChangeEffectiveDate should equalDate("2019-12-06")
    apply( /* Tuesday   */ "2019-12-03")("Friday").deliveryAddressChangeEffectiveDate should equalDate("2019-12-06")
    apply( /* Wednesday */ "2019-12-04")("Friday").deliveryAddressChangeEffectiveDate should equalDate("2019-12-13")
    apply( /* Thursday  */ "2019-12-05")("Friday").deliveryAddressChangeEffectiveDate should equalDate("2019-12-13")
    apply( /* Friday    */ "2019-12-06")("Friday").deliveryAddressChangeEffectiveDate should equalDate("2019-12-13")
    apply( /* Saturday  */ "2019-12-07")("Friday").deliveryAddressChangeEffectiveDate should equalDate("2019-12-13")
    apply( /* Sunday    */ "2019-12-08")("Friday").deliveryAddressChangeEffectiveDate should equalDate("2019-12-13")
    apply( /* Monday    */ "2019-12-09")("Friday").deliveryAddressChangeEffectiveDate should equalDate("2019-12-13")
    apply( /* Tuesday   */ "2019-12-10")("Friday").deliveryAddressChangeEffectiveDate should equalDate("2019-12-13")
    apply( /* Wednesday */ "2019-12-11")("Friday").deliveryAddressChangeEffectiveDate should equalDate("2019-12-20")
    apply( /* Thursday  */ "2019-12-12")("Friday").deliveryAddressChangeEffectiveDate should equalDate("2019-12-20")
  }

  "SATURDAY HomeDeliveryFulfilmentDates" should "have correct deliveryAddressChangeEffectiveDate" in {
    apply( /* Tuesday   */ "2019-12-03")("Saturday").deliveryAddressChangeEffectiveDate should equalDate("2019-12-07")
    apply( /* Wednesday */ "2019-12-04")("Saturday").deliveryAddressChangeEffectiveDate should equalDate("2019-12-07")
    apply( /* Thursday  */ "2019-12-05")("Saturday").deliveryAddressChangeEffectiveDate should equalDate("2019-12-14")
    apply( /* Friday    */ "2019-12-06")("Saturday").deliveryAddressChangeEffectiveDate should equalDate("2019-12-14")
    apply( /* Saturday  */ "2019-12-07")("Saturday").deliveryAddressChangeEffectiveDate should equalDate("2019-12-14")
    apply( /* Sunday    */ "2019-12-08")("Saturday").deliveryAddressChangeEffectiveDate should equalDate("2019-12-14")
    apply( /* Monday    */ "2019-12-09")("Saturday").deliveryAddressChangeEffectiveDate should equalDate("2019-12-14")
    apply( /* Tuesday   */ "2019-12-10")("Saturday").deliveryAddressChangeEffectiveDate should equalDate("2019-12-14")
    apply( /* Wednesday */ "2019-12-11")("Saturday").deliveryAddressChangeEffectiveDate should equalDate("2019-12-14")
    apply( /* Thursday  */ "2019-12-12")("Saturday").deliveryAddressChangeEffectiveDate should equalDate("2019-12-21")
    apply( /* Friday    */ "2019-12-13")("Saturday").deliveryAddressChangeEffectiveDate should equalDate("2019-12-21")
  }

  "SUNDAY HomeDeliveryFulfilmentDates" should "have correct deliveryAddressChangeEffectiveDate" in {
    apply( /* Tuesday   */ "2019-12-03")("Sunday").deliveryAddressChangeEffectiveDate should equalDate("2019-12-08")
    apply( /* Wednesday */ "2019-12-04")("Sunday").deliveryAddressChangeEffectiveDate should equalDate("2019-12-08")
    apply( /* Thursday  */ "2019-12-05")("Sunday").deliveryAddressChangeEffectiveDate should equalDate("2019-12-15")
    apply( /* Friday    */ "2019-12-06")("Sunday").deliveryAddressChangeEffectiveDate should equalDate("2019-12-15")
    apply( /* Saturday  */ "2019-12-07")("Sunday").deliveryAddressChangeEffectiveDate should equalDate("2019-12-15")
    apply( /* Sunday    */ "2019-12-08")("Sunday").deliveryAddressChangeEffectiveDate should equalDate("2019-12-15")
    apply( /* Monday    */ "2019-12-09")("Sunday").deliveryAddressChangeEffectiveDate should equalDate("2019-12-15")
    apply( /* Tuesday   */ "2019-12-10")("Sunday").deliveryAddressChangeEffectiveDate should equalDate("2019-12-15")
    apply( /* Wednesday */ "2019-12-11")("Sunday").deliveryAddressChangeEffectiveDate should equalDate("2019-12-15")
    apply( /* Thursday  */ "2019-12-12")("Sunday").deliveryAddressChangeEffectiveDate should equalDate("2019-12-22")
    apply( /* Friday    */ "2019-12-13")("Sunday").deliveryAddressChangeEffectiveDate should equalDate("2019-12-22")
  }

}
