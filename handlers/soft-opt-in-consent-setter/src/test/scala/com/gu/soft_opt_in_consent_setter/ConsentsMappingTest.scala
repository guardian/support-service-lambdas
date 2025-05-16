package com.gu.soft_opt_in_consent_setter

import com.gu.soft_opt_in_consent_setter.models.ConsentsMapping._
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class ConsentsMappingTest extends AnyFlatSpec with Matchers {

  "productMappings" should "map ophan style supporter plus to its zuora charge producttype__c" in {
    val actual = productMappings("SUPPORTER_PLUS", None)
    actual should be("Supporter Plus")
    consentsMapping.contains(actual) should be(true)
  }

  it should "map ophan style newspaper to the generic 'newspaper' value" in {
    val actual = productMappings("PRINT_SUBSCRIPTION", Some("HOME_DELIVERY_SATURDAY_PLUS"))
    actual should be("newspaper")
    consentsMapping.contains(actual) should be(true)
  }

  it should "map ophan style guardian weekly to its zuora charge producttype__c" in {
    val actual = productMappings("PRINT_SUBSCRIPTION", Some("GUARDIAN_WEEKLY"))
    actual should be("Guardian Weekly")
    consentsMapping.contains(actual) should be(true)
  }

}
